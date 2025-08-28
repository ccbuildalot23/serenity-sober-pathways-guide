package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
	"serenity/crisis-service/internal/database"
)

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Crisis-specific channels
	crisisAlerts   chan *CrisisAlert
	locationUpdates chan *LocationUpdate
	statusUpdates   chan *StatusUpdate

	// Dependencies
	redisClient *database.RedisClient
	logger      *logrus.Logger
	
	// Metrics
	connectedClients int64
	mutex           sync.RWMutex
}

type Client struct {
	// The websocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte

	// User information
	userID   string
	userRole string
	sessionID string

	// Client capabilities
	supportsVoice    bool
	supportsLocation bool
	supportsEmergency bool

	// Connection metadata
	connectedAt time.Time
	lastActivity time.Time
	ipAddress   string
	userAgent   string

	// Hub reference
	hub *Hub
}

type CrisisAlert struct {
	CrisisID       string                 `json:"crisis_id"`
	UserID         string                 `json:"user_id"`
	SeverityLevel  int                    `json:"severity_level"`
	Location       *database.LocationData `json:"location,omitempty"`
	Message        string                 `json:"message"`
	Timestamp      time.Time              `json:"timestamp"`
	Recipients     []string               `json:"recipients"` // User IDs to receive alert
	AlertType      string                 `json:"alert_type"` // 'crisis', 'escalation', 'resolution'
}

type LocationUpdate struct {
	UserID    string                 `json:"user_id"`
	Location  *database.LocationData `json:"location"`
	Timestamp time.Time              `json:"timestamp"`
	CrisisID  string                 `json:"crisis_id,omitempty"`
}

type StatusUpdate struct {
	Type      string                 `json:"type"`
	UserID    string                 `json:"user_id,omitempty"`
	CrisisID  string                 `json:"crisis_id,omitempty"`
	Status    string                 `json:"status"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

type Message struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
	MessageID string      `json:"message_id,omitempty"`
}

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512KB
)

// NewHub creates a new WebSocket hub
func NewHub(redisClient *database.RedisClient, logger *logrus.Logger) *Hub {
	return &Hub{
		clients:         make(map[*Client]bool),
		broadcast:       make(chan []byte),
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		crisisAlerts:    make(chan *CrisisAlert, 100),
		locationUpdates: make(chan *LocationUpdate, 1000),
		statusUpdates:   make(chan *StatusUpdate, 500),
		redisClient:     redisClient,
		logger:          logger,
	}
}

// Run starts the hub
func (h *Hub) Run(ctx context.Context) {
	// Start Redis subscriber for distributed messages
	go h.handleRedisMessages(ctx)

	for {
		select {
		case <-ctx.Done():
			h.logger.Info("WebSocket hub shutting down")
			return

		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)

		case alert := <-h.crisisAlerts:
			h.handleCrisisAlert(alert)

		case update := <-h.locationUpdates:
			h.handleLocationUpdate(update)

		case update := <-h.statusUpdates:
			h.handleStatusUpdate(update)
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	h.clients[client] = true
	h.connectedClients++

	h.logger.WithFields(logrus.Fields{
		"user_id":           client.userID,
		"session_id":        client.sessionID,
		"connected_clients": h.connectedClients,
		"ip_address":       client.ipAddress,
	}).Info("Client connected")

	// Send welcome message
	welcomeMsg := Message{
		Type:      "welcome",
		Data:      map[string]interface{}{"status": "connected"},
		Timestamp: time.Now(),
	}

	if data, err := json.Marshal(welcomeMsg); err == nil {
		select {
		case client.send <- data:
		default:
			close(client.send)
			delete(h.clients, client)
			h.connectedClients--
		}
	}

	// Subscribe to user-specific channels
	go h.subscribeToUserChannels(client)
}

func (h *Hub) unregisterClient(client *Client) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.send)
		h.connectedClients--

		h.logger.WithFields(logrus.Fields{
			"user_id":           client.userID,
			"session_id":        client.sessionID,
			"connected_clients": h.connectedClients,
			"duration":          time.Since(client.connectedAt),
		}).Info("Client disconnected")
	}
}

func (h *Hub) broadcastMessage(message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			close(client.send)
			delete(h.clients, client)
			h.connectedClients--
		}
	}
}

func (h *Hub) handleCrisisAlert(alert *CrisisAlert) {
	message := Message{
		Type:      "crisis_alert",
		Data:      alert,
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(message)
	if err != nil {
		h.logger.WithError(err).Error("Failed to marshal crisis alert")
		return
	}

	// Send to specific recipients
	if len(alert.Recipients) > 0 {
		h.sendToUsers(alert.Recipients, data)
	} else {
		// Broadcast to all connected clients (emergency scenario)
		h.broadcastMessage(data)
	}

	// Also publish to Redis for distributed processing
	h.redisClient.Publish(context.Background(), "crisis:alerts", alert)

	h.logger.WithFields(logrus.Fields{
		"crisis_id":      alert.CrisisID,
		"user_id":        alert.UserID,
		"severity_level": alert.SeverityLevel,
		"alert_type":     alert.AlertType,
		"recipients":     len(alert.Recipients),
	}).Info("Crisis alert sent")
}

func (h *Hub) handleLocationUpdate(update *LocationUpdate) {
	message := Message{
		Type:      "location_update",
		Data:      update,
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(message)
	if err != nil {
		h.logger.WithError(err).Error("Failed to marshal location update")
		return
	}

	// Send to emergency contacts and support network
	// For now, broadcast to all (can be filtered later)
	h.broadcastMessage(data)

	// Store in Redis for persistence
	ctx := context.Background()
	h.redisClient.UpdateUserLocation(ctx, update.UserID, update.Location)
}

func (h *Hub) handleStatusUpdate(update *StatusUpdate) {
	message := Message{
		Type:      "status_update",
		Data:      update,
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(message)
	if err != nil {
		h.logger.WithError(err).Error("Failed to marshal status update")
		return
	}

	h.broadcastMessage(data)
}

// sendToUsers sends a message to specific users
func (h *Hub) sendToUsers(userIDs []string, message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	targetUsers := make(map[string]bool)
	for _, userID := range userIDs {
		targetUsers[userID] = true
	}

	sentCount := 0
	for client := range h.clients {
		if targetUsers[client.userID] {
			select {
			case client.send <- message:
				sentCount++
			default:
				close(client.send)
				delete(h.clients, client)
				h.connectedClients--
			}
		}
	}

	h.logger.WithFields(logrus.Fields{
		"target_users": len(userIDs),
		"sent_count":   sentCount,
	}).Debug("Message sent to specific users")
}

// SendCrisisAlert sends a crisis alert
func (h *Hub) SendCrisisAlert(alert *CrisisAlert) {
	select {
	case h.crisisAlerts <- alert:
	default:
		h.logger.WithField("crisis_id", alert.CrisisID).Error("Crisis alert channel full")
	}
}

// SendLocationUpdate sends a location update
func (h *Hub) SendLocationUpdate(update *LocationUpdate) {
	select {
	case h.locationUpdates <- update:
	default:
		h.logger.WithField("user_id", update.UserID).Error("Location update channel full")
	}
}

// SendStatusUpdate sends a status update
func (h *Hub) SendStatusUpdate(update *StatusUpdate) {
	select {
	case h.statusUpdates <- update:
	default:
		h.logger.WithField("type", update.Type).Error("Status update channel full")
	}
}

// subscribeToUserChannels subscribes a client to their specific Redis channels
func (h *Hub) subscribeToUserChannels(client *Client) {
	ctx := context.Background()
	channels := []string{
		fmt.Sprintf("user:%s:alerts", client.userID),
		fmt.Sprintf("user:%s:messages", client.userID),
	}

	pubsub := h.redisClient.Subscribe(ctx, channels...)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		select {
		case client.send <- []byte(msg.Payload):
		default:
			h.logger.WithField("user_id", client.userID).Warn("Client send buffer full")
			return
		}
	}
}

// handleRedisMessages handles distributed messages from Redis
func (h *Hub) handleRedisMessages(ctx context.Context) {
	pubsub := h.redisClient.Subscribe(ctx, 
		"crisis:global_alerts",
		"system:broadcasts",
		"emergency:all_hands",
	)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-ch:
			h.broadcast <- []byte(msg.Payload)
		}
	}
}

// GetConnectedClients returns the number of connected clients
func (h *Hub) GetConnectedClients() int64 {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	return h.connectedClients
}

// GetClientsByUser returns clients for a specific user
func (h *Hub) GetClientsByUser(userID string) []*Client {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	var userClients []*Client
	for client := range h.clients {
		if client.userID == userID {
			userClients = append(userClients, client)
		}
	}
	return userClients
}

// Shutdown gracefully shuts down the hub
func (h *Hub) Shutdown() {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	for client := range h.clients {
		close(client.send)
	}
	
	close(h.broadcast)
	close(h.crisisAlerts)
	close(h.locationUpdates)
	close(h.statusUpdates)

	h.logger.Info("WebSocket hub shut down")
}
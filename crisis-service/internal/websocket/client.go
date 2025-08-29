package websocket

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// In production, implement proper origin checking
		return true
	},
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		c.lastActivity = time.Now()
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.hub.logger.WithError(err).Error("WebSocket error")
			}
			break
		}

		c.lastActivity = time.Now()
		c.handleMessage(message)
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage processes incoming messages from the client
func (c *Client) handleMessage(messageBytes []byte) {
	var msg struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}

	if err := json.Unmarshal(messageBytes, &msg); err != nil {
		c.hub.logger.WithError(err).Error("Failed to unmarshal client message")
		return
	}

	switch msg.Type {
	case "crisis_button":
		c.handleCrisisButton(msg.Data)
	case "location_update":
		c.handleLocationUpdate(msg.Data)
	case "voice_detection":
		c.handleVoiceDetection(msg.Data)
	case "status_update":
		c.handleStatusUpdate(msg.Data)
	case "ping":
		c.sendPong()
	default:
		c.hub.logger.WithField("type", msg.Type).Warn("Unknown message type")
	}
}

// handleCrisisButton handles emergency crisis button activation
func (c *Client) handleCrisisButton(data json.RawMessage) {
	var crisisData struct {
		Location    *LocationData          `json:"location,omitempty"`
		UserMessage string                 `json:"user_message,omitempty"`
		Context     map[string]interface{} `json:"context,omitempty"`
	}

	if err := json.Unmarshal(data, &crisisData); err != nil {
		c.hub.logger.WithError(err).Error("Failed to unmarshal crisis button data")
		return
	}

	// Create crisis alert
	alert := &CrisisAlert{
		CrisisID:      generateCrisisID(),
		UserID:        c.userID,
		SeverityLevel: 5, // Maximum severity for manual crisis button
		Location:      crisisData.Location,
		Message:       crisisData.UserMessage,
		Timestamp:     time.Now(),
		AlertType:     "crisis",
	}

	// Send to hub for processing
	c.hub.SendCrisisAlert(alert)

	// Log the crisis button activation
	c.hub.logger.WithFields(logrus.Fields{
		"user_id":   c.userID,
		"crisis_id": alert.CrisisID,
		"location":  crisisData.Location != nil,
	}).Critical("Crisis button activated")
}

// handleLocationUpdate handles location updates from the client
func (c *Client) handleLocationUpdate(data json.RawMessage) {
	var locationData struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
		Accuracy  float64 `json:"accuracy"`
		CrisisID  string  `json:"crisis_id,omitempty"`
	}

	if err := json.Unmarshal(data, &locationData); err != nil {
		c.hub.logger.WithError(err).Error("Failed to unmarshal location data")
		return
	}

	location := &LocationData{
		Latitude:  locationData.Latitude,
		Longitude: locationData.Longitude,
		Accuracy:  locationData.Accuracy,
		Timestamp: time.Now(),
	}

	update := &LocationUpdate{
		UserID:    c.userID,
		Location:  location,
		Timestamp: time.Now(),
		CrisisID:  locationData.CrisisID,
	}

	c.hub.SendLocationUpdate(update)
}

// handleVoiceDetection handles voice detection results
func (c *Client) handleVoiceDetection(data json.RawMessage) {
	var voiceData struct {
		Transcript      string  `json:"transcript"`
		Confidence      float64 `json:"confidence"`
		AudioURL        string  `json:"audio_url,omitempty"`
		DetectionType   string  `json:"detection_type"` // 'distress', 'help', 'emergency'
		SeverityScore   float64 `json:"severity_score"`
	}

	if err := json.Unmarshal(data, &voiceData); err != nil {
		c.hub.logger.WithError(err).Error("Failed to unmarshal voice detection data")
		return
	}

	// Only process if confidence is above threshold
	if voiceData.Confidence < 0.8 {
		return
	}

	// Determine severity level based on detection type and score
	severityLevel := calculateSeverityFromVoice(voiceData.DetectionType, voiceData.SeverityScore)

	if severityLevel >= 3 { // High severity
		alert := &CrisisAlert{
			CrisisID:      generateCrisisID(),
			UserID:        c.userID,
			SeverityLevel: severityLevel,
			Message:       fmt.Sprintf("Voice detection: %s (confidence: %.2f)", voiceData.Transcript, voiceData.Confidence),
			Timestamp:     time.Now(),
			AlertType:     "crisis",
		}

		c.hub.SendCrisisAlert(alert)

		c.hub.logger.WithFields(logrus.Fields{
			"user_id":        c.userID,
			"crisis_id":      alert.CrisisID,
			"transcript":     voiceData.Transcript,
			"confidence":     voiceData.Confidence,
			"detection_type": voiceData.DetectionType,
			"severity":       severityLevel,
		}).Warn("Voice-triggered crisis detected")
	}
}

// handleStatusUpdate handles status updates from the client
func (c *Client) handleStatusUpdate(data json.RawMessage) {
	var statusData struct {
		Status   string                 `json:"status"`
		CrisisID string                 `json:"crisis_id,omitempty"`
		Data     map[string]interface{} `json:"data,omitempty"`
	}

	if err := json.Unmarshal(data, &statusData); err != nil {
		c.hub.logger.WithError(err).Error("Failed to unmarshal status update data")
		return
	}

	update := &StatusUpdate{
		Type:      "client_status",
		UserID:    c.userID,
		CrisisID:  statusData.CrisisID,
		Status:    statusData.Status,
		Data:      statusData.Data,
		Timestamp: time.Now(),
	}

	c.hub.SendStatusUpdate(update)
}

// sendPong sends a pong response
func (c *Client) sendPong() {
	pongMsg := Message{
		Type:      "pong",
		Timestamp: time.Now(),
	}

	if data, err := json.Marshal(pongMsg); err == nil {
		select {
		case c.send <- data:
		default:
			c.hub.logger.WithField("user_id", c.userID).Warn("Failed to send pong, client buffer full")
		}
	}
}

// ServeWS handles websocket requests from clients
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request, userID, sessionID string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		hub.logger.WithError(err).Error("Failed to upgrade websocket connection")
		return
	}

	client := &Client{
		hub:           hub,
		conn:          conn,
		send:          make(chan []byte, 256),
		userID:        userID,
		sessionID:     sessionID,
		connectedAt:   time.Now(),
		lastActivity:  time.Now(),
		ipAddress:     getClientIP(r),
		userAgent:     r.UserAgent(),
	}

	// Extract client capabilities from headers or query params
	client.supportsVoice = r.URL.Query().Get("voice") == "true"
	client.supportsLocation = r.URL.Query().Get("location") == "true"
	client.supportsEmergency = r.URL.Query().Get("emergency") == "true"

	client.hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

// Helper functions

func generateCrisisID() string {
	// In production, use UUID or similar
	return fmt.Sprintf("crisis_%d", time.Now().UnixNano())
}

func calculateSeverityFromVoice(detectionType string, severityScore float64) int {
	baseScore := map[string]int{
		"help":      3,
		"distress":  4,
		"emergency": 5,
	}

	base := baseScore[detectionType]
	if base == 0 {
		base = 2
	}

	// Adjust based on severity score
	if severityScore > 0.9 {
		base = min(5, base+1)
	} else if severityScore < 0.7 {
		base = max(1, base-1)
	}

	return base
}

func getClientIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-IP")
	}
	if ip == "" {
		ip = r.RemoteAddr
	}
	return ip
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
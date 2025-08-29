package database

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"serenity/crisis-service/config"
)

type RedisClient struct {
	client *redis.Client
	config *config.RedisConfig
	logger *logrus.Logger
}

type CrisisState struct {
	CrisisID           string                 `json:"crisis_id"`
	UserID             string                 `json:"user_id"`
	Status             string                 `json:"status"`
	SeverityLevel      int                    `json:"severity_level"`
	Location           *LocationData          `json:"location,omitempty"`
	ActiveContacts     []string               `json:"active_contacts"`
	EscalationLevel    int                    `json:"escalation_level"`
	LastActivity       time.Time              `json:"last_activity"`
	ConsensusNodes     map[string]interface{} `json:"consensus_nodes"`
	InterventionStatus string                 `json:"intervention_status"`
	Metadata           map[string]interface{} `json:"metadata"`
}

type LocationData struct {
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Accuracy  float64   `json:"accuracy"`
	Timestamp time.Time `json:"timestamp"`
}

type MessagePriority int

const (
	PriorityLow MessagePriority = iota
	PriorityNormal
	PriorityHigh
	PriorityCritical
	PriorityEmergency
)

// NewRedisClient creates a new Redis client
func NewRedisClient(cfg *config.RedisConfig, logger *logrus.Logger) (*RedisClient, error) {
	opts, err := redis.ParseURL(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	opts.MaxRetries = cfg.MaxRetries
	opts.PoolSize = cfg.PoolSize
	opts.ReadTimeout = cfg.Timeout
	opts.WriteTimeout = cfg.Timeout

	client := redis.NewClient(opts)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisClient{
		client: client,
		config: cfg,
		logger: logger,
	}, nil
}

// Crisis State Management

// SetCrisisState stores crisis state in Redis with expiration
func (r *RedisClient) SetCrisisState(ctx context.Context, state *CrisisState, ttl time.Duration) error {
	key := fmt.Sprintf("crisis:state:%s", state.CrisisID)
	
	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal crisis state: %w", err)
	}

	if err := r.client.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("failed to set crisis state: %w", err)
	}

	r.logger.WithFields(logrus.Fields{
		"crisis_id": state.CrisisID,
		"user_id":   state.UserID,
		"status":    state.Status,
	}).Info("Crisis state updated")

	return nil
}

// GetCrisisState retrieves crisis state from Redis
func (r *RedisClient) GetCrisisState(ctx context.Context, crisisID string) (*CrisisState, error) {
	key := fmt.Sprintf("crisis:state:%s", crisisID)
	
	data, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get crisis state: %w", err)
	}

	var state CrisisState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, fmt.Errorf("failed to unmarshal crisis state: %w", err)
	}

	return &state, nil
}

// GetUserActiveCrises returns all active crises for a user
func (r *RedisClient) GetUserActiveCrises(ctx context.Context, userID string) ([]*CrisisState, error) {
	pattern := "crisis:state:*"
	
	keys, err := r.client.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get crisis keys: %w", err)
	}

	var activeCrises []*CrisisState
	for _, key := range keys {
		data, err := r.client.Get(ctx, key).Result()
		if err != nil {
			continue
		}

		var state CrisisState
		if err := json.Unmarshal([]byte(data), &state); err != nil {
			continue
		}

		if state.UserID == userID && state.Status == "active" {
			activeCrises = append(activeCrises, &state)
		}
	}

	return activeCrises, nil
}

// Real-time Location Tracking

// UpdateUserLocation updates user's real-time location
func (r *RedisClient) UpdateUserLocation(ctx context.Context, userID string, location *LocationData) error {
	key := fmt.Sprintf("location:user:%s", userID)
	
	data, err := json.Marshal(location)
	if err != nil {
		return fmt.Errorf("failed to marshal location data: %w", err)
	}

	// Store with 5-minute expiration
	if err := r.client.Set(ctx, key, data, 5*time.Minute).Err(); err != nil {
		return fmt.Errorf("failed to update user location: %w", err)
	}

	// Also publish to location updates channel for real-time subscribers
	locationUpdate := map[string]interface{}{
		"user_id":   userID,
		"location":  location,
		"timestamp": time.Now(),
	}

	updateData, _ := json.Marshal(locationUpdate)
	r.client.Publish(ctx, "location:updates", updateData)

	return nil
}

// GetUserLocation retrieves user's current location
func (r *RedisClient) GetUserLocation(ctx context.Context, userID string) (*LocationData, error) {
	key := fmt.Sprintf("location:user:%s", userID)
	
	data, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user location: %w", err)
	}

	var location LocationData
	if err := json.Unmarshal([]byte(data), &location); err != nil {
		return nil, fmt.Errorf("failed to unmarshal location data: %w", err)
	}

	return &location, nil
}

// Priority Message Queue

// EnqueuePriorityMessage adds a message to the priority queue
func (r *RedisClient) EnqueuePriorityMessage(ctx context.Context, queueName string, priority MessagePriority, message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	// Use sorted set with priority as score (higher priority = higher score)
	score := float64(priority) + float64(time.Now().UnixNano())/1e18 // Add timestamp for ordering within same priority
	
	if err := r.client.ZAdd(ctx, queueName, redis.Z{
		Score:  score,
		Member: data,
	}).Err(); err != nil {
		return fmt.Errorf("failed to enqueue message: %w", err)
	}

	// Notify consumers
	r.client.Publish(ctx, fmt.Sprintf("%s:notify", queueName), "new_message")

	r.logger.WithFields(logrus.Fields{
		"queue":    queueName,
		"priority": priority,
		"score":    score,
	}).Debug("Message enqueued")

	return nil
}

// DequeuePriorityMessage removes and returns the highest priority message
func (r *RedisClient) DequeuePriorityMessage(ctx context.Context, queueName string) ([]byte, error) {
	// Get highest priority message (highest score)
	result, err := r.client.ZPopMax(ctx, queueName).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Queue empty
		}
		return nil, fmt.Errorf("failed to dequeue message: %w", err)
	}

	if len(result) == 0 {
		return nil, nil
	}

	message, ok := result[0].Member.(string)
	if !ok {
		return nil, fmt.Errorf("invalid message format")
	}

	return []byte(message), nil
}

// Session Management

// SetUserSession stores user session data
func (r *RedisClient) SetUserSession(ctx context.Context, sessionToken string, userID string, sessionData map[string]interface{}, ttl time.Duration) error {
	key := fmt.Sprintf("session:%s", sessionToken)
	
	data := map[string]interface{}{
		"user_id":     userID,
		"created_at":  time.Now(),
		"expires_at":  time.Now().Add(ttl),
		"data":        sessionData,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal session data: %w", err)
	}

	if err := r.client.Set(ctx, key, jsonData, ttl).Err(); err != nil {
		return fmt.Errorf("failed to set session: %w", err)
	}

	// Also maintain reverse lookup
	userSessionKey := fmt.Sprintf("user:sessions:%s", userID)
	r.client.SAdd(ctx, userSessionKey, sessionToken)
	r.client.Expire(ctx, userSessionKey, ttl)

	return nil
}

// GetUserSession retrieves user session data
func (r *RedisClient) GetUserSession(ctx context.Context, sessionToken string) (map[string]interface{}, error) {
	key := fmt.Sprintf("session:%s", sessionToken)
	
	data, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	var sessionData map[string]interface{}
	if err := json.Unmarshal([]byte(data), &sessionData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session data: %w", err)
	}

	return sessionData, nil
}

// DeleteUserSession removes user session
func (r *RedisClient) DeleteUserSession(ctx context.Context, sessionToken string, userID string) error {
	key := fmt.Sprintf("session:%s", sessionToken)
	userSessionKey := fmt.Sprintf("user:sessions:%s", userID)

	pipe := r.client.Pipeline()
	pipe.Del(ctx, key)
	pipe.SRem(ctx, userSessionKey, sessionToken)

	_, err := pipe.Exec(ctx)
	return err
}

// PubSub for Real-time Communication

// Subscribe subscribes to a Redis channel
func (r *RedisClient) Subscribe(ctx context.Context, channels ...string) *redis.PubSub {
	return r.client.Subscribe(ctx, channels...)
}

// Publish publishes a message to a Redis channel
func (r *RedisClient) Publish(ctx context.Context, channel string, message interface{}) error {
	data, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return r.client.Publish(ctx, channel, data).Err()
}

// Caching

// Set sets a value in Redis with expiration
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	return r.client.Set(ctx, key, data, ttl).Err()
}

// Get gets a value from Redis
func (r *RedisClient) Get(ctx context.Context, key string, dest interface{}) error {
	data, err := r.client.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil
		}
		return fmt.Errorf("failed to get value: %w", err)
	}

	return json.Unmarshal([]byte(data), dest)
}

// Health Check
func (r *RedisClient) HealthCheck(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// Close closes the Redis connection
func (r *RedisClient) Close() error {
	return r.client.Close()
}
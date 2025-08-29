package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	
	"serenity/crisis-service/internal/crisis"
	"serenity/crisis-service/internal/database"
	"serenity/crisis-service/internal/escalation"
	"serenity/crisis-service/internal/location"
	"serenity/crisis-service/internal/websocket"
)

// CrisisHandlers contains handlers for crisis-related endpoints
type CrisisHandlers struct {
	detectionService *crisis.DetectionService
	escalationEngine *escalation.WorkflowEngine
	locationTracker  *location.TrackerService
	wsHub           *websocket.Hub
	redisClient     *database.RedisClient
	postgresClient  *database.PostgresClient
	logger          *logrus.Logger
}

// NewCrisisHandlers creates a new crisis handlers instance
func NewCrisisHandlers(
	detectionService *crisis.DetectionService,
	escalationEngine *escalation.WorkflowEngine,
	locationTracker *location.TrackerService,
	wsHub *websocket.Hub,
	redisClient *database.RedisClient,
	postgresClient *database.PostgresClient,
	logger *logrus.Logger,
) *CrisisHandlers {
	return &CrisisHandlers{
		detectionService: detectionService,
		escalationEngine: escalationEngine,
		locationTracker:  locationTracker,
		wsHub:           wsHub,
		redisClient:     redisClient,
		postgresClient:  postgresClient,
		logger:          logger,
	}
}

// TriggerCrisisRequest represents a manual crisis trigger request
type TriggerCrisisRequest struct {
	SeverityLevel       int                    `json:"severity_level" binding:"required,min=1,max=5"`
	UserMessage         string                 `json:"user_message,omitempty"`
	Location            *LocationData          `json:"location,omitempty"`
	Context             map[string]interface{} `json:"context,omitempty"`
	EmergencyContacts   []string               `json:"emergency_contacts,omitempty"`
	SkipTriage          bool                   `json:"skip_triage,omitempty"`
}

// LocationData represents location information
type LocationData struct {
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Accuracy  float64   `json:"accuracy"`
	Timestamp time.Time `json:"timestamp"`
	Address   *Address  `json:"address,omitempty"`
}

// Address represents an address
type Address struct {
	Street           string `json:"street,omitempty"`
	City             string `json:"city,omitempty"`
	State            string `json:"state,omitempty"`
	PostalCode       string `json:"postal_code,omitempty"`
	Country          string `json:"country,omitempty"`
	FormattedAddress string `json:"formatted_address,omitempty"`
}

// VoiceAnalysisRequest represents a voice analysis request
type VoiceAnalysisRequest struct {
	AudioURL    string                 `json:"audio_url,omitempty"`
	Transcript  string                 `json:"transcript" binding:"required"`
	Context     map[string]interface{} `json:"context,omitempty"`
}

// PatternAnalysisRequest represents a pattern analysis request
type PatternAnalysisRequest struct {
	TimeWindowStart time.Time              `json:"time_window_start" binding:"required"`
	TimeWindowEnd   time.Time              `json:"time_window_end" binding:"required"`
	BehaviorData    map[string]interface{} `json:"behavior_data" binding:"required"`
	HistoricalData  map[string]interface{} `json:"historical_data,omitempty"`
}

// UpdateCrisisStatusRequest represents a crisis status update
type UpdateCrisisStatusRequest struct {
	Status  string `json:"status" binding:"required"`
	Notes   string `json:"notes,omitempty"`
	ResolvedBy string `json:"resolved_by,omitempty"`
}

// TriggerCrisis handles manual crisis triggers (one-tap crisis button)
func (ch *CrisisHandlers) TriggerCrisis(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	var req TriggerCrisisRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	ch.logger.WithFields(logrus.Fields{
		"user_id":        userID,
		"severity_level": req.SeverityLevel,
		"has_location":   req.Location != nil,
		"has_message":    req.UserMessage != "",
	}).Critical("Manual crisis triggered")
	
	// Create crisis event
	crisisID := uuid.New()
	crisisEvent := &crisis.Crisis{
		ID:            crisisID,
		UserID:        uuid.MustParse(userID),
		EventType:     crisis.EventTypeManual,
		SeverityLevel: req.SeverityLevel,
		Status:        crisis.StatusActive,
		UserReportedDetails: &req.UserMessage,
		ContextData:   req.Context,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	
	// Add location if provided
	if req.Location != nil {
		crisisEvent.LocationLat = &req.Location.Latitude
		crisisEvent.LocationLng = &req.Location.Longitude
		crisisEvent.LocationAccuracy = &req.Location.Accuracy
		locationTimestamp := req.Location.Timestamp
		crisisEvent.LocationTimestamp = &locationTimestamp
	}
	
	// Store crisis in cache for immediate access
	crisisState := &database.CrisisState{
		CrisisID:      crisisID.String(),
		UserID:        userID,
		Status:        crisis.StatusActive,
		SeverityLevel: req.SeverityLevel,
		LastActivity:  time.Now(),
		Metadata: map[string]interface{}{
			"trigger_type": "manual",
			"user_message": req.UserMessage,
		},
	}
	
	if req.Location != nil {
		crisisState.Location = &database.LocationData{
			Latitude:  req.Location.Latitude,
			Longitude: req.Location.Longitude,
			Accuracy:  req.Location.Accuracy,
			Timestamp: req.Location.Timestamp,
		}
	}
	
	ctx := context.Background()
	if err := ch.redisClient.SetCrisisState(ctx, crisisState, 24*time.Hour); err != nil {
		ch.logger.WithError(err).Error("Failed to store crisis state in Redis")
	}
	
	// Send immediate WebSocket alert
	alert := &websocket.CrisisAlert{
		CrisisID:      crisisID.String(),
		UserID:        userID,
		SeverityLevel: req.SeverityLevel,
		Message:       fmt.Sprintf("MANUAL CRISIS TRIGGER: %s", req.UserMessage),
		Timestamp:     time.Now(),
		AlertType:     "crisis",
		Recipients:    req.EmergencyContacts,
	}
	
	if req.Location != nil {
		alert.Location = &database.LocationData{
			Latitude:  req.Location.Latitude,
			Longitude: req.Location.Longitude,
			Accuracy:  req.Location.Accuracy,
			Timestamp: req.Location.Timestamp,
		}
	}
	
	ch.wsHub.SendCrisisAlert(alert)
	
	// Start location tracking if location provided
	var trackingSessionID string
	if req.Location != nil {
		config := &location.TrackingConfig{
			UpdateInterval:   30 * time.Second,
			AccuracyRequired: 50.0,
			MaxDuration:      2 * time.Hour,
		}
		
		session, err := ch.locationTracker.StartTracking(ctx, userID, crisisID.String(), location.SessionTypeEmergency, config)
		if err != nil {
			ch.logger.WithError(err).Error("Failed to start location tracking")
		} else {
			trackingSessionID = session.ID
			
			// Update initial location
			locationPoint := &location.LocationPoint{
				Latitude:     req.Location.Latitude,
				Longitude:    req.Location.Longitude,
				Accuracy:     req.Location.Accuracy,
				Timestamp:    req.Location.Timestamp,
				Source:       "manual",
				ConsentLevel: "emergency_only",
				Precision:    "exact",
			}
			
			if err := ch.locationTracker.UpdateLocation(trackingSessionID, locationPoint); err != nil {
				ch.logger.WithError(err).Error("Failed to update initial location")
			}
		}
	}
	
	// TODO: Store in PostgreSQL (implement database operations)
	// TODO: Start escalation workflow if severity is high enough
	
	response := gin.H{
		"crisis_id":            crisisID.String(),
		"status":               "active",
		"severity_level":       req.SeverityLevel,
		"created_at":          time.Now(),
		"tracking_session_id":  trackingSessionID,
		"estimated_response":   "2 minutes",
	}
	
	c.JSON(http.StatusCreated, response)
}

// AnalyzeVoice handles voice analysis requests
func (ch *CrisisHandlers) AnalyzeVoice(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	var req VoiceAnalysisRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	input := &crisis.VoiceAnalysisInput{
		AudioURL:   req.AudioURL,
		Transcript: req.Transcript,
		UserID:     userID,
		Context:    req.Context,
		Timestamp:  time.Now(),
	}
	
	result, err := ch.detectionService.AnalyzeVoice(context.Background(), input)
	if err != nil {
		ch.logger.WithError(err).Error("Voice analysis failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Voice analysis failed"})
		return
	}
	
	// If crisis detected with high severity, trigger automatic response
	if result.CrisisDetected && result.SeverityLevel >= 4 {
		ch.logger.WithFields(logrus.Fields{
			"user_id":        userID,
			"severity":       result.SeverityLevel,
			"confidence":     result.ConfidenceScore,
			"transcript":     req.Transcript[:min(len(req.Transcript), 100)],
		}).Warn("High-severity crisis detected via voice analysis")
		
		// TODO: Auto-trigger crisis workflow
	}
	
	c.JSON(http.StatusOK, result)
}

// AnalyzePatterns handles behavioral pattern analysis requests
func (ch *CrisisHandlers) AnalyzePatterns(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	
	var req PatternAnalysisRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	input := &crisis.PatternAnalysisInput{
		UserID:          userID,
		TimeWindowStart: req.TimeWindowStart,
		TimeWindowEnd:   req.TimeWindowEnd,
		BehaviorData:    req.BehaviorData,
		HistoricalData:  req.HistoricalData,
	}
	
	result, err := ch.detectionService.AnalyzePatterns(context.Background(), input)
	if err != nil {
		ch.logger.WithError(err).Error("Pattern analysis failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Pattern analysis failed"})
		return
	}
	
	c.JSON(http.StatusOK, result)
}

// GetCrisis retrieves crisis information
func (ch *CrisisHandlers) GetCrisis(c *gin.Context) {
	crisisID := c.Param("crisis_id")
	if crisisID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Crisis ID required"})
		return
	}
	
	// Try to get from Redis cache first
	crisisState, err := ch.redisClient.GetCrisisState(context.Background(), crisisID)
	if err != nil {
		ch.logger.WithError(err).Error("Failed to get crisis state from Redis")
	}
	
	if crisisState != nil {
		c.JSON(http.StatusOK, crisisState)
		return
	}
	
	// TODO: Fallback to PostgreSQL if not in cache
	c.JSON(http.StatusNotFound, gin.H{"error": "Crisis not found"})
}

// UpdateCrisisStatus updates crisis status
func (ch *CrisisHandlers) UpdateCrisisStatus(c *gin.Context) {
	crisisID := c.Param("crisis_id")
	userID := c.GetString("user_id")
	
	var req UpdateCrisisStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Validate status
	validStatuses := []string{crisis.StatusActive, crisis.StatusAcknowledged, crisis.StatusResolved, crisis.StatusFalsePositive}
	valid := false
	for _, status := range validStatuses {
		if req.Status == status {
			valid = true
			break
		}
	}
	
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}
	
	// Get current crisis state
	crisisState, err := ch.redisClient.GetCrisisState(context.Background(), crisisID)
	if err != nil || crisisState == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Crisis not found"})
		return
	}
	
	// Update status
	crisisState.Status = req.Status
	crisisState.LastActivity = time.Now()
	
	// Store updated state
	if err := ch.redisClient.SetCrisisState(context.Background(), crisisState, 24*time.Hour); err != nil {
		ch.logger.WithError(err).Error("Failed to update crisis state")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update crisis"})
		return
	}
	
	// Send status update via WebSocket
	statusUpdate := &websocket.StatusUpdate{
		Type:      "crisis_status",
		CrisisID:  crisisID,
		Status:    req.Status,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"notes":       req.Notes,
			"resolved_by": req.ResolvedBy,
			"updated_by":  userID,
		},
	}
	
	ch.wsHub.SendStatusUpdate(statusUpdate)
	
	ch.logger.WithFields(logrus.Fields{
		"crisis_id":   crisisID,
		"old_status":  crisisState.Status,
		"new_status":  req.Status,
		"updated_by":  userID,
	}).Info("Crisis status updated")
	
	c.JSON(http.StatusOK, gin.H{
		"crisis_id":   crisisID,
		"status":      req.Status,
		"updated_at":  time.Now(),
		"updated_by":  userID,
	})
}

// Placeholder handlers for other endpoints
func (ch *CrisisHandlers) EscalateCrisis(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) GetCrisisTimeline(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) StartLocationTracking(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) UpdateLocation(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) StopLocationTracking(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) GetLocationSessions(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) GetEmergencyContacts(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) CreateEmergencyContact(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) UpdateEmergencyContact(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) DeleteEmergencyContact(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) VerifyEmergencyContact(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) GetEscalationPlans(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) CreateEscalationPlan(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) UpdateEscalationPlan(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) DeleteEscalationPlan(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) TestEscalationPlan(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) Contact911(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) ContactCrisisHotline(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) ContactMentalHealthServices(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) StartInterventionSession(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) UpdateInterventionStep(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) CompleteInterventionSession(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) GetInterventionSession(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) GetFollowupTasks(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) CreateFollowupTask(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) UpdateFollowupTask(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) CompleteFollowupTask(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) HandleTwilioVoiceWebhook(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) HandleTwilioSMSWebhook(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (ch *CrisisHandlers) HandleEmergencyServicesWebhook(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
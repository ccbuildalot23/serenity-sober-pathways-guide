package location

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"serenity/crisis-service/internal/database"
)

// TrackerService handles GPS location tracking and emergency responder integration
type TrackerService struct {
	redisClient      *database.RedisClient
	logger          *logrus.Logger
	
	// Active tracking sessions
	activeSessions   map[string]*TrackingSession
	sessionsMutex    sync.RWMutex
	
	// Configuration
	accuracyThreshold   float64
	updateInterval      time.Duration
	geoFenceRadius      float64
	emergencyZones      []EmergencyZone
	responderEndpoints  []ResponderEndpoint
}

// TrackingSession represents an active location tracking session
type TrackingSession struct {
	ID               string                    `json:"id"`
	UserID           string                    `json:"user_id"`
	CrisisID         *string                   `json:"crisis_id,omitempty"`
	SessionType      string                    `json:"session_type"` // emergency, monitoring, check_in
	Status           string                    `json:"status"`
	
	// Location data
	CurrentLocation  *LocationPoint            `json:"current_location"`
	LocationHistory  []LocationPoint           `json:"location_history"`
	LastUpdate       time.Time                 `json:"last_update"`
	
	// Tracking configuration
	UpdateInterval   time.Duration             `json:"update_interval"`
	AccuracyRequired float64                   `json:"accuracy_required"`
	MaxDuration      time.Duration             `json:"max_duration"`
	
	// Emergency response
	EmergencyContacts []EmergencyContact       `json:"emergency_contacts"`
	ResponderAlerted  bool                     `json:"responder_alerted"`
	ResponseTeam      *ResponseTeam            `json:"response_team,omitempty"`
	
	// Session control
	StartedAt        time.Time                 `json:"started_at"`
	ExpiresAt        time.Time                 `json:"expires_at"`
	ctx              context.Context
	cancel           context.CancelFunc
	
	// Callbacks
	updateCallback   func(*LocationPoint)
	alertCallback    func(*LocationAlert)
	
	// Service reference
	service          *TrackerService
}

// LocationPoint represents a GPS coordinate with metadata
type LocationPoint struct {
	Latitude      float64                   `json:"latitude"`
	Longitude     float64                   `json:"longitude"`
	Accuracy      float64                   `json:"accuracy"`       // meters
	Altitude      *float64                  `json:"altitude,omitempty"`
	Speed         *float64                  `json:"speed,omitempty"` // km/h
	Heading       *float64                  `json:"heading,omitempty"` // degrees
	Timestamp     time.Time                 `json:"timestamp"`
	
	// Address information (geocoded)
	Address       *Address                  `json:"address,omitempty"`
	
	// Context
	Source        string                    `json:"source"`      // gps, network, manual
	DeviceID      string                    `json:"device_id"`
	BatteryLevel  *int                      `json:"battery_level,omitempty"`
	NetworkType   *string                   `json:"network_type,omitempty"`
	
	// Privacy and consent
	ConsentLevel  string                    `json:"consent_level"` // full, limited, emergency_only
	Precision     string                    `json:"precision"`     // exact, approximate, general_area
}

// Address represents a geocoded address
type Address struct {
	Street        string `json:"street,omitempty"`
	City          string `json:"city,omitempty"`
	State         string `json:"state,omitempty"`
	PostalCode    string `json:"postal_code,omitempty"`
	Country       string `json:"country,omitempty"`
	FormattedAddress string `json:"formatted_address,omitempty"`
}

// EmergencyZone represents a geographical area with special response protocols
type EmergencyZone struct {
	ID            string                    `json:"id"`
	Name          string                    `json:"name"`
	Type          string                    `json:"type"` // hospital, police_station, fire_station, safe_zone
	
	// Geographical boundaries
	Center        LocationPoint             `json:"center"`
	Radius        float64                   `json:"radius"` // meters
	Polygon       []LocationPoint           `json:"polygon,omitempty"` // for complex shapes
	
	// Response configuration
	ResponseTeam  string                    `json:"response_team"`
	ContactInfo   EmergencyContact          `json:"contact_info"`
	ResponseTime  time.Duration             `json:"response_time"`
	
	// Metadata
	IsActive      bool                      `json:"is_active"`
	Priority      int                       `json:"priority"`
	Description   string                    `json:"description"`
}

// EmergencyContact represents contact information for emergency response
type EmergencyContact struct {
	Name          string `json:"name"`
	Phone         string `json:"phone"`
	Email         string `json:"email,omitempty"`
	Role          string `json:"role"`
	Organization  string `json:"organization"`
}

// ResponseTeam represents an emergency response team
type ResponseTeam struct {
	ID            string                    `json:"id"`
	Name          string                    `json:"name"`
	Type          string                    `json:"type"` // paramedic, police, fire, crisis_counselor
	Status        string                    `json:"status"` // dispatched, en_route, on_scene, available
	
	// Team details
	Members       []TeamMember              `json:"members"`
	Vehicle       *Vehicle                  `json:"vehicle,omitempty"`
	Equipment     []string                  `json:"equipment"`
	
	// Location and ETA
	CurrentLocation *LocationPoint          `json:"current_location,omitempty"`
	DestinationETA  *time.Duration          `json:"destination_eta,omitempty"`
	
	// Communication
	RadioChannel  string                    `json:"radio_channel,omitempty"`
	ContactPhone  string                    `json:"contact_phone"`
	
	// Timestamps
	DispatchedAt  time.Time                 `json:"dispatched_at"`
	ArrivalETA    *time.Time                `json:"arrival_eta,omitempty"`
	ArrivedAt     *time.Time                `json:"arrived_at,omitempty"`
}

// TeamMember represents a member of an emergency response team
type TeamMember struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Role          string `json:"role"`
	Certification []string `json:"certification"`
	ContactPhone  string `json:"contact_phone"`
}

// Vehicle represents an emergency response vehicle
type Vehicle struct {
	ID            string                    `json:"id"`
	Type          string                    `json:"type"` // ambulance, police_car, fire_truck
	CallSign      string                    `json:"call_sign"`
	LicensePlate  string                    `json:"license_plate"`
	GPS_ID        string                    `json:"gps_id"`
	Location      *LocationPoint            `json:"location,omitempty"`
}

// ResponderEndpoint represents an endpoint for emergency responder systems
type ResponderEndpoint struct {
	ID            string                    `json:"id"`
	Name          string                    `json:"name"`
	Type          string                    `json:"type"` // dispatch_911, ems, police, fire
	URL           string                    `json:"url"`
	AuthToken     string                    `json:"auth_token"`
	Format        string                    `json:"format"` // json, xml, custom
	Priority      int                       `json:"priority"`
	IsActive      bool                      `json:"is_active"`
}

// LocationAlert represents an alert based on location
type LocationAlert struct {
	ID            string                    `json:"id"`
	UserID        string                    `json:"user_id"`
	CrisisID      *string                   `json:"crisis_id,omitempty"`
	AlertType     string                    `json:"alert_type"`
	
	// Location details
	Location      LocationPoint             `json:"location"`
	Zone          *EmergencyZone           `json:"zone,omitempty"`
	
	// Alert context
	Message       string                    `json:"message"`
	Severity      int                       `json:"severity"`
	Confidence    float64                   `json:"confidence"`
	
	// Response
	ResponseRequired bool                   `json:"response_required"`
	ResponseTeams    []string              `json:"response_teams"`
	
	// Timestamps
	CreatedAt     time.Time                 `json:"created_at"`
	AcknowledgedAt *time.Time               `json:"acknowledged_at,omitempty"`
}

const (
	SessionTypeEmergency   = "emergency"
	SessionTypeMonitoring  = "monitoring"
	SessionTypeCheckIn     = "check_in"
	
	SessionStatusActive    = "active"
	SessionStatusPaused    = "paused"
	SessionStatusCompleted = "completed"
	SessionStatusExpired   = "expired"
	
	AlertTypeGeofence      = "geofence"
	AlertTypeStationery    = "stationary"
	AlertTypeMovement      = "movement"
	AlertTypeEmergencyZone = "emergency_zone"
	AlertTypeLowAccuracy   = "low_accuracy"
)

// NewTrackerService creates a new location tracking service
func NewTrackerService(redisClient *database.RedisClient, logger *logrus.Logger) *TrackerService {
	return &TrackerService{
		redisClient:       redisClient,
		logger:           logger,
		activeSessions:   make(map[string]*TrackingSession),
		accuracyThreshold: 50.0,        // 50 meters
		updateInterval:   30 * time.Second,
		geoFenceRadius:   1000.0,       // 1 km
		emergencyZones:   []EmergencyZone{},
		responderEndpoints: []ResponderEndpoint{},
	}
}

// StartTracking starts a new location tracking session
func (ts *TrackerService) StartTracking(ctx context.Context, userID, crisisID string, sessionType string, config *TrackingConfig) (*TrackingSession, error) {
	ts.sessionsMutex.Lock()
	defer ts.sessionsMutex.Unlock()
	
	sessionID := generateSessionID(userID, crisisID)
	sessionCtx, cancel := context.WithCancel(ctx)
	
	// Set default configuration if not provided
	if config == nil {
		config = &TrackingConfig{
			UpdateInterval:   ts.updateInterval,
			AccuracyRequired: ts.accuracyThreshold,
			MaxDuration:      2 * time.Hour,
		}
	}
	
	session := &TrackingSession{
		ID:               sessionID,
		UserID:           userID,
		CrisisID:         &crisisID,
		SessionType:      sessionType,
		Status:           SessionStatusActive,
		LocationHistory:  []LocationPoint{},
		UpdateInterval:   config.UpdateInterval,
		AccuracyRequired: config.AccuracyRequired,
		MaxDuration:      config.MaxDuration,
		EmergencyContacts: config.EmergencyContacts,
		StartedAt:        time.Now(),
		ExpiresAt:        time.Now().Add(config.MaxDuration),
		ctx:              sessionCtx,
		cancel:           cancel,
		service:          ts,
	}
	
	ts.activeSessions[sessionID] = session
	
	ts.logger.WithFields(logrus.Fields{
		"session_id":   sessionID,
		"user_id":      userID,
		"crisis_id":    crisisID,
		"session_type": sessionType,
	}).Info("Started location tracking session")
	
	// Start the tracking loop
	go session.trackingLoop()
	
	return session, nil
}

// TrackingConfig represents configuration for tracking session
type TrackingConfig struct {
	UpdateInterval    time.Duration      `json:"update_interval"`
	AccuracyRequired  float64           `json:"accuracy_required"`
	MaxDuration       time.Duration     `json:"max_duration"`
	EmergencyContacts []EmergencyContact `json:"emergency_contacts"`
	AlertOnGeofence   bool              `json:"alert_on_geofence"`
	AlertOnStationary bool              `json:"alert_on_stationary"`
}

// UpdateLocation updates the current location for a tracking session
func (ts *TrackerService) UpdateLocation(sessionID string, location *LocationPoint) error {
	ts.sessionsMutex.RLock()
	session, exists := ts.activeSessions[sessionID]
	ts.sessionsMutex.RUnlock()
	
	if !exists {
		return fmt.Errorf("tracking session not found: %s", sessionID)
	}
	
	if session.Status != SessionStatusActive {
		return fmt.Errorf("tracking session is not active")
	}
	
	// Validate location accuracy
	if location.Accuracy > session.AccuracyRequired {
		ts.logger.WithFields(logrus.Fields{
			"session_id": sessionID,
			"accuracy":   location.Accuracy,
			"required":   session.AccuracyRequired,
		}).Warn("Location accuracy below threshold")
		
		// Generate low accuracy alert
		alert := &LocationAlert{
			ID:        generateAlertID(),
			UserID:    session.UserID,
			CrisisID:  session.CrisisID,
			AlertType: AlertTypeLowAccuracy,
			Location:  *location,
			Message:   fmt.Sprintf("Location accuracy %.1fm is below required %.1fm", location.Accuracy, session.AccuracyRequired),
			Severity:  2,
			Confidence: 0.9,
			ResponseRequired: false,
			CreatedAt: time.Now(),
		}
		
		if session.alertCallback != nil {
			session.alertCallback(alert)
		}
	}
	
	// Update session location data
	session.CurrentLocation = location
	session.LocationHistory = append(session.LocationHistory, *location)
	session.LastUpdate = time.Now()
	
	// Limit history size to prevent memory issues
	if len(session.LocationHistory) > 1000 {
		session.LocationHistory = session.LocationHistory[len(session.LocationHistory)-1000:]
	}
	
	// Store in Redis for real-time access
	ts.redisClient.UpdateUserLocation(context.Background(), session.UserID, &database.LocationData{
		Latitude:  location.Latitude,
		Longitude: location.Longitude,
		Accuracy:  location.Accuracy,
		Timestamp: location.Timestamp,
	})
	
	// Check for emergency zones
	ts.checkEmergencyZones(session, location)
	
	// Check for geofence violations
	ts.checkGeofenceViolations(session, location)
	
	// Execute update callback
	if session.updateCallback != nil {
		session.updateCallback(location)
	}
	
	ts.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"latitude":   location.Latitude,
		"longitude":  location.Longitude,
		"accuracy":   location.Accuracy,
		"source":     location.Source,
	}).Debug("Location updated")
	
	return nil
}

// trackingLoop runs the continuous tracking for a session
func (ts *TrackingSession) trackingLoop() {
	ticker := time.NewTicker(ts.UpdateInterval)
	defer ticker.Stop()
	
	for {
		select {
		case <-ts.ctx.Done():
			ts.service.logger.WithField("session_id", ts.ID).Info("Tracking loop cancelled")
			return
			
		case <-ticker.C:
			// Check if session has expired
			if time.Now().After(ts.ExpiresAt) {
				ts.service.logger.WithField("session_id", ts.ID).Info("Tracking session expired")
				ts.Status = SessionStatusExpired
				ts.service.StopTracking(ts.ID)
				return
			}
			
			// Check for stale location data
			if time.Since(ts.LastUpdate) > 5*ts.UpdateInterval {
				ts.service.logger.WithField("session_id", ts.ID).Warn("Location updates are stale")
				
				// Generate stationary alert if configured
				alert := &LocationAlert{
					ID:        generateAlertID(),
					UserID:    ts.UserID,
					CrisisID:  ts.CrisisID,
					AlertType: AlertTypeStationery,
					Message:   "No location updates received for extended period",
					Severity:  3,
					Confidence: 0.8,
					ResponseRequired: true,
					CreatedAt: time.Now(),
				}
				
				if ts.CurrentLocation != nil {
					alert.Location = *ts.CurrentLocation
				}
				
				if ts.alertCallback != nil {
					ts.alertCallback(alert)
				}
			}
		}
	}
}

// checkEmergencyZones checks if the current location is within any emergency zones
func (ts *TrackerService) checkEmergencyZones(session *TrackingSession, location *LocationPoint) {
	for _, zone := range ts.emergencyZones {
		if !zone.IsActive {
			continue
		}
		
		distance := calculateDistance(location.Latitude, location.Longitude, zone.Center.Latitude, zone.Center.Longitude)
		
		if distance <= zone.Radius {
			ts.logger.WithFields(logrus.Fields{
				"session_id": session.ID,
				"zone_id":    zone.ID,
				"zone_name":  zone.Name,
				"distance":   distance,
			}).Info("User entered emergency zone")
			
			// Generate emergency zone alert
			alert := &LocationAlert{
				ID:        generateAlertID(),
				UserID:    session.UserID,
				CrisisID:  session.CrisisID,
				AlertType: AlertTypeEmergencyZone,
				Location:  *location,
				Zone:      &zone,
				Message:   fmt.Sprintf("User entered %s emergency zone", zone.Name),
				Severity:  4,
				Confidence: 1.0,
				ResponseRequired: true,
				ResponseTeams: []string{zone.ResponseTeam},
				CreatedAt: time.Now(),
			}
			
			if session.alertCallback != nil {
				session.alertCallback(alert)
			}
			
			// Auto-dispatch if it's a crisis session
			if session.SessionType == SessionTypeEmergency && !session.ResponderAlerted {
				ts.dispatchEmergencyResponse(session, &zone, location)
			}
		}
	}
}

// checkGeofenceViolations checks for geofence violations
func (ts *TrackerService) checkGeofenceViolations(session *TrackingSession, location *LocationPoint) {
	// This would implement custom geofence logic based on user's safety plan
	// For now, we'll implement a simple example
	
	if len(session.LocationHistory) < 2 {
		return
	}
	
	previousLocation := session.LocationHistory[len(session.LocationHistory)-2]
	distance := calculateDistance(
		location.Latitude, location.Longitude,
		previousLocation.Latitude, previousLocation.Longitude,
	)
	
	// Check for rapid movement (potential danger)
	timeDiff := location.Timestamp.Sub(previousLocation.Timestamp).Minutes()
	if timeDiff > 0 {
		speed := (distance * 60) / timeDiff // km/h
		
		if speed > 120 { // Faster than 120 km/h
			alert := &LocationAlert{
				ID:        generateAlertID(),
				UserID:    session.UserID,
				CrisisID:  session.CrisisID,
				AlertType: AlertTypeMovement,
				Location:  *location,
				Message:   fmt.Sprintf("Rapid movement detected: %.1f km/h", speed),
				Severity:  3,
				Confidence: 0.7,
				ResponseRequired: true,
				CreatedAt: time.Now(),
			}
			
			if session.alertCallback != nil {
				session.alertCallback(alert)
			}
		}
	}
}

// dispatchEmergencyResponse dispatches emergency responders to a location
func (ts *TrackerService) dispatchEmergencyResponse(session *TrackingSession, zone *EmergencyZone, location *LocationPoint) error {
	if session.ResponderAlerted {
		return nil // Already dispatched
	}
	
	ts.logger.WithFields(logrus.Fields{
		"session_id": session.ID,
		"zone_id":    zone.ID,
		"latitude":   location.Latitude,
		"longitude":  location.Longitude,
	}).Critical("Dispatching emergency response")
	
	// Mark as alerted to prevent duplicate dispatches
	session.ResponderAlerted = true
	
	// Create response team
	responseTeam := &ResponseTeam{
		ID:           generateResponseTeamID(),
		Name:         zone.ResponseTeam,
		Type:         zone.Type,
		Status:       "dispatched",
		ContactPhone: zone.ContactInfo.Phone,
		DispatchedAt: time.Now(),
	}
	
	session.ResponseTeam = responseTeam
	
	// Send alerts to configured responder endpoints
	for _, endpoint := range ts.responderEndpoints {
		if !endpoint.IsActive {
			continue
		}
		
		dispatchData := map[string]interface{}{
			"emergency_type": "mental_health_crisis",
			"location": map[string]interface{}{
				"latitude":  location.Latitude,
				"longitude": location.Longitude,
				"accuracy":  location.Accuracy,
				"address":   location.Address,
			},
			"user_info": map[string]interface{}{
				"user_id": session.UserID,
				"crisis_id": session.CrisisID,
			},
			"response_team": responseTeam,
			"zone_info":    zone,
			"timestamp":    time.Now().Format(time.RFC3339),
		}
		
		if err := ts.sendDispatchAlert(endpoint, dispatchData); err != nil {
			ts.logger.WithError(err).WithField("endpoint", endpoint.Name).Error("Failed to send dispatch alert")
		}
	}
	
	return nil
}

// sendDispatchAlert sends a dispatch alert to an emergency responder endpoint
func (ts *TrackerService) sendDispatchAlert(endpoint ResponderEndpoint, data map[string]interface{}) error {
	// This would send HTTP requests to emergency dispatch systems
	// Implementation depends on the specific protocol used by each system
	
	ts.logger.WithFields(logrus.Fields{
		"endpoint": endpoint.Name,
		"type":     endpoint.Type,
		"url":      endpoint.URL,
	}).Info("Sending dispatch alert to emergency responder")
	
	// In a real implementation, this would make HTTP requests to dispatch systems
	// For now, we'll just log the dispatch
	
	return nil
}

// StopTracking stops a location tracking session
func (ts *TrackerService) StopTracking(sessionID string) error {
	ts.sessionsMutex.Lock()
	defer ts.sessionsMutex.Unlock()
	
	session, exists := ts.activeSessions[sessionID]
	if !exists {
		return fmt.Errorf("tracking session not found: %s", sessionID)
	}
	
	session.Status = SessionStatusCompleted
	session.cancel()
	delete(ts.activeSessions, sessionID)
	
	ts.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"duration":   time.Since(session.StartedAt),
		"locations":  len(session.LocationHistory),
	}).Info("Stopped location tracking session")
	
	return nil
}

// GetActiveSession returns an active tracking session
func (ts *TrackerService) GetActiveSession(sessionID string) (*TrackingSession, error) {
	ts.sessionsMutex.RLock()
	defer ts.sessionsMutex.RUnlock()
	
	session, exists := ts.activeSessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("tracking session not found: %s", sessionID)
	}
	
	return session, nil
}

// GetUserActiveSessions returns all active sessions for a user
func (ts *TrackerService) GetUserActiveSessions(userID string) []*TrackingSession {
	ts.sessionsMutex.RLock()
	defer ts.sessionsMutex.RUnlock()
	
	var sessions []*TrackingSession
	for _, session := range ts.activeSessions {
		if session.UserID == userID {
			sessions = append(sessions, session)
		}
	}
	
	return sessions
}

// Helper functions

// calculateDistance calculates the distance between two GPS points in meters
func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000 // Earth's radius in meters
	
	φ1 := lat1 * math.Pi / 180
	φ2 := lat2 * math.Pi / 180
	Δφ := (lat2 - lat1) * math.Pi / 180
	Δλ := (lon2 - lon1) * math.Pi / 180
	
	a := math.Sin(Δφ/2)*math.Sin(Δφ/2) + math.Cos(φ1)*math.Cos(φ2)*math.Sin(Δλ/2)*math.Sin(Δλ/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	
	return R * c
}

// generateSessionID generates a unique session ID
func generateSessionID(userID, crisisID string) string {
	return fmt.Sprintf("track_%s_%s_%d", userID, crisisID, time.Now().UnixNano())
}

// generateAlertID generates a unique alert ID
func generateAlertID() string {
	return fmt.Sprintf("alert_%d", time.Now().UnixNano())
}

// generateResponseTeamID generates a unique response team ID
func generateResponseTeamID() string {
	return fmt.Sprintf("team_%d", time.Now().UnixNano())
}
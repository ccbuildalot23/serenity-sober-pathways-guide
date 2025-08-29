package crisis

import (
	"time"

	"github.com/google/uuid"
)

// Crisis represents a crisis event
type Crisis struct {
	ID               uuid.UUID                `json:"id" db:"id"`
	UserID           uuid.UUID                `json:"user_id" db:"user_id"`
	EventType        string                   `json:"event_type" db:"event_type"`
	SeverityLevel    int                      `json:"severity_level" db:"severity_level"`
	Status           string                   `json:"status" db:"status"`
	
	// Location data
	LocationLat      *float64                 `json:"location_lat,omitempty" db:"location_lat"`
	LocationLng      *float64                 `json:"location_lng,omitempty" db:"location_lng"`
	LocationAccuracy *float64                 `json:"location_accuracy,omitempty" db:"location_accuracy"`
	LocationTimestamp *time.Time              `json:"location_timestamp,omitempty" db:"location_timestamp"`
	
	// Voice detection data
	VoiceConfidenceScore *float64             `json:"voice_confidence_score,omitempty" db:"voice_confidence_score"`
	VoiceTranscript      *string              `json:"voice_transcript,omitempty" db:"voice_transcript"`
	VoiceAudioURL        *string              `json:"voice_audio_url,omitempty" db:"voice_audio_url"`
	
	// Pattern detection data
	PatternIndicators      map[string]interface{} `json:"pattern_indicators,omitempty" db:"pattern_indicators"`
	PatternConfidenceScore *float64               `json:"pattern_confidence_score,omitempty" db:"pattern_confidence_score"`
	
	// Crisis context
	ContextData           map[string]interface{} `json:"context_data,omitempty" db:"context_data"`
	UserReportedDetails   *string                `json:"user_reported_details,omitempty" db:"user_reported_details"`
	
	// Timestamps
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
	ResolvedAt   *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
	
	// HIPAA audit fields
	CreatedBy      *uuid.UUID                `json:"created_by,omitempty" db:"created_by"`
	LastModifiedBy *uuid.UUID                `json:"last_modified_by,omitempty" db:"last_modified_by"`
	AccessLog      []map[string]interface{}  `json:"access_log,omitempty" db:"access_log"`
}

// EmergencyContact represents an emergency contact
type EmergencyContact struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	UserID       uuid.UUID  `json:"user_id" db:"user_id"`
	ContactType  string     `json:"contact_type" db:"contact_type"`
	PriorityOrder int       `json:"priority_order" db:"priority_order"`
	
	// Contact information
	Name         string     `json:"name" db:"name"`
	PhoneNumber  *string    `json:"phone_number,omitempty" db:"phone_number"`
	Email        *string    `json:"email,omitempty" db:"email"`
	Relationship *string    `json:"relationship,omitempty" db:"relationship"`
	
	// Notification preferences
	PreferredMethod           string                    `json:"preferred_method" db:"preferred_method"`
	NotificationDelayMinutes  int                       `json:"notification_delay_minutes" db:"notification_delay_minutes"`
	
	// Availability
	Timezone        string                    `json:"timezone" db:"timezone"`
	AvailableHours  map[string]interface{}    `json:"available_hours,omitempty" db:"available_hours"`
	
	// Response tracking
	LastContactedAt         *time.Time `json:"last_contacted_at,omitempty" db:"last_contacted_at"`
	ResponseRate           float64    `json:"response_rate" db:"response_rate"`
	AverageResponseTimeMin int        `json:"average_response_time_minutes" db:"average_response_time_minutes"`
	
	// Status
	IsActive   bool `json:"is_active" db:"is_active"`
	IsVerified bool `json:"is_verified" db:"is_verified"`
	
	// Timestamps
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// EscalationLog represents an escalation event
type EscalationLog struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	CrisisEventID    uuid.UUID  `json:"crisis_event_id" db:"crisis_event_id"`
	EscalationLevel  int        `json:"escalation_level" db:"escalation_level"`
	EscalationType   string     `json:"escalation_type" db:"escalation_type"`
	
	// Target information
	TargetContactID *uuid.UUID `json:"target_contact_id,omitempty" db:"target_contact_id"`
	TargetService   *string    `json:"target_service,omitempty" db:"target_service"`
	
	// Escalation details
	TriggeredBy      string                    `json:"triggered_by" db:"triggered_by"`
	TriggerReason    *string                   `json:"trigger_reason,omitempty" db:"trigger_reason"`
	EscalationData   map[string]interface{}    `json:"escalation_data,omitempty" db:"escalation_data"`
	
	// Response tracking
	NotificationSentAt        *time.Time `json:"notification_sent_at,omitempty" db:"notification_sent_at"`
	AcknowledgmentReceivedAt  *time.Time `json:"acknowledgment_received_at,omitempty" db:"acknowledgment_received_at"`
	ResponseReceivedAt        *time.Time `json:"response_received_at,omitempty" db:"response_received_at"`
	ResolutionStatus          string     `json:"resolution_status" db:"resolution_status"`
	
	// Timestamp
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// InterventionSession represents a crisis intervention session
type InterventionSession struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	CrisisEventID     uuid.UUID  `json:"crisis_event_id" db:"crisis_event_id"`
	SessionType       string     `json:"session_type" db:"session_type"`
	
	// Intervention details
	InterventionProtocol string                    `json:"intervention_protocol" db:"intervention_protocol"`
	InterventionSteps    []map[string]interface{}  `json:"intervention_steps" db:"intervention_steps"`
	CurrentStep          int                       `json:"current_step" db:"current_step"`
	
	// Participant information
	ParticipantUserID uuid.UUID  `json:"participant_user_id" db:"participant_user_id"`
	FacilitatorID     *uuid.UUID `json:"facilitator_id,omitempty" db:"facilitator_id"`
	FacilitatorType   *string    `json:"facilitator_type,omitempty" db:"facilitator_type"`
	
	// Session data
	SessionTranscript              []map[string]interface{} `json:"session_transcript,omitempty" db:"session_transcript"`
	AssessmentScores              map[string]interface{}   `json:"assessment_scores,omitempty" db:"assessment_scores"`
	InterventionEffectivenessScore *float64                 `json:"intervention_effectiveness_score,omitempty" db:"intervention_effectiveness_score"`
	
	// Status
	Status           string  `json:"status" db:"status"`
	CompletionReason *string `json:"completion_reason,omitempty" db:"completion_reason"`
	
	// Timestamps
	StartedAt *time.Time `json:"started_at,omitempty" db:"started_at"`
	EndedAt   *time.Time `json:"ended_at,omitempty" db:"ended_at"`
}

// FollowupTask represents a follow-up task after a crisis
type FollowupTask struct {
	ID            uuid.UUID `json:"id" db:"id"`
	CrisisEventID uuid.UUID `json:"crisis_event_id" db:"crisis_event_id"`
	TaskType      string    `json:"task_type" db:"task_type"`
	
	// Task details
	Title         string `json:"title" db:"title"`
	Description   *string `json:"description,omitempty" db:"description"`
	PriorityLevel int     `json:"priority_level" db:"priority_level"`
	
	// Scheduling
	ScheduledFor       time.Time `json:"scheduled_for" db:"scheduled_for"`
	ReminderIntervals  []int     `json:"reminder_intervals" db:"reminder_intervals"`
	
	// Assignment
	AssignedToUserID    *uuid.UUID `json:"assigned_to_user_id,omitempty" db:"assigned_to_user_id"`
	AssignedToContactID *uuid.UUID `json:"assigned_to_contact_id,omitempty" db:"assigned_to_contact_id"`
	AssignedToRole      *string    `json:"assigned_to_role,omitempty" db:"assigned_to_role"`
	
	// Status tracking
	Status          string                   `json:"status" db:"status"`
	CompletionNotes *string                  `json:"completion_notes,omitempty" db:"completion_notes"`
	CompletionData  map[string]interface{}   `json:"completion_data,omitempty" db:"completion_data"`
	
	// Timestamps
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty" db:"completed_at"`
}

// ConsensusDecision represents a Byzantine fault-tolerant consensus decision
type ConsensusDecision struct {
	ID           uuid.UUID `json:"id" db:"id"`
	CrisisEventID uuid.UUID `json:"crisis_event_id" db:"crisis_event_id"`
	DecisionType  string    `json:"decision_type" db:"decision_type"`
	
	// Consensus data
	NodeVotes           map[string]interface{} `json:"node_votes" db:"node_votes"`
	ConsensusReached    bool                   `json:"consensus_reached" db:"consensus_reached"`
	ConsensusResult     *string                `json:"consensus_result,omitempty" db:"consensus_result"`
	ConsensusConfidence *float64               `json:"consensus_confidence,omitempty" db:"consensus_confidence"`
	
	// Timing
	DecisionDeadline    time.Time  `json:"decision_deadline" db:"decision_deadline"`
	ConsensusReachedAt  *time.Time `json:"consensus_reached_at,omitempty" db:"consensus_reached_at"`
	
	// Byzantine fault tolerance
	ByzantineNodesDetected []map[string]interface{} `json:"byzantine_nodes_detected" db:"byzantine_nodes_detected"`
	FaultToleranceLevel    int                      `json:"fault_tolerance_level" db:"fault_tolerance_level"`
	
	// Timestamp
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// User represents a simplified user for crisis service
type User struct {
	ID    uuid.UUID `json:"id" db:"id"`
	Email string    `json:"email" db:"email"`
	Phone *string   `json:"phone,omitempty" db:"phone"`
	
	// Profile information
	FirstName   *string    `json:"first_name,omitempty" db:"first_name"`
	LastName    *string    `json:"last_name,omitempty" db:"last_name"`
	DateOfBirth *time.Time `json:"date_of_birth,omitempty" db:"date_of_birth"`
	
	// Crisis-specific preferences
	CrisisPreferences   map[string]interface{} `json:"crisis_preferences" db:"crisis_preferences"`
	EmergencyProtocol   map[string]interface{} `json:"emergency_protocol" db:"emergency_protocol"`
	SafetyPlan         map[string]interface{} `json:"safety_plan" db:"safety_plan"`
	
	// Risk assessment data
	RiskLevel              string                 `json:"risk_level" db:"risk_level"`
	RiskFactors           []map[string]interface{} `json:"risk_factors" db:"risk_factors"`
	ProtectiveFactors     []map[string]interface{} `json:"protective_factors" db:"protective_factors"`
	LastRiskAssessmentDate *time.Time             `json:"last_risk_assessment_date,omitempty" db:"last_risk_assessment_date"`
	
	// Consent and privacy
	CrisisServiceConsent     bool `json:"crisis_service_consent" db:"crisis_service_consent"`
	EmergencyContactConsent  bool `json:"emergency_contact_consent" db:"emergency_contact_consent"`
	LocationSharingConsent   bool `json:"location_sharing_consent" db:"location_sharing_consent"`
	VoiceMonitoringConsent   bool `json:"voice_monitoring_consent" db:"voice_monitoring_consent"`
	
	// Status
	IsActive   bool `json:"is_active" db:"is_active"`
	IsVerified bool `json:"is_verified" db:"is_verified"`
	
	// Timestamps
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
	LastLoginAt   *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
	
	// HIPAA compliance
	PHIAccessLog    []map[string]interface{} `json:"phi_access_log" db:"phi_access_log"`
	ConsentHistory  []map[string]interface{} `json:"consent_history" db:"consent_history"`
}

// Constants for crisis event types
const (
	EventTypeManual           = "manual"
	EventTypeVoiceDetected    = "voice_detected"
	EventTypePatternDetected  = "pattern_detected"
	EventTypeEscalated        = "escalated"
)

// Constants for crisis status
const (
	StatusActive        = "active"
	StatusAcknowledged  = "acknowledged"
	StatusResolved      = "resolved"
	StatusEscalated     = "escalated"
	StatusFalsePositive = "false_positive"
)

// Constants for contact types
const (
	ContactTypePrimary           = "primary"
	ContactTypeSecondary         = "secondary"
	ContactTypeProfessional      = "professional"
	ContactTypeEmergencyServices = "emergency_services"
)

// Constants for escalation types
const (
	EscalationTypeTimeout          = "timeout"
	EscalationTypeSeverityIncrease = "severity_increase"
	EscalationTypeManual          = "manual"
	EscalationTypeConsensus       = "consensus_triggered"
)

// Constants for intervention session types
const (
	SessionTypeAutomated    = "automated"
	SessionTypeHumanGuided  = "human_guided"
	SessionTypePeerSupport  = "peer_support"
	SessionTypeProfessional = "professional"
)

// Constants for follow-up task types
const (
	TaskTypeCheckIn           = "check_in"
	TaskTypeAssessment        = "assessment"
	TaskTypeAppointmentBooking = "appointment_booking"
	TaskTypeResourceReferral   = "resource_referral"
	TaskTypeSafetyPlanUpdate   = "safety_plan_update"
)

// Constants for consensus decision types
const (
	DecisionTypeSeverityAssessment    = "severity_assessment"
	DecisionTypeEscalationTrigger     = "escalation_trigger"
	DecisionTypeInterventionSelection = "intervention_selection"
	DecisionTypeResolutionConfirmation = "resolution_confirmation"
)
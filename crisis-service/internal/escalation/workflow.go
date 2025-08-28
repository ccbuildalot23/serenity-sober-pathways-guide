package escalation

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"serenity/crisis-service/internal/crisis"
	"serenity/crisis-service/internal/database"
	"serenity/crisis-service/internal/notifications"
)

// WorkflowEngine manages emergency contact escalation workflows
type WorkflowEngine struct {
	redisClient      *database.RedisClient
	notificationSvc  *notifications.Service
	logger          *logrus.Logger
	
	// Active escalation workflows
	activeWorkflows  map[string]*WorkflowExecution
	workflowsMutex   sync.RWMutex
	
	// Configuration
	maxConcurrentWorkflows int
	defaultTimeout         time.Duration
	retryAttempts          int
	retryBackoff          time.Duration
}

// WorkflowExecution represents an active escalation workflow
type WorkflowExecution struct {
	ID               string                    `json:"id"`
	CrisisID         string                    `json:"crisis_id"`
	UserID           string                    `json:"user_id"`
	SeverityLevel    int                       `json:"severity_level"`
	Status           string                    `json:"status"`
	
	// Workflow configuration
	EscalationPlan   *EscalationPlan          `json:"escalation_plan"`
	CurrentLevel     int                       `json:"current_level"`
	StartedAt        time.Time                 `json:"started_at"`
	NextEscalation   *time.Time                `json:"next_escalation,omitempty"`
	
	// Progress tracking
	ContactedContacts []ContactAttempt         `json:"contacted_contacts"`
	SuccessfulContacts []ContactAttempt        `json:"successful_contacts"`
	FailedContacts    []ContactAttempt         `json:"failed_contacts"`
	
	// Workflow control
	ctx              context.Context
	cancel           context.CancelFunc
	doneChan         chan bool
	
	// Dependencies
	engine           *WorkflowEngine
}

// EscalationPlan defines the escalation strategy
type EscalationPlan struct {
	ID               string                    `json:"id"`
	UserID           string                    `json:"user_id"`
	Name             string                    `json:"name"`
	Description      string                    `json:"description"`
	
	// Escalation levels
	Levels           []EscalationLevel         `json:"levels"`
	
	// Configuration
	MaxParallelContacts    int                 `json:"max_parallel_contacts"`
	ContactTimeout         time.Duration       `json:"contact_timeout"`
	LevelTimeout           time.Duration       `json:"level_timeout"`
	RequireAcknowledgment  bool               `json:"require_acknowledgment"`
	
	// Conditions
	TriggerConditions      []TriggerCondition  `json:"trigger_conditions"`
	ActivationHours        *ScheduleConfig     `json:"activation_hours,omitempty"`
	
	// Metadata
	CreatedAt        time.Time                 `json:"created_at"`
	UpdatedAt        time.Time                 `json:"updated_at"`
	IsActive         bool                      `json:"is_active"`
}

// EscalationLevel represents a level in the escalation plan
type EscalationLevel struct {
	Level            int                       `json:"level"`
	Name             string                    `json:"name"`
	Description      string                    `json:"description"`
	
	// Contacts at this level
	Contacts         []EscalationContact       `json:"contacts"`
	
	// Level behavior
	ContactMethod    string                    `json:"contact_method"` // parallel, sequential
	RequiredResponses int                      `json:"required_responses"`
	Timeout          time.Duration             `json:"timeout"`
	
	// Conditions to proceed to next level
	EscalationTrigger string                   `json:"escalation_trigger"` // timeout, no_response, explicit
	
	// Actions
	Actions          []LevelAction             `json:"actions"`
}

// EscalationContact represents a contact in an escalation level
type EscalationContact struct {
	ContactID        string                    `json:"contact_id"`
	ContactType      string                    `json:"contact_type"`
	Priority         int                       `json:"priority"`
	
	// Contact details
	Name             string                    `json:"name"`
	PhoneNumber      *string                   `json:"phone_number,omitempty"`
	Email            *string                   `json:"email,omitempty"`
	
	// Notification preferences
	NotificationMethods []string              `json:"notification_methods"`
	DelayMinutes       int                    `json:"delay_minutes"`
	
	// Availability
	AvailableHours   *ScheduleConfig          `json:"available_hours,omitempty"`
	Timezone         string                   `json:"timezone"`
}

// ContactAttempt represents an attempt to contact someone
type ContactAttempt struct {
	ContactID        string                    `json:"contact_id"`
	ContactName      string                    `json:"contact_name"`
	Method           string                    `json:"method"`
	AttemptedAt      time.Time                 `json:"attempted_at"`
	Status           string                    `json:"status"`
	ResponseAt       *time.Time                `json:"response_at,omitempty"`
	ResponseMessage  *string                   `json:"response_message,omitempty"`
	Error            *string                   `json:"error,omitempty"`
	RetryCount       int                       `json:"retry_count"`
}

// LevelAction represents an action to take at an escalation level
type LevelAction struct {
	Type             string                    `json:"type"` // sms, call, email, webhook, emergency_services
	Target           string                    `json:"target"`
	Message          string                    `json:"message"`
	Delay            time.Duration             `json:"delay"`
	Conditions       []ActionCondition         `json:"conditions,omitempty"`
}

// ActionCondition represents a condition for executing an action
type ActionCondition struct {
	Field            string                    `json:"field"`
	Operator         string                    `json:"operator"`
	Value            interface{}               `json:"value"`
}

// TriggerCondition represents a condition for triggering escalation
type TriggerCondition struct {
	SeverityLevel    *int                      `json:"severity_level,omitempty"`
	EventType        *string                   `json:"event_type,omitempty"`
	TimeOfDay        *TimeRange                `json:"time_of_day,omitempty"`
	DayOfWeek        *[]string                 `json:"day_of_week,omitempty"`
	UserLocation     *LocationCondition        `json:"user_location,omitempty"`
}

// ScheduleConfig represents availability schedule
type ScheduleConfig struct {
	Monday    *TimeRange `json:"monday,omitempty"`
	Tuesday   *TimeRange `json:"tuesday,omitempty"`
	Wednesday *TimeRange `json:"wednesday,omitempty"`
	Thursday  *TimeRange `json:"thursday,omitempty"`
	Friday    *TimeRange `json:"friday,omitempty"`
	Saturday  *TimeRange `json:"saturday,omitempty"`
	Sunday    *TimeRange `json:"sunday,omitempty"`
}

// TimeRange represents a time range
type TimeRange struct {
	Start string `json:"start"` // HH:MM format
	End   string `json:"end"`   // HH:MM format
}

// LocationCondition represents a location-based condition
type LocationCondition struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Radius    float64 `json:"radius"` // in kilometers
}

const (
	WorkflowStatusActive     = "active"
	WorkflowStatusCompleted  = "completed"
	WorkflowStatusFailed     = "failed"
	WorkflowStatusCancelled  = "cancelled"
	WorkflowStatusTimeout    = "timeout"
	
	ContactStatusPending     = "pending"
	ContactStatusSent        = "sent"
	ContactStatusDelivered   = "delivered"
	ContactStatusRead        = "read"
	ContactStatusResponded   = "responded"
	ContactStatusFailed      = "failed"
	ContactStatusTimeout     = "timeout"
)

// NewWorkflowEngine creates a new escalation workflow engine
func NewWorkflowEngine(
	redisClient *database.RedisClient,
	notificationSvc *notifications.Service,
	logger *logrus.Logger,
) *WorkflowEngine {
	return &WorkflowEngine{
		redisClient:            redisClient,
		notificationSvc:        notificationSvc,
		logger:                logger,
		activeWorkflows:        make(map[string]*WorkflowExecution),
		maxConcurrentWorkflows: 1000,
		defaultTimeout:         30 * time.Minute,
		retryAttempts:          3,
		retryBackoff:          5 * time.Second,
	}
}

// StartWorkflow initiates an escalation workflow for a crisis
func (we *WorkflowEngine) StartWorkflow(ctx context.Context, crisisEvent *crisis.Crisis, plan *EscalationPlan) (*WorkflowExecution, error) {
	we.workflowsMutex.Lock()
	defer we.workflowsMutex.Unlock()
	
	// Check if we've reached the maximum concurrent workflows
	if len(we.activeWorkflows) >= we.maxConcurrentWorkflows {
		return nil, fmt.Errorf("maximum concurrent workflows reached")
	}
	
	workflowID := generateWorkflowID(crisisEvent.ID.String())
	workflowCtx, cancel := context.WithCancel(ctx)
	
	execution := &WorkflowExecution{
		ID:               workflowID,
		CrisisID:         crisisEvent.ID.String(),
		UserID:           crisisEvent.UserID.String(),
		SeverityLevel:    crisisEvent.SeverityLevel,
		Status:           WorkflowStatusActive,
		EscalationPlan:   plan,
		CurrentLevel:     0,
		StartedAt:        time.Now(),
		ContactedContacts: []ContactAttempt{},
		SuccessfulContacts: []ContactAttempt{},
		FailedContacts:    []ContactAttempt{},
		ctx:              workflowCtx,
		cancel:           cancel,
		doneChan:         make(chan bool, 1),
		engine:           we,
	}
	
	we.activeWorkflows[workflowID] = execution
	
	we.logger.WithFields(logrus.Fields{
		"workflow_id":    workflowID,
		"crisis_id":      crisisEvent.ID.String(),
		"user_id":        crisisEvent.UserID.String(),
		"severity_level": crisisEvent.SeverityLevel,
		"plan_id":        plan.ID,
	}).Info("Starting escalation workflow")
	
	// Start the workflow execution in a goroutine
	go execution.execute()
	
	return execution, nil
}

// execute runs the escalation workflow
func (we *WorkflowExecution) execute() {
	defer func() {
		if r := recover(); r != nil {
			we.engine.logger.WithField("workflow_id", we.ID).WithField("panic", r).Error("Workflow execution panicked")
			we.markAsFailed(fmt.Sprintf("Workflow panicked: %v", r))
		}
		we.cleanup()
	}()
	
	we.engine.logger.WithField("workflow_id", we.ID).Info("Executing escalation workflow")
	
	// Execute each escalation level
	for levelIndex, level := range we.EscalationPlan.Levels {
		select {
		case <-we.ctx.Done():
			we.engine.logger.WithField("workflow_id", we.ID).Info("Workflow cancelled")
			we.markAsCancelled()
			return
		default:
		}
		
		we.CurrentLevel = levelIndex
		we.engine.logger.WithFields(logrus.Fields{
			"workflow_id": we.ID,
			"level":       levelIndex,
			"level_name":  level.Name,
		}).Info("Executing escalation level")
		
		// Execute the level
		success, err := we.executeLevel(&level)
		if err != nil {
			we.engine.logger.WithError(err).WithFields(logrus.Fields{
				"workflow_id": we.ID,
				"level":       levelIndex,
			}).Error("Error executing escalation level")
		}
		
		// Check if we have sufficient responses
		if success {
			we.engine.logger.WithFields(logrus.Fields{
				"workflow_id": we.ID,
				"level":       levelIndex,
				"successful_contacts": len(we.SuccessfulContacts),
			}).Info("Escalation workflow completed successfully")
			we.markAsCompleted()
			return
		}
		
		// Check if this is the last level
		if levelIndex == len(we.EscalationPlan.Levels)-1 {
			we.engine.logger.WithField("workflow_id", we.ID).Warn("Reached final escalation level without success")
			we.markAsFailed("All escalation levels exhausted")
			return
		}
	}
}

// executeLevel executes a single escalation level
func (we *WorkflowExecution) executeLevel(level *EscalationLevel) (bool, error) {
	startTime := time.Now()
	
	// Sort contacts by priority
	contacts := make([]EscalationContact, len(level.Contacts))
	copy(contacts, level.Contacts)
	sort.Slice(contacts, func(i, j int) bool {
		return contacts[i].Priority < contacts[j].Priority
	})
	
	// Filter available contacts
	availableContacts := we.filterAvailableContacts(contacts)
	if len(availableContacts) == 0 {
		we.engine.logger.WithFields(logrus.Fields{
			"workflow_id": we.ID,
			"level":       level.Level,
		}).Warn("No available contacts at this level")
		return false, fmt.Errorf("no available contacts")
	}
	
	// Execute level actions first
	for _, action := range level.Actions {
		if err := we.executeAction(&action); err != nil {
			we.engine.logger.WithError(err).WithFields(logrus.Fields{
				"workflow_id": we.ID,
				"action_type": action.Type,
			}).Error("Failed to execute level action")
		}
	}
	
	var wg sync.WaitGroup
	successChan := make(chan ContactAttempt, len(availableContacts))
	errorChan := make(chan error, len(availableContacts))
	
	// Determine contact strategy
	switch level.ContactMethod {
	case "parallel":
		// Contact all contacts in parallel
		for _, contact := range availableContacts {
			wg.Add(1)
			go func(c EscalationContact) {
				defer wg.Done()
				attempt, err := we.contactPerson(&c)
				if err != nil {
					errorChan <- err
					return
				}
				if attempt.Status == ContactStatusResponded {
					successChan <- *attempt
				}
			}(contact)
		}
		
	case "sequential":
		// Contact contacts sequentially until we get enough responses
		for _, contact := range availableContacts {
			if we.hasEnoughResponses(level.RequiredResponses) {
				break
			}
			
			attempt, err := we.contactPerson(&contact)
			if err != nil {
				we.engine.logger.WithError(err).Error("Failed to contact person")
				continue
			}
			
			if attempt.Status == ContactStatusResponded {
				successChan <- *attempt
			}
		}
	}
	
	// Wait for parallel contacts to complete or timeout
	if level.ContactMethod == "parallel" {
		done := make(chan bool)
		go func() {
			wg.Wait()
			done <- true
		}()
		
		select {
		case <-done:
		case <-time.After(level.Timeout):
			we.engine.logger.WithField("workflow_id", we.ID).Warn("Level timeout reached")
		case <-we.ctx.Done():
			return false, fmt.Errorf("workflow cancelled")
		}
	}
	
	// Check results
	successCount := len(successChan)
	close(successChan)
	close(errorChan)
	
	// Process successful contacts
	for attempt := range successChan {
		we.SuccessfulContacts = append(we.SuccessfulContacts, attempt)
	}
	
	levelDuration := time.Since(startTime)
	we.engine.logger.WithFields(logrus.Fields{
		"workflow_id":      we.ID,
		"level":           level.Level,
		"success_count":   successCount,
		"required":        level.RequiredResponses,
		"duration":        levelDuration,
	}).Info("Escalation level completed")
	
	return successCount >= level.RequiredResponses, nil
}

// contactPerson attempts to contact a specific person
func (we *WorkflowExecution) contactPerson(contact *EscalationContact) (*ContactAttempt, error) {
	attempt := &ContactAttempt{
		ContactID:   contact.ContactID,
		ContactName: contact.Name,
		AttemptedAt: time.Now(),
		Status:      ContactStatusPending,
		RetryCount:  0,
	}
	
	we.ContactedContacts = append(we.ContactedContacts, *attempt)
	
	we.engine.logger.WithFields(logrus.Fields{
		"workflow_id":  we.ID,
		"contact_id":   contact.ContactID,
		"contact_name": contact.Name,
	}).Info("Contacting person")
	
	// Try each notification method
	for _, method := range contact.NotificationMethods {
		attempt.Method = method
		
		// Apply delay if specified
		if contact.DelayMinutes > 0 {
			time.Sleep(time.Duration(contact.DelayMinutes) * time.Minute)
		}
		
		var err error
		switch method {
		case "sms":
			if contact.PhoneNumber != nil {
				err = we.sendSMS(*contact.PhoneNumber, we.generateMessage())
			}
		case "call":
			if contact.PhoneNumber != nil {
				err = we.makeCall(*contact.PhoneNumber, we.generateMessage())
			}
		case "email":
			if contact.Email != nil {
				err = we.sendEmail(*contact.Email, we.generateMessage())
			}
		default:
			we.engine.logger.WithField("method", method).Warn("Unknown notification method")
			continue
		}
		
		if err != nil {
			we.engine.logger.WithError(err).WithFields(logrus.Fields{
				"workflow_id": we.ID,
				"contact_id":  contact.ContactID,
				"method":      method,
			}).Error("Failed to send notification")
			
			attempt.Status = ContactStatusFailed
			attempt.Error = &err.Error()
			we.FailedContacts = append(we.FailedContacts, *attempt)
			continue
		}
		
		attempt.Status = ContactStatusSent
		
		// Wait for response or timeout
		responseTimeout := 5 * time.Minute // configurable
		select {
		case <-time.After(responseTimeout):
			attempt.Status = ContactStatusTimeout
		case <-we.ctx.Done():
			attempt.Status = ContactStatusCancelled
			return attempt, fmt.Errorf("workflow cancelled")
		}
		
		break // Try only the first successful method
	}
	
	return attempt, nil
}

// Helper methods for sending notifications
func (we *WorkflowExecution) sendSMS(phoneNumber, message string) error {
	// Use notification service to send SMS
	return we.engine.notificationSvc.SendSMS(we.ctx, phoneNumber, message)
}

func (we *WorkflowExecution) makeCall(phoneNumber, message string) error {
	// Use notification service to make call
	return we.engine.notificationSvc.MakeCall(we.ctx, phoneNumber, message)
}

func (we *WorkflowExecution) sendEmail(email, message string) error {
	// Use notification service to send email
	return we.engine.notificationSvc.SendEmail(we.ctx, email, "Crisis Alert", message)
}

func (we *WorkflowExecution) generateMessage() string {
	return fmt.Sprintf("CRISIS ALERT: User %s requires immediate assistance. Severity: %d. Time: %s. Please respond immediately.",
		we.UserID, we.SeverityLevel, time.Now().Format("15:04:05"))
}

// Helper methods for workflow state management
func (we *WorkflowExecution) markAsCompleted() {
	we.Status = WorkflowStatusCompleted
	we.doneChan <- true
}

func (we *WorkflowExecution) markAsFailed(reason string) {
	we.Status = WorkflowStatusFailed
	we.engine.logger.WithFields(logrus.Fields{
		"workflow_id": we.ID,
		"reason":      reason,
	}).Error("Workflow marked as failed")
	we.doneChan <- true
}

func (we *WorkflowExecution) markAsCancelled() {
	we.Status = WorkflowStatusCancelled
	we.doneChan <- true
}

func (we *WorkflowExecution) cleanup() {
	we.engine.workflowsMutex.Lock()
	defer we.engine.workflowsMutex.Unlock()
	
	delete(we.engine.activeWorkflows, we.ID)
	we.cancel()
	close(we.doneChan)
	
	we.engine.logger.WithField("workflow_id", we.ID).Info("Workflow cleaned up")
}

func (we *WorkflowExecution) filterAvailableContacts(contacts []EscalationContact) []EscalationContact {
	now := time.Now()
	var available []EscalationContact
	
	for _, contact := range contacts {
		if we.isContactAvailable(&contact, now) {
			available = append(available, contact)
		}
	}
	
	return available
}

func (we *WorkflowExecution) isContactAvailable(contact *EscalationContact, now time.Time) bool {
	if contact.AvailableHours == nil {
		return true // Always available if no schedule specified
	}
	
	// Parse timezone
	loc, err := time.LoadLocation(contact.Timezone)
	if err != nil {
		we.engine.logger.WithError(err).Warn("Failed to parse timezone, assuming UTC")
		loc = time.UTC
	}
	
	localTime := now.In(loc)
	weekday := localTime.Weekday()
	timeStr := localTime.Format("15:04")
	
	// Get the time range for the current day
	var timeRange *TimeRange
	switch weekday {
	case time.Monday:
		timeRange = contact.AvailableHours.Monday
	case time.Tuesday:
		timeRange = contact.AvailableHours.Tuesday
	case time.Wednesday:
		timeRange = contact.AvailableHours.Wednesday
	case time.Thursday:
		timeRange = contact.AvailableHours.Thursday
	case time.Friday:
		timeRange = contact.AvailableHours.Friday
	case time.Saturday:
		timeRange = contact.AvailableHours.Saturday
	case time.Sunday:
		timeRange = contact.AvailableHours.Sunday
	}
	
	if timeRange == nil {
		return false // Not available on this day
	}
	
	return timeStr >= timeRange.Start && timeStr <= timeRange.End
}

func (we *WorkflowExecution) hasEnoughResponses(required int) bool {
	return len(we.SuccessfulContacts) >= required
}

func (we *WorkflowExecution) executeAction(action *LevelAction) error {
	we.engine.logger.WithFields(logrus.Fields{
		"workflow_id":  we.ID,
		"action_type":  action.Type,
		"action_target": action.Target,
	}).Info("Executing level action")
	
	// Apply delay if specified
	if action.Delay > 0 {
		time.Sleep(action.Delay)
	}
	
	switch action.Type {
	case "webhook":
		return we.engine.notificationSvc.SendWebhook(we.ctx, action.Target, action.Message)
	case "emergency_services":
		return we.engine.notificationSvc.ContactEmergencyServices(we.ctx, action.Target, action.Message)
	default:
		return fmt.Errorf("unknown action type: %s", action.Type)
	}
}

// Helper function to generate workflow ID
func generateWorkflowID(crisisID string) string {
	return fmt.Sprintf("workflow_%s_%d", crisisID, time.Now().UnixNano())
}

// GetActiveWorkflows returns all currently active workflows
func (we *WorkflowEngine) GetActiveWorkflows() map[string]*WorkflowExecution {
	we.workflowsMutex.RLock()
	defer we.workflowsMutex.RUnlock()
	
	// Return a copy to avoid race conditions
	result := make(map[string]*WorkflowExecution)
	for k, v := range we.activeWorkflows {
		result[k] = v
	}
	
	return result
}

// CancelWorkflow cancels a running workflow
func (we *WorkflowEngine) CancelWorkflow(workflowID string) error {
	we.workflowsMutex.RLock()
	workflow, exists := we.activeWorkflows[workflowID]
	we.workflowsMutex.RUnlock()
	
	if !exists {
		return fmt.Errorf("workflow not found: %s", workflowID)
	}
	
	workflow.cancel()
	
	we.logger.WithField("workflow_id", workflowID).Info("Workflow cancellation requested")
	return nil
}

// Shutdown gracefully shuts down the workflow engine
func (we *WorkflowEngine) Shutdown(ctx context.Context) error {
	we.workflowsMutex.Lock()
	defer we.workflowsMutex.Unlock()
	
	we.logger.WithField("active_workflows", len(we.activeWorkflows)).Info("Shutting down workflow engine")
	
	// Cancel all active workflows
	for _, workflow := range we.activeWorkflows {
		workflow.cancel()
	}
	
	// Wait for workflows to complete or timeout
	done := make(chan bool)
	go func() {
		for len(we.activeWorkflows) > 0 {
			time.Sleep(100 * time.Millisecond)
		}
		done <- true
	}()
	
	select {
	case <-done:
		we.logger.Info("All workflows completed")
	case <-ctx.Done():
		we.logger.Warn("Shutdown timeout reached, forcing cleanup")
		// Force cleanup remaining workflows
		for id := range we.activeWorkflows {
			delete(we.activeWorkflows, id)
		}
	}
	
	return nil
}
package notifications

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
	"github.com/sirupsen/logrus"
	"github.com/twilio/twilio-go"
	twilioApi "github.com/twilio/twilio-go/rest/api/v2010"
	"serenity/crisis-service/config"
)

// Service provides notification capabilities
type Service struct {
	twilioClient   *twilio.RestClient
	sendgridClient *sendgrid.Client
	config         *config.Config
	logger         *logrus.Logger
	
	// HTTP client for webhooks
	httpClient     *http.Client
}

// SMSMessage represents an SMS message
type SMSMessage struct {
	To      string `json:"to"`
	From    string `json:"from"`
	Body    string `json:"body"`
	MediaURL *string `json:"media_url,omitempty"`
}

// EmailMessage represents an email message
type EmailMessage struct {
	To       []string               `json:"to"`
	From     string                 `json:"from"`
	FromName string                 `json:"from_name"`
	Subject  string                 `json:"subject"`
	Body     string                 `json:"body"`
	HTML     *string                `json:"html,omitempty"`
	Template *EmailTemplate         `json:"template,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// EmailTemplate represents an email template
type EmailTemplate struct {
	ID   string                 `json:"id"`
	Data map[string]interface{} `json:"data"`
}

// CallMessage represents a voice call
type CallMessage struct {
	To     string  `json:"to"`
	From   string  `json:"from"`
	URL    *string `json:"url,omitempty"`    // TwiML URL
	TwiML  *string `json:"twiml,omitempty"`  // Inline TwiML
	Record bool    `json:"record"`
}

// WebhookMessage represents a webhook notification
type WebhookMessage struct {
	URL     string                 `json:"url"`
	Method  string                 `json:"method"`
	Headers map[string]string      `json:"headers,omitempty"`
	Body    map[string]interface{} `json:"body"`
	Timeout time.Duration          `json:"timeout"`
}

// NotificationResponse represents the response from sending a notification
type NotificationResponse struct {
	ID        string                 `json:"id"`
	Status    string                 `json:"status"`
	Provider  string                 `json:"provider"`
	SentAt    time.Time              `json:"sent_at"`
	Error     *string                `json:"error,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// EmergencyServiceConfig represents configuration for emergency services
type EmergencyServiceConfig struct {
	Service911URL    string `json:"service_911_url"`
	CrisisHotlineURL string `json:"crisis_hotline_url"`
	LocalEmergencyURL string `json:"local_emergency_url"`
}

// NewService creates a new notification service
func NewService(cfg *config.Config, logger *logrus.Logger) *Service {
	// Initialize Twilio client
	twilioClient := twilio.NewRestClient()
	twilioClient.SetUsername(cfg.Twilio.AccountSID)
	twilioClient.SetPassword(cfg.Twilio.AuthToken)
	
	// Initialize SendGrid client
	sendgridClient := sendgrid.NewSendClient(cfg.SendGrid.APIKey)
	
	// Initialize HTTP client with timeout
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}
	
	return &Service{
		twilioClient:   twilioClient,
		sendgridClient: sendgridClient,
		config:         cfg,
		logger:         logger,
		httpClient:     httpClient,
	}
}

// SendSMS sends an SMS message
func (s *Service) SendSMS(ctx context.Context, to, body string) error {
	message := &SMSMessage{
		To:   to,
		From: s.config.Twilio.FromNumber,
		Body: body,
	}
	
	return s.SendSMSMessage(ctx, message)
}

// SendSMSMessage sends an SMS message with full configuration
func (s *Service) SendSMSMessage(ctx context.Context, message *SMSMessage) error {
	startTime := time.Now()
	
	s.logger.WithFields(logrus.Fields{
		"to":   message.To,
		"from": message.From,
		"body_length": len(message.Body),
	}).Info("Sending SMS message")
	
	params := &twilioApi.CreateMessageParams{}
	params.SetTo(message.To)
	params.SetFrom(message.From)
	params.SetBody(message.Body)
	
	if message.MediaURL != nil {
		params.SetMediaUrl([]string{*message.MediaURL})
	}
	
	// Add status callback if configured
	if s.config.Twilio.StatusCallback != "" {
		params.SetStatusCallback(s.config.Twilio.StatusCallback)
	}
	
	resp, err := s.twilioClient.Api.CreateMessage(params)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"to":       message.To,
			"duration": time.Since(startTime),
		}).Error("Failed to send SMS message")
		return fmt.Errorf("failed to send SMS: %w", err)
	}
	
	s.logger.WithFields(logrus.Fields{
		"to":         message.To,
		"message_id": *resp.Sid,
		"status":     *resp.Status,
		"duration":   time.Since(startTime),
	}).Info("SMS message sent successfully")
	
	return nil
}

// MakeCall makes a voice call
func (s *Service) MakeCall(ctx context.Context, to, message string) error {
	// Generate TwiML for the message
	twiml := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">%s</Say>
    <Gather action="/voice/response" method="POST" numDigits="1" timeout="10">
        <Say voice="alice">Press 1 to acknowledge this crisis alert, or press 2 for more information.</Say>
    </Gather>
    <Say voice="alice">No response received. This call will now end.</Say>
</Response>`, strings.ReplaceAll(message, `"`, "&quot;"))
	
	callMessage := &CallMessage{
		To:     to,
		From:   s.config.Twilio.FromNumber,
		TwiML:  &twiml,
		Record: true,
	}
	
	return s.MakeCallWithTwiML(ctx, callMessage)
}

// MakeCallWithTwiML makes a voice call with custom TwiML
func (s *Service) MakeCallWithTwiML(ctx context.Context, call *CallMessage) error {
	startTime := time.Now()
	
	s.logger.WithFields(logrus.Fields{
		"to":     call.To,
		"from":   call.From,
		"record": call.Record,
	}).Info("Making voice call")
	
	params := &twilioApi.CreateCallParams{}
	params.SetTo(call.To)
	params.SetFrom(call.From)
	
	if call.URL != nil {
		params.SetUrl(*call.URL)
	} else if call.TwiML != nil {
		params.SetTwiml(*call.TwiML)
	} else {
		return fmt.Errorf("either URL or TwiML must be specified")
	}
	
	if call.Record {
		params.SetRecord(true)
	}
	
	// Add status callback if configured
	if s.config.Twilio.StatusCallback != "" {
		params.SetStatusCallbackEvent([]string{"initiated", "ringing", "answered", "completed"})
		params.SetStatusCallback(s.config.Twilio.StatusCallback)
		params.SetStatusCallbackMethod("POST")
	}
	
	resp, err := s.twilioClient.Api.CreateCall(params)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"to":       call.To,
			"duration": time.Since(startTime),
		}).Error("Failed to make voice call")
		return fmt.Errorf("failed to make call: %w", err)
	}
	
	s.logger.WithFields(logrus.Fields{
		"to":       call.To,
		"call_id":  *resp.Sid,
		"status":   *resp.Status,
		"duration": time.Since(startTime),
	}).Info("Voice call initiated successfully")
	
	return nil
}

// SendEmail sends an email message
func (s *Service) SendEmail(ctx context.Context, to, subject, body string) error {
	message := &EmailMessage{
		To:       []string{to},
		From:     s.config.SendGrid.FromEmail,
		FromName: s.config.SendGrid.FromName,
		Subject:  subject,
		Body:     body,
	}
	
	return s.SendEmailMessage(ctx, message)
}

// SendEmailMessage sends an email message with full configuration
func (s *Service) SendEmailMessage(ctx context.Context, message *EmailMessage) error {
	startTime := time.Now()
	
	s.logger.WithFields(logrus.Fields{
		"to":      strings.Join(message.To, ","),
		"from":    message.From,
		"subject": message.Subject,
	}).Info("Sending email message")
	
	from := mail.NewEmail(message.FromName, message.From)
	subject := message.Subject
	
	var content *mail.Content
	if message.HTML != nil {
		content = mail.NewContent("text/html", *message.HTML)
	} else {
		content = mail.NewContent("text/plain", message.Body)
	}
	
	// Create the email
	var m *mail.SGMailV3
	
	if len(message.To) == 1 {
		to := mail.NewEmail("", message.To[0])
		m = mail.NewSingleEmail(from, subject, to, content)
	} else {
		m = mail.NewV3Mail()
		m.SetFrom(from)
		m.Subject = subject
		
		p := mail.NewPersonalization()
		for _, toEmail := range message.To {
			p.AddTos(mail.NewEmail("", toEmail))
		}
		m.AddPersonalizations(p)
		m.AddContent(content)
	}
	
	// Add template if specified
	if message.Template != nil {
		m.SetTemplateID(message.Template.ID)
		
		// Add template data
		if len(message.Template.Data) > 0 {
			for _, personalization := range m.Personalizations {
				for key, value := range message.Template.Data {
					personalization.SetDynamicTemplateData(key, value)
				}
			}
		}
	}
	
	// Send the email
	response, err := s.sendgridClient.Send(m)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"to":       strings.Join(message.To, ","),
			"duration": time.Since(startTime),
		}).Error("Failed to send email message")
		return fmt.Errorf("failed to send email: %w", err)
	}
	
	if response.StatusCode >= 400 {
		s.logger.WithFields(logrus.Fields{
			"to":           strings.Join(message.To, ","),
			"status_code":  response.StatusCode,
			"response_body": response.Body,
			"duration":     time.Since(startTime),
		}).Error("Email service returned error status")
		return fmt.Errorf("email service error: status %d, body: %s", response.StatusCode, response.Body)
	}
	
	s.logger.WithFields(logrus.Fields{
		"to":           strings.Join(message.To, ","),
		"status_code":  response.StatusCode,
		"duration":     time.Since(startTime),
	}).Info("Email message sent successfully")
	
	return nil
}

// SendWebhook sends a webhook notification
func (s *Service) SendWebhook(ctx context.Context, url, message string) error {
	webhook := &WebhookMessage{
		URL:    url,
		Method: "POST",
		Headers: map[string]string{
			"Content-Type":  "application/json",
			"User-Agent":    "Serenity-Crisis-Service/1.0",
			"X-Crisis-Type": "emergency",
		},
		Body: map[string]interface{}{
			"message":   message,
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "crisis-response",
		},
		Timeout: 10 * time.Second,
	}
	
	return s.SendWebhookMessage(ctx, webhook)
}

// SendWebhookMessage sends a webhook with full configuration
func (s *Service) SendWebhookMessage(ctx context.Context, webhook *WebhookMessage) error {
	startTime := time.Now()
	
	s.logger.WithFields(logrus.Fields{
		"url":    webhook.URL,
		"method": webhook.Method,
	}).Info("Sending webhook notification")
	
	// Create HTTP client with timeout
	client := &http.Client{Timeout: webhook.Timeout}
	
	// Prepare request body
	bodyBytes, err := json.Marshal(webhook.Body)
	if err != nil {
		return fmt.Errorf("failed to marshal webhook body: %w", err)
	}
	
	// Create request
	req, err := http.NewRequestWithContext(ctx, webhook.Method, webhook.URL, strings.NewReader(string(bodyBytes)))
	if err != nil {
		return fmt.Errorf("failed to create webhook request: %w", err)
	}
	
	// Add headers
	for key, value := range webhook.Headers {
		req.Header.Set(key, value)
	}
	
	// Send request
	resp, err := client.Do(req)
	if err != nil {
		s.logger.WithError(err).WithFields(logrus.Fields{
			"url":      webhook.URL,
			"duration": time.Since(startTime),
		}).Error("Failed to send webhook")
		return fmt.Errorf("failed to send webhook: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode >= 400 {
		s.logger.WithFields(logrus.Fields{
			"url":         webhook.URL,
			"status_code": resp.StatusCode,
			"duration":    time.Since(startTime),
		}).Error("Webhook returned error status")
		return fmt.Errorf("webhook error: status %d", resp.StatusCode)
	}
	
	s.logger.WithFields(logrus.Fields{
		"url":         webhook.URL,
		"status_code": resp.StatusCode,
		"duration":    time.Since(startTime),
	}).Info("Webhook sent successfully")
	
	return nil
}

// ContactEmergencyServices contacts emergency services (911, crisis hotlines)
func (s *Service) ContactEmergencyServices(ctx context.Context, serviceType, message string) error {
	s.logger.WithFields(logrus.Fields{
		"service_type": serviceType,
		"message":      message[:min(len(message), 100)],
	}).Critical("Contacting emergency services")
	
	switch serviceType {
	case "911":
		return s.contact911(ctx, message)
	case "crisis_hotline":
		return s.contactCrisisHotline(ctx, message)
	case "mental_health_services":
		return s.contactMentalHealthServices(ctx, message)
	default:
		return fmt.Errorf("unknown emergency service type: %s", serviceType)
	}
}

// contact911 integrates with 911 dispatch systems
func (s *Service) contact911(ctx context.Context, message string) error {
	// In a real implementation, this would integrate with local 911 dispatch systems
	// For now, we'll send to a configured webhook endpoint
	
	webhookURL := "https://emergency-dispatch.local/api/crisis-alert"
	if s.config.Crisis.GPSEnabled {
		// Include GPS coordinates if available
		// Location data would be retrieved from the crisis context
	}
	
	webhook := &WebhookMessage{
		URL:    webhookURL,
		Method: "POST",
		Headers: map[string]string{
			"Content-Type":       "application/json",
			"X-Emergency-Type":   "mental-health-crisis",
			"X-Priority":         "high",
			"Authorization":      "Bearer emergency-services-token",
		},
		Body: map[string]interface{}{
			"emergency_type": "mental_health_crisis",
			"message":        message,
			"timestamp":      time.Now().Format(time.RFC3339),
			"priority":       "high",
			"service":        "serenity-crisis-response",
		},
		Timeout: 5 * time.Second, // Fast timeout for emergency services
	}
	
	return s.SendWebhookMessage(ctx, webhook)
}

// contactCrisisHotline contacts crisis hotlines
func (s *Service) contactCrisisHotline(ctx context.Context, message string) error {
	// National Crisis Lifeline: 988
	// This would typically be a phone call, but for automation we use webhook
	
	hotlineURL := "https://crisis-hotline-api.org/emergency-referral"
	
	webhook := &WebhookMessage{
		URL:    hotlineURL,
		Method: "POST",
		Headers: map[string]string{
			"Content-Type": "application/json",
			"X-Referral-Source": "serenity-app",
		},
		Body: map[string]interface{}{
			"referral_type": "crisis_intervention",
			"message":       message,
			"timestamp":     time.Now().Format(time.RFC3339),
			"urgency":       "immediate",
		},
		Timeout: 10 * time.Second,
	}
	
	return s.SendWebhookMessage(ctx, webhook)
}

// contactMentalHealthServices contacts local mental health services
func (s *Service) contactMentalHealthServices(ctx context.Context, message string) error {
	servicesURL := "https://mental-health-services.local/api/crisis-referral"
	
	webhook := &WebhookMessage{
		URL:    servicesURL,
		Method: "POST",
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
		Body: map[string]interface{}{
			"service_type": "crisis_intervention",
			"message":      message,
			"timestamp":    time.Now().Format(time.RFC3339),
		},
		Timeout: 15 * time.Second,
	}
	
	return s.SendWebhookMessage(ctx, webhook)
}

// BulkSendSMS sends SMS messages to multiple recipients
func (s *Service) BulkSendSMS(ctx context.Context, recipients []string, message string) error {
	s.logger.WithFields(logrus.Fields{
		"recipient_count": len(recipients),
		"message_length":  len(message),
	}).Info("Sending bulk SMS messages")
	
	var errors []error
	for _, recipient := range recipients {
		if err := s.SendSMS(ctx, recipient, message); err != nil {
			s.logger.WithError(err).WithField("recipient", recipient).Error("Failed to send SMS in bulk operation")
			errors = append(errors, fmt.Errorf("failed to send to %s: %w", recipient, err))
		}
	}
	
	if len(errors) > 0 {
		return fmt.Errorf("bulk SMS errors: %v", errors)
	}
	
	return nil
}

// ValidatePhoneNumber validates a phone number format
func (s *Service) ValidatePhoneNumber(phoneNumber string) error {
	// Basic validation - in production, use a proper phone number validation library
	if len(phoneNumber) < 10 {
		return fmt.Errorf("phone number too short")
	}
	
	if !strings.HasPrefix(phoneNumber, "+") && !strings.HasPrefix(phoneNumber, "1") {
		return fmt.Errorf("phone number must include country code")
	}
	
	return nil
}

// ValidateEmail validates an email address format
func (s *Service) ValidateEmail(email string) error {
	if !strings.Contains(email, "@") {
		return fmt.Errorf("invalid email format")
	}
	
	parts := strings.Split(email, "@")
	if len(parts) != 2 || len(parts[0]) == 0 || len(parts[1]) == 0 {
		return fmt.Errorf("invalid email format")
	}
	
	return nil
}

// GetDeliveryStatus gets the delivery status of a message
func (s *Service) GetDeliveryStatus(ctx context.Context, messageID string) (*NotificationResponse, error) {
	// This would typically query the provider's API for message status
	// Implementation depends on the specific provider (Twilio, SendGrid, etc.)
	
	s.logger.WithField("message_id", messageID).Info("Getting delivery status")
	
	// For Twilio SMS
	if strings.HasPrefix(messageID, "SM") {
		message, err := s.twilioClient.Api.FetchMessage(messageID, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch message status: %w", err)
		}
		
		return &NotificationResponse{
			ID:       *message.Sid,
			Status:   *message.Status,
			Provider: "twilio",
			SentAt:   *message.DateSent,
		}, nil
	}
	
	// For other providers, implement similar logic
	return nil, fmt.Errorf("unsupported message ID format")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
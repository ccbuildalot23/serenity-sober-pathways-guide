package crisis

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
	"serenity/crisis-service/internal/database"
)

// DetectionService handles crisis detection and triage
type DetectionService struct {
	redisClient *database.RedisClient
	logger      *logrus.Logger
	
	// ML model configurations (in production, these would be actual ML models)
	voiceModel    *VoiceDetectionModel
	patternModel  *PatternDetectionModel
	triageModel   *TriageModel
}

// VoiceDetectionModel represents voice analysis capabilities
type VoiceDetectionModel struct {
	DistressKeywords    []string
	EmergencyKeywords   []string
	HelpKeywords        []string
	ConfidenceThreshold float64
}

// PatternDetectionModel represents behavioral pattern analysis
type PatternDetectionModel struct {
	RiskFactors          map[string]float64
	ProtectiveFactors    map[string]float64
	TimeWindowMinutes    int
	AlertThreshold       float64
}

// TriageModel represents crisis severity assessment
type TriageModel struct {
	SeverityWeights      map[string]float64
	EscalationThresholds map[int]float64
	ResponseTimeTargets  map[int]time.Duration
}

// DetectionResult represents the result of crisis detection
type DetectionResult struct {
	CrisisDetected    bool                   `json:"crisis_detected"`
	SeverityLevel     int                    `json:"severity_level"`
	ConfidenceScore   float64                `json:"confidence_score"`
	DetectionType     string                 `json:"detection_type"`
	TriggerFactors    []string               `json:"trigger_factors"`
	RecommendedAction string                 `json:"recommended_action"`
	EstimatedResponse time.Duration          `json:"estimated_response"`
	Metadata          map[string]interface{} `json:"metadata"`
}

// VoiceAnalysisInput represents input for voice analysis
type VoiceAnalysisInput struct {
	AudioURL       string                 `json:"audio_url"`
	Transcript     string                 `json:"transcript"`
	UserID         string                 `json:"user_id"`
	Context        map[string]interface{} `json:"context"`
	Timestamp      time.Time              `json:"timestamp"`
}

// PatternAnalysisInput represents input for pattern analysis
type PatternAnalysisInput struct {
	UserID           string                 `json:"user_id"`
	TimeWindowStart  time.Time              `json:"time_window_start"`
	TimeWindowEnd    time.Time              `json:"time_window_end"`
	BehaviorData     map[string]interface{} `json:"behavior_data"`
	HistoricalData   map[string]interface{} `json:"historical_data"`
}

// NewDetectionService creates a new crisis detection service
func NewDetectionService(redisClient *database.RedisClient, logger *logrus.Logger) *DetectionService {
	return &DetectionService{
		redisClient: redisClient,
		logger:      logger,
		voiceModel:  initializeVoiceModel(),
		patternModel: initializePatternModel(),
		triageModel: initializeTriageModel(),
	}
}

// AnalyzeVoice analyzes voice input for crisis indicators
func (ds *DetectionService) AnalyzeVoice(ctx context.Context, input *VoiceAnalysisInput) (*DetectionResult, error) {
	startTime := time.Now()
	
	ds.logger.WithFields(logrus.Fields{
		"user_id":    input.UserID,
		"transcript": input.Transcript[:min(len(input.Transcript), 100)],
	}).Info("Analyzing voice for crisis indicators")

	// Normalize transcript
	transcript := strings.ToLower(strings.TrimSpace(input.Transcript))
	
	if len(transcript) == 0 {
		return &DetectionResult{
			CrisisDetected:  false,
			ConfidenceScore: 0.0,
			DetectionType:   "voice_analysis",
		}, nil
	}

	// Initialize scoring variables
	var (
		distressScore   float64
		emergencyScore  float64
		helpScore      float64
		triggerFactors []string
		severityLevel   int = 1
	)

	// Analyze for distress keywords
	for _, keyword := range ds.voiceModel.DistressKeywords {
		if strings.Contains(transcript, keyword) {
			distressScore += 0.3
			triggerFactors = append(triggerFactors, fmt.Sprintf("distress_keyword:%s", keyword))
		}
	}

	// Analyze for emergency keywords
	for _, keyword := range ds.voiceModel.EmergencyKeywords {
		if strings.Contains(transcript, keyword) {
			emergencyScore += 0.5
			triggerFactors = append(triggerFactors, fmt.Sprintf("emergency_keyword:%s", keyword))
		}
	}

	// Analyze for help keywords
	for _, keyword := range ds.voiceModel.HelpKeywords {
		if strings.Contains(transcript, keyword) {
			helpScore += 0.4
			triggerFactors = append(triggerFactors, fmt.Sprintf("help_keyword:%s", keyword))
		}
	}

	// Calculate overall confidence score
	confidenceScore := emergencyScore + distressScore + helpScore
	if confidenceScore > 1.0 {
		confidenceScore = 1.0
	}

	// Determine crisis detection and severity
	crisisDetected := confidenceScore >= ds.voiceModel.ConfidenceThreshold

	if crisisDetected {
		// Determine severity level
		if emergencyScore > 0.7 {
			severityLevel = 5
		} else if emergencyScore > 0.5 || distressScore > 0.8 {
			severityLevel = 4
		} else if emergencyScore > 0.3 || distressScore > 0.6 || helpScore > 0.7 {
			severityLevel = 3
		} else {
			severityLevel = 2
		}
	}

	// Determine recommended action
	recommendedAction := ds.getRecommendedAction(severityLevel, "voice_analysis")
	estimatedResponse := ds.triageModel.ResponseTimeTargets[severityLevel]

	result := &DetectionResult{
		CrisisDetected:    crisisDetected,
		SeverityLevel:     severityLevel,
		ConfidenceScore:   confidenceScore,
		DetectionType:     "voice_analysis",
		TriggerFactors:    triggerFactors,
		RecommendedAction: recommendedAction,
		EstimatedResponse: estimatedResponse,
		Metadata: map[string]interface{}{
			"transcript_length": len(input.Transcript),
			"distress_score":   distressScore,
			"emergency_score":  emergencyScore,
			"help_score":       helpScore,
			"analysis_time_ms": time.Since(startTime).Milliseconds(),
			"audio_url":        input.AudioURL,
		},
	}

	// Store result in cache for future reference
	if crisisDetected {
		cacheKey := fmt.Sprintf("voice_detection:%s:%d", input.UserID, input.Timestamp.Unix())
		ds.redisClient.Set(ctx, cacheKey, result, 24*time.Hour)
	}

	ds.logger.WithFields(logrus.Fields{
		"user_id":         input.UserID,
		"crisis_detected": crisisDetected,
		"severity_level":  severityLevel,
		"confidence":      confidenceScore,
		"analysis_time":   time.Since(startTime),
	}).Info("Voice analysis completed")

	return result, nil
}

// AnalyzePatterns analyzes behavioral patterns for crisis indicators
func (ds *DetectionService) AnalyzePatterns(ctx context.Context, input *PatternAnalysisInput) (*DetectionResult, error) {
	startTime := time.Now()
	
	ds.logger.WithFields(logrus.Fields{
		"user_id":     input.UserID,
		"time_window": input.TimeWindowEnd.Sub(input.TimeWindowStart),
	}).Info("Analyzing behavioral patterns for crisis indicators")

	// Initialize risk scoring
	var (
		riskScore        float64
		protectiveScore  float64
		triggerFactors   []string
		severityLevel    int = 1
	)

	// Analyze risk factors
	for factor, weight := range ds.patternModel.RiskFactors {
		if value, exists := input.BehaviorData[factor]; exists {
			if floatValue, ok := value.(float64); ok && floatValue > 0 {
				contributionScore := floatValue * weight
				riskScore += contributionScore
				
				if contributionScore > 0.1 { // Only include significant factors
					triggerFactors = append(triggerFactors, fmt.Sprintf("risk_factor:%s:%.2f", factor, contributionScore))
				}
			}
		}
	}

	// Analyze protective factors
	for factor, weight := range ds.patternModel.ProtectiveFactors {
		if value, exists := input.BehaviorData[factor]; exists {
			if floatValue, ok := value.(float64); ok && floatValue > 0 {
				protectiveScore += floatValue * weight
			}
		}
	}

	// Calculate net risk score
	netRiskScore := riskScore - (protectiveScore * 0.5) // Protective factors have 50% weight
	if netRiskScore < 0 {
		netRiskScore = 0
	}

	// Normalize to 0-1 scale
	confidenceScore := math.Min(netRiskScore/10.0, 1.0)

	// Determine crisis detection
	crisisDetected := confidenceScore >= ds.patternModel.AlertThreshold

	if crisisDetected {
		// Determine severity based on net risk score
		switch {
		case confidenceScore >= 0.9:
			severityLevel = 5
		case confidenceScore >= 0.7:
			severityLevel = 4
		case confidenceScore >= 0.5:
			severityLevel = 3
		case confidenceScore >= 0.3:
			severityLevel = 2
		default:
			severityLevel = 1
		}
	}

	// Determine recommended action
	recommendedAction := ds.getRecommendedAction(severityLevel, "pattern_analysis")
	estimatedResponse := ds.triageModel.ResponseTimeTargets[severityLevel]

	result := &DetectionResult{
		CrisisDetected:    crisisDetected,
		SeverityLevel:     severityLevel,
		ConfidenceScore:   confidenceScore,
		DetectionType:     "pattern_analysis",
		TriggerFactors:    triggerFactors,
		RecommendedAction: recommendedAction,
		EstimatedResponse: estimatedResponse,
		Metadata: map[string]interface{}{
			"risk_score":        riskScore,
			"protective_score":  protectiveScore,
			"net_risk_score":    netRiskScore,
			"analysis_time_ms":  time.Since(startTime).Milliseconds(),
			"time_window_hours": input.TimeWindowEnd.Sub(input.TimeWindowStart).Hours(),
		},
	}

	// Store result in cache
	if crisisDetected {
		cacheKey := fmt.Sprintf("pattern_detection:%s:%d", input.UserID, time.Now().Unix())
		ds.redisClient.Set(ctx, cacheKey, result, 24*time.Hour)
	}

	ds.logger.WithFields(logrus.Fields{
		"user_id":         input.UserID,
		"crisis_detected": crisisDetected,
		"severity_level":  severityLevel,
		"confidence":      confidenceScore,
		"risk_score":      riskScore,
		"protective_score": protectiveScore,
		"analysis_time":   time.Since(startTime),
	}).Info("Pattern analysis completed")

	return result, nil
}

// PerformTriage performs comprehensive crisis triage
func (ds *DetectionService) PerformTriage(ctx context.Context, userID string, detectionResults []*DetectionResult) (*DetectionResult, error) {
	if len(detectionResults) == 0 {
		return nil, fmt.Errorf("no detection results provided for triage")
	}

	startTime := time.Now()
	
	ds.logger.WithFields(logrus.Fields{
		"user_id":       userID,
		"result_count":  len(detectionResults),
	}).Info("Performing crisis triage")

	// Initialize triage variables
	var (
		highestSeverity   int
		highestConfidence float64
		combinedFactors   []string
		detectionTypes    []string
		totalWeight       float64
		weightedScore     float64
	)

	// Analyze all detection results
	for _, result := range detectionResults {
		// Track highest values
		if result.SeverityLevel > highestSeverity {
			highestSeverity = result.SeverityLevel
		}
		if result.ConfidenceScore > highestConfidence {
			highestConfidence = result.ConfidenceScore
		}

		// Combine factors
		combinedFactors = append(combinedFactors, result.TriggerFactors...)
		detectionTypes = append(detectionTypes, result.DetectionType)

		// Calculate weighted score
		weight := ds.triageModel.SeverityWeights[result.DetectionType]
		if weight == 0 {
			weight = 1.0 // Default weight
		}
		
		weightedScore += result.ConfidenceScore * weight
		totalWeight += weight
	}

	// Calculate final confidence score
	finalConfidence := weightedScore / totalWeight
	if finalConfidence > 1.0 {
		finalConfidence = 1.0
	}

	// Determine final severity level (use highest but adjust for confidence)
	finalSeverity := highestSeverity
	if finalConfidence < 0.7 && finalSeverity > 3 {
		finalSeverity = 3 // Reduce severity if confidence is low
	} else if finalConfidence > 0.9 && finalSeverity < 4 {
		finalSeverity = min(5, finalSeverity+1) // Increase severity if confidence is very high
	}

	// Crisis is detected if any individual result detected it or combined confidence is high
	crisisDetected := highestConfidence >= 0.5 || finalConfidence >= 0.6

	// Determine final recommended action
	recommendedAction := ds.getRecommendedAction(finalSeverity, "comprehensive_triage")
	estimatedResponse := ds.triageModel.ResponseTimeTargets[finalSeverity]

	result := &DetectionResult{
		CrisisDetected:    crisisDetected,
		SeverityLevel:     finalSeverity,
		ConfidenceScore:   finalConfidence,
		DetectionType:     "comprehensive_triage",
		TriggerFactors:    combinedFactors,
		RecommendedAction: recommendedAction,
		EstimatedResponse: estimatedResponse,
		Metadata: map[string]interface{}{
			"input_results_count":   len(detectionResults),
			"detection_types":       detectionTypes,
			"highest_severity":      highestSeverity,
			"highest_confidence":    highestConfidence,
			"weighted_score":        weightedScore,
			"total_weight":          totalWeight,
			"triage_time_ms":       time.Since(startTime).Milliseconds(),
		},
	}

	// Store triage result
	cacheKey := fmt.Sprintf("triage_result:%s:%d", userID, time.Now().Unix())
	ds.redisClient.Set(ctx, cacheKey, result, 1*time.Hour)

	ds.logger.WithFields(logrus.Fields{
		"user_id":         userID,
		"crisis_detected": crisisDetected,
		"final_severity":  finalSeverity,
		"final_confidence": finalConfidence,
		"triage_time":     time.Since(startTime),
	}).Info("Crisis triage completed")

	return result, nil
}

// getRecommendedAction returns the recommended action based on severity and detection type
func (ds *DetectionService) getRecommendedAction(severityLevel int, detectionType string) string {
	actions := map[int]string{
		1: "monitor_continue",
		2: "check_in_scheduled",
		3: "immediate_check_in",
		4: "emergency_contact_notify",
		5: "emergency_services_contact",
	}

	baseAction := actions[severityLevel]
	
	// Customize based on detection type
	switch detectionType {
	case "voice_analysis":
		if severityLevel >= 4 {
			return "voice_crisis_protocol"
		}
	case "pattern_analysis":
		if severityLevel >= 3 {
			return "pattern_intervention_protocol"
		}
	case "comprehensive_triage":
		if severityLevel >= 4 {
			return "full_crisis_response"
		}
	}
	
	return baseAction
}

// Helper function to initialize voice detection model
func initializeVoiceModel() *VoiceDetectionModel {
	return &VoiceDetectionModel{
		DistressKeywords: []string{
			"help me", "can't take it", "want to die", "end it all", "hopeless",
			"desperate", "scared", "panic", "overwhelming", "can't cope",
			"breaking down", "falling apart", "lost", "alone", "trapped",
		},
		EmergencyKeywords: []string{
			"emergency", "911", "crisis", "suicide", "kill myself", "hurt myself",
			"end my life", "overdose", "cutting", "harm", "danger",
		},
		HelpKeywords: []string{
			"help", "support", "need someone", "talk to someone", "counselor",
			"therapist", "hotline", "assistance", "intervention",
		},
		ConfidenceThreshold: 0.6,
	}
}

// Helper function to initialize pattern detection model
func initializePatternModel() *PatternDetectionModel {
	return &PatternDetectionModel{
		RiskFactors: map[string]float64{
			"sleep_disruption":        0.8,
			"social_withdrawal":       0.7,
			"mood_decline":           0.9,
			"appetite_changes":       0.6,
			"substance_use":          1.0,
			"relationship_conflicts":  0.7,
			"job_stress":             0.5,
			"financial_stress":       0.6,
			"health_issues":          0.7,
			"anniversary_dates":      0.8,
			"medication_noncompliance": 0.9,
		},
		ProtectiveFactors: map[string]float64{
			"social_support":         1.0,
			"therapy_attendance":     0.9,
			"medication_compliance":  0.8,
			"exercise_routine":       0.6,
			"healthy_sleep":          0.7,
			"meaningful_activities":  0.8,
			"coping_skills_use":     0.9,
		},
		TimeWindowMinutes: 1440, // 24 hours
		AlertThreshold:    0.4,
	}
}

// Helper function to initialize triage model
func initializeTriageModel() *TriageModel {
	return &TriageModel{
		SeverityWeights: map[string]float64{
			"voice_analysis":      1.2,
			"pattern_analysis":    1.0,
			"manual_trigger":      1.5,
			"sensor_data":        0.8,
		},
		EscalationThresholds: map[int]float64{
			1: 0.3,
			2: 0.5,
			3: 0.6,
			4: 0.8,
			5: 0.9,
		},
		ResponseTimeTargets: map[int]time.Duration{
			1: 30 * time.Minute,
			2: 15 * time.Minute,
			3: 5 * time.Minute,
			4: 2 * time.Minute,
			5: 30 * time.Second,
		},
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
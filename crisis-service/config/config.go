package config

import (
	"time"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	// Server configuration
	Server ServerConfig `envconfig:"SERVER"`
	
	// Database configuration
	Database DatabaseConfig `envconfig:"DATABASE"`
	
	// Redis configuration
	Redis RedisConfig `envconfig:"REDIS"`
	
	// Crisis service specific configuration
	Crisis CrisisConfig `envconfig:"CRISIS"`
	
	// External service configurations
	Twilio TwilioConfig `envconfig:"TWILIO"`
	SendGrid SendGridConfig `envconfig:"SENDGRID"`
	
	// Security configuration
	Security SecurityConfig `envconfig:"SECURITY"`
	
	// Monitoring configuration
	Monitoring MonitoringConfig `envconfig:"MONITORING"`
	
	// HIPAA compliance configuration
	HIPAA HIPAAConfig `envconfig:"HIPAA"`
}

type ServerConfig struct {
	Port            int           `envconfig:"PORT" default:"8080"`
	Host            string        `envconfig:"HOST" default:"0.0.0.0"`
	ReadTimeout     time.Duration `envconfig:"READ_TIMEOUT" default:"10s"`
	WriteTimeout    time.Duration `envconfig:"WRITE_TIMEOUT" default:"10s"`
	ShutdownTimeout time.Duration `envconfig:"SHUTDOWN_TIMEOUT" default:"30s"`
	TLSEnabled      bool          `envconfig:"TLS_ENABLED" default:"false"`
	CertFile        string        `envconfig:"CERT_FILE"`
	KeyFile         string        `envconfig:"KEY_FILE"`
}

type DatabaseConfig struct {
	URL             string        `envconfig:"URL" required:"true"`
	MaxOpenConns    int           `envconfig:"MAX_OPEN_CONNS" default:"25"`
	MaxIdleConns    int           `envconfig:"MAX_IDLE_CONNS" default:"5"`
	ConnMaxLifetime time.Duration `envconfig:"CONN_MAX_LIFETIME" default:"5m"`
	MigrationsPath  string        `envconfig:"MIGRATIONS_PATH" default:"./migrations"`
}

type RedisConfig struct {
	URL        string        `envconfig:"URL" required:"true"`
	MaxRetries int           `envconfig:"MAX_RETRIES" default:"3"`
	PoolSize   int           `envconfig:"POOL_SIZE" default:"10"`
	Timeout    time.Duration `envconfig:"TIMEOUT" default:"5s"`
}

type CrisisConfig struct {
	// Response time thresholds
	CriticalResponseTime     time.Duration `envconfig:"CRITICAL_RESPONSE_TIME" default:"500ms"`
	EscalationTimeout        time.Duration `envconfig:"ESCALATION_TIMEOUT" default:"2m"`
	FollowupCheckInterval    time.Duration `envconfig:"FOLLOWUP_CHECK_INTERVAL" default:"15m"`
	
	// Consensus configuration
	ConsensusNodes           int           `envconfig:"CONSENSUS_NODES" default:"3"`
	ConsensusTimeout         time.Duration `envconfig:"CONSENSUS_TIMEOUT" default:"1s"`
	
	// Voice detection configuration
	VoiceDetectionEnabled    bool          `envconfig:"VOICE_DETECTION_ENABLED" default:"true"`
	VoiceConfidenceThreshold float64       `envconfig:"VOICE_CONFIDENCE_THRESHOLD" default:"0.85"`
	
	// GPS configuration
	GPSEnabled               bool          `envconfig:"GPS_ENABLED" default:"true"`
	GPSAccuracyThreshold     float64       `envconfig:"GPS_ACCURACY_THRESHOLD" default:"10.0"`
	
	// Triage configuration
	TriageAlgorithm          string        `envconfig:"TRIAGE_ALGORITHM" default:"ml_enhanced"`
	SeverityLevels           int           `envconfig:"SEVERITY_LEVELS" default:"5"`
}

type TwilioConfig struct {
	AccountSID     string `envconfig:"ACCOUNT_SID" required:"true"`
	AuthToken      string `envconfig:"AUTH_TOKEN" required:"true"`
	FromNumber     string `envconfig:"FROM_NUMBER" required:"true"`
	VoiceURL       string `envconfig:"VOICE_URL"`
	StatusCallback string `envconfig:"STATUS_CALLBACK"`
}

type SendGridConfig struct {
	APIKey       string `envconfig:"API_KEY" required:"true"`
	FromEmail    string `envconfig:"FROM_EMAIL" required:"true"`
	FromName     string `envconfig:"FROM_NAME" default:"Serenity Crisis Support"`
	TemplateID   string `envconfig:"TEMPLATE_ID"`
}

type SecurityConfig struct {
	JWTSecret           string        `envconfig:"JWT_SECRET" required:"true"`
	JWTExpiration       time.Duration `envconfig:"JWT_EXPIRATION" default:"1h"`
	EncryptionKey       string        `envconfig:"ENCRYPTION_KEY" required:"true"`
	RateLimitRPS        int           `envconfig:"RATE_LIMIT_RPS" default:"100"`
	RateLimitBurst      int           `envconfig:"RATE_LIMIT_BURST" default:"200"`
	CORSAllowedOrigins  []string      `envconfig:"CORS_ALLOWED_ORIGINS"`
	RequireHTTPS        bool          `envconfig:"REQUIRE_HTTPS" default:"true"`
}

type MonitoringConfig struct {
	MetricsEnabled    bool   `envconfig:"METRICS_ENABLED" default:"true"`
	MetricsPath       string `envconfig:"METRICS_PATH" default:"/metrics"`
	HealthCheckPath   string `envconfig:"HEALTH_CHECK_PATH" default:"/health"`
	TracingEnabled    bool   `envconfig:"TRACING_ENABLED" default:"true"`
	LogLevel          string `envconfig:"LOG_LEVEL" default:"info"`
	LogFormat         string `envconfig:"LOG_FORMAT" default:"json"`
}

type HIPAAConfig struct {
	EncryptionAtRest     bool          `envconfig:"ENCRYPTION_AT_REST" default:"true"`
	EncryptionInTransit  bool          `envconfig:"ENCRYPTION_IN_TRANSIT" default:"true"`
	AuditLogEnabled      bool          `envconfig:"AUDIT_LOG_ENABLED" default:"true"`
	DataRetentionDays    int           `envconfig:"DATA_RETENTION_DAYS" default:"2555"` // 7 years
	SessionTimeout       time.Duration `envconfig:"SESSION_TIMEOUT" default:"15m"`
	PHIAccessLogging     bool          `envconfig:"PHI_ACCESS_LOGGING" default:"true"`
	ComplianceReporting  bool          `envconfig:"COMPLIANCE_REPORTING" default:"true"`
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	var cfg Config
	err := envconfig.Process("", &cfg)
	if err != nil {
		return nil, err
	}
	
	return &cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	// Add configuration validation logic here
	if c.Server.Port < 1 || c.Server.Port > 65535 {
		return ErrInvalidPort
	}
	
	if c.Crisis.ConsensusNodes < 1 || c.Crisis.ConsensusNodes%2 == 0 {
		return ErrInvalidConsensusNodes
	}
	
	if c.Crisis.VoiceConfidenceThreshold < 0 || c.Crisis.VoiceConfidenceThreshold > 1 {
		return ErrInvalidConfidenceThreshold
	}
	
	return nil
}
"""
Core configuration settings for the Serenity Notification Service.
HIPAA-compliant configuration with secure defaults.
"""

from functools import lru_cache
from typing import List, Optional
from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with HIPAA compliance considerations."""
    
    # Application Configuration
    app_name: str = Field(default="Serenity Notification Service", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")
    secret_key: str = Field(..., env="SECRET_KEY", min_length=32)
    encryption_key: str = Field(..., env="ENCRYPTION_KEY", min_length=32)
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    workers: int = Field(default=4, env="WORKERS")
    
    # Database Configuration
    mongodb_url: str = Field(..., env="MONGODB_URL")
    mongodb_database: str = Field(default="serenity_notifications", env="MONGODB_DATABASE")
    
    # Redis Configuration
    redis_url: str = Field(..., env="REDIS_URL")
    redis_password: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    celery_broker_url: str = Field(..., env="CELERY_BROKER_URL")
    celery_result_backend: str = Field(..., env="CELERY_RESULT_BACKEND")
    
    # Twilio Configuration
    twilio_account_sid: str = Field(..., env="TWILIO_ACCOUNT_SID")
    twilio_auth_token: str = Field(..., env="TWILIO_AUTH_TOKEN")
    twilio_phone_number: str = Field(..., env="TWILIO_PHONE_NUMBER")
    twilio_whatsapp_number: str = Field(..., env="TWILIO_WHATSAPP_NUMBER")
    
    # SendGrid Configuration
    sendgrid_api_key: str = Field(..., env="SENDGRID_API_KEY")
    sendgrid_from_email: str = Field(..., env="SENDGRID_FROM_EMAIL")
    sendgrid_from_name: str = Field(default="Serenity Support", env="SENDGRID_FROM_NAME")
    
    # Firebase Cloud Messaging
    fcm_server_key: str = Field(..., env="FCM_SERVER_KEY")
    fcm_sender_id: str = Field(..., env="FCM_SENDER_ID")
    
    # Rate Limiting Configuration
    rate_limit_sms_per_minute: int = Field(default=5, env="RATE_LIMIT_SMS_PER_MINUTE")
    rate_limit_email_per_minute: int = Field(default=10, env="RATE_LIMIT_EMAIL_PER_MINUTE")
    rate_limit_push_per_minute: int = Field(default=20, env="RATE_LIMIT_PUSH_PER_MINUTE")
    rate_limit_whatsapp_per_minute: int = Field(default=3, env="RATE_LIMIT_WHATSAPP_PER_MINUTE")
    
    # WebSocket Configuration
    websocket_enabled: bool = Field(default=True, env="WEBSOCKET_ENABLED")
    websocket_cors_origins: str = Field(default="*", env="WEBSOCKET_CORS_ORIGINS")
    
    # Monitoring and Logging
    sentry_dsn: Optional[str] = Field(default=None, env="SENTRY_DSN")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    prometheus_enabled: bool = Field(default=True, env="PROMETHEUS_ENABLED")
    
    # HIPAA Compliance
    audit_logging_enabled: bool = Field(default=True, env="AUDIT_LOGGING_ENABLED")
    message_retention_days: int = Field(default=2555, env="MESSAGE_RETENTION_DAYS")  # 7 years
    phi_encryption_enabled: bool = Field(default=True, env="PHI_ENCRYPTION_ENABLED")
    
    # Retry Configuration
    max_retries: int = Field(default=3, env="MAX_RETRIES")
    retry_backoff_factor: int = Field(default=2, env="RETRY_BACKOFF_FACTOR")
    retry_max_delay: int = Field(default=300, env="RETRY_MAX_DELAY")
    
    # Health Check
    health_check_interval: int = Field(default=30, env="HEALTH_CHECK_INTERVAL")
    
    # CORS Configuration
    allowed_origins: List[str] = Field(default=["http://localhost:3000", "http://localhost:8080"])
    allowed_methods: List[str] = Field(default=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    allowed_headers: List[str] = Field(default=["*"])
    
    @validator("environment")
    def validate_environment(cls, v):
        """Validate environment setting."""
        valid_envs = ["development", "staging", "production"]
        if v not in valid_envs:
            raise ValueError(f"Environment must be one of {valid_envs}")
        return v
    
    @validator("log_level")
    def validate_log_level(cls, v):
        """Validate log level setting."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of {valid_levels}")
        return v.upper()
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment == "development"
    
    @property
    def websocket_origins_list(self) -> List[str]:
        """Parse WebSocket CORS origins into a list."""
        if self.websocket_cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.websocket_cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()
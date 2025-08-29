"""
Audit log model for HIPAA compliance and security tracking.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from beanie import Document, Indexed
from pydantic import Field


class AuditAction(str, Enum):
    """Types of auditable actions."""
    # Notification actions
    NOTIFICATION_CREATED = "notification_created"
    NOTIFICATION_SENT = "notification_sent"
    NOTIFICATION_DELIVERED = "notification_delivered"
    NOTIFICATION_FAILED = "notification_failed"
    NOTIFICATION_CANCELLED = "notification_cancelled"
    
    # User preference actions
    PREFERENCES_CREATED = "preferences_created"
    PREFERENCES_UPDATED = "preferences_updated"
    CHANNEL_OPTED_IN = "channel_opted_in"
    CHANNEL_OPTED_OUT = "channel_opted_out"
    
    # Template actions
    TEMPLATE_CREATED = "template_created"
    TEMPLATE_UPDATED = "template_updated"
    TEMPLATE_USED = "template_used"
    TEMPLATE_DELETED = "template_deleted"
    
    # PHI access
    PHI_ACCESSED = "phi_accessed"
    PHI_MODIFIED = "phi_modified"
    PHI_EXPORTED = "phi_exported"
    PHI_DELETED = "phi_deleted"
    
    # System actions
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    
    # Security events
    AUTHENTICATION_FAILED = "authentication_failed"
    AUTHORIZATION_FAILED = "authorization_failed"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


class AuditSeverity(str, Enum):
    """Severity levels for audit events."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditLog(Document):
    """
    HIPAA-compliant audit log for tracking all system activities.
    """
    
    # Event identification
    action: Indexed(AuditAction) = Field(..., description="Type of action performed")
    severity: AuditSeverity = Field(default=AuditSeverity.INFO, description="Event severity")
    
    # Actor information
    user_id: Optional[Indexed(str)] = Field(None, description="User who performed the action")
    service_account: Optional[str] = Field(None, description="Service account if system action")
    session_id: Optional[str] = Field(None, description="User session ID")
    
    # Target information
    resource_type: Optional[str] = Field(None, description="Type of resource affected")
    resource_id: Optional[str] = Field(None, description="ID of resource affected")
    
    # Request context
    ip_address: Optional[str] = Field(None, description="Source IP address")
    user_agent: Optional[str] = Field(None, description="User agent string")
    request_id: Optional[str] = Field(None, description="Request correlation ID")
    
    # Event details
    description: str = Field(..., description="Human-readable event description")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional event details")
    
    # HIPAA compliance fields
    phi_accessed: bool = Field(default=False, description="Event involved PHI access")
    purpose_of_use: Optional[str] = Field(None, description="Purpose for PHI access")
    data_classification: Optional[str] = Field(None, description="Data classification level")
    
    # Outcome information
    success: bool = Field(default=True, description="Whether action was successful")
    error_message: Optional[str] = Field(None, description="Error message if unsuccessful")
    
    # Security context
    authentication_method: Optional[str] = Field(None, description="Authentication method used")
    authorization_granted: Optional[bool] = Field(None, description="Whether authorization was granted")
    
    # Metadata
    environment: str = Field(default="production", description="Environment where event occurred")
    service_name: str = Field(default="notification-service", description="Service that generated event")
    service_version: Optional[str] = Field(None, description="Service version")
    
    # Timestamps
    timestamp: Indexed(datetime) = Field(default_factory=datetime.utcnow, description="Event timestamp")
    processed_at: Optional[datetime] = Field(None, description="When audit entry was processed")
    
    # Data retention
    retention_expires_at: Optional[datetime] = Field(None, description="Retention expiration date")
    archived: bool = Field(default=False, description="Whether record has been archived")
    
    @classmethod
    def create_notification_audit(
        cls,
        action: AuditAction,
        notification_id: str,
        user_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> "AuditLog":
        """Create an audit log entry for notification events."""
        return cls(
            action=action,
            user_id=user_id,
            resource_type="notification",
            resource_id=notification_id,
            description=f"Notification {action.value.replace('_', ' ')}",
            details=details,
            **kwargs
        )
    
    @classmethod
    def create_phi_audit(
        cls,
        action: AuditAction,
        user_id: str,
        resource_type: str,
        resource_id: str,
        purpose: str,
        accessed_by: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> "AuditLog":
        """Create an audit log entry for PHI access."""
        return cls(
            action=action,
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            description=f"PHI {action.value.replace('_', ' ')} for {purpose}",
            phi_accessed=True,
            purpose_of_use=purpose,
            details={
                "accessed_by": accessed_by,
                **(details or {})
            },
            **kwargs
        )
    
    @classmethod
    def create_security_audit(
        cls,
        action: AuditAction,
        description: str,
        severity: AuditSeverity = AuditSeverity.WARNING,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> "AuditLog":
        """Create an audit log entry for security events."""
        return cls(
            action=action,
            severity=severity,
            user_id=user_id,
            ip_address=ip_address,
            description=description,
            success=False,  # Security events are typically failures
            details=details,
            **kwargs
        )
    
    @classmethod
    def create_system_audit(
        cls,
        action: AuditAction,
        description: str,
        service_account: str,
        details: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> "AuditLog":
        """Create an audit log entry for system events."""
        return cls(
            action=action,
            service_account=service_account,
            description=description,
            details=details,
            **kwargs
        )
    
    def mark_processed(self):
        """Mark audit entry as processed."""
        self.processed_at = datetime.utcnow()
    
    def archive(self):
        """Mark audit entry as archived."""
        self.archived = True
        self.processed_at = datetime.utcnow()
    
    def is_phi_event(self) -> bool:
        """Check if this audit entry involves PHI."""
        return self.phi_accessed or self.action in [
            AuditAction.PHI_ACCESSED,
            AuditAction.PHI_MODIFIED,
            AuditAction.PHI_EXPORTED,
            AuditAction.PHI_DELETED
        ]
    
    def is_security_event(self) -> bool:
        """Check if this is a security-related audit entry."""
        return self.action in [
            AuditAction.AUTHENTICATION_FAILED,
            AuditAction.AUTHORIZATION_FAILED,
            AuditAction.RATE_LIMIT_EXCEEDED,
            AuditAction.SUSPICIOUS_ACTIVITY
        ] or self.severity in [AuditSeverity.ERROR, AuditSeverity.CRITICAL]
    
    def get_event_summary(self) -> Dict[str, Any]:
        """Get a summary of the audit event."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "action": self.action,
            "user_id": self.user_id,
            "description": self.description,
            "success": self.success,
            "phi_accessed": self.phi_accessed,
            "severity": self.severity
        }
    
    class Settings:
        name = "audit_logs"
        use_revision = True
        
        indexes = [
            [("timestamp", -1)],
            [("user_id", 1), ("timestamp", -1)],
            [("action", 1)],
            [("severity", 1)],
            [("phi_accessed", 1), ("timestamp", -1)],
            [("success", 1)],
            [("resource_type", 1), ("resource_id", 1)],
            [("retention_expires_at", 1)],  # For automated cleanup
            [("archived", 1)],
            [("ip_address", 1)],
        ]
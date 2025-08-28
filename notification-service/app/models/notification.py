"""
Notification model for storing notification data with HIPAA compliance.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from beanie import Document, Indexed
from pydantic import Field, validator


class NotificationChannel(str, Enum):
    """Available notification channels."""
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"
    WHATSAPP = "whatsapp"


class NotificationStatus(str, Enum):
    """Notification processing status."""
    PENDING = "pending"
    PROCESSING = "processing"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NotificationPriority(str, Enum):
    """Notification priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notification(Document):
    """
    Notification document with HIPAA compliance features.
    """
    
    # Core notification fields
    user_id: Indexed(str) = Field(..., description="User ID receiving the notification")
    channel: Indexed(NotificationChannel) = Field(..., description="Delivery channel")
    status: Indexed(NotificationStatus) = Field(default=NotificationStatus.PENDING, description="Processing status")
    priority: NotificationPriority = Field(default=NotificationPriority.NORMAL, description="Priority level")
    
    # Message content (encrypted if contains PHI)
    subject: Optional[str] = Field(None, description="Message subject (for email)")
    message: str = Field(..., description="Message content", min_length=1, max_length=2000)
    template_id: Optional[str] = Field(None, description="Template ID if using template")
    template_variables: Optional[Dict[str, Any]] = Field(None, description="Template variable values")
    
    # Delivery configuration
    recipient: str = Field(..., description="Recipient address (phone/email/token)")
    sender_override: Optional[str] = Field(None, description="Override sender address")
    delivery_options: Optional[Dict[str, Any]] = Field(None, description="Channel-specific options")
    
    # Scheduling
    send_at: Optional[datetime] = Field(None, description="Scheduled send time")
    expires_at: Optional[datetime] = Field(None, description="Message expiration time")
    
    # Retry configuration
    retry_count: int = Field(default=0, description="Current retry count")
    max_retries: int = Field(default=3, description="Maximum retry attempts")
    next_retry_at: Optional[datetime] = Field(None, description="Next retry time")
    
    # Tracking and metadata
    external_id: Optional[str] = Field(None, description="External provider message ID")
    tracking_data: Optional[Dict[str, Any]] = Field(None, description="Delivery tracking info")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    # HIPAA compliance fields
    contains_phi: bool = Field(default=False, description="Contains PHI data")
    audit_trail: List[Dict[str, Any]] = Field(default_factory=list, description="Audit trail")
    
    # Timestamps
    created_at: Indexed(datetime) = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = Field(None, description="Time message was sent")
    delivered_at: Optional[datetime] = Field(None, description="Time message was delivered")
    
    # Error tracking
    error_message: Optional[str] = Field(None, description="Last error message")
    error_code: Optional[str] = Field(None, description="Provider error code")
    
    @validator("recipient")
    def validate_recipient(cls, v, values):
        """Validate recipient format based on channel."""
        channel = values.get("channel")
        
        if channel == NotificationChannel.SMS:
            if not v.startswith("+") or len(v) < 10:
                raise ValueError("SMS recipient must be a valid phone number with country code")
        elif channel == NotificationChannel.EMAIL:
            if "@" not in v or "." not in v.split("@")[-1]:
                raise ValueError("Email recipient must be a valid email address")
        elif channel == NotificationChannel.WHATSAPP:
            if not v.startswith("whatsapp:+") or len(v) < 15:
                raise ValueError("WhatsApp recipient must be in format 'whatsapp:+1234567890'")
        
        return v
    
    @validator("send_at")
    def validate_send_at(cls, v):
        """Ensure send_at is not in the past."""
        if v and v < datetime.utcnow():
            raise ValueError("Scheduled send time cannot be in the past")
        return v
    
    def add_audit_entry(self, action: str, details: Optional[Dict[str, Any]] = None):
        """Add an entry to the audit trail."""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "details": details or {}
        }
        self.audit_trail.append(entry)
        self.updated_at = datetime.utcnow()
    
    def update_status(self, new_status: NotificationStatus, error_message: Optional[str] = None):
        """Update notification status with audit trail."""
        old_status = self.status
        self.status = new_status
        self.updated_at = datetime.utcnow()
        
        if error_message:
            self.error_message = error_message
        
        self.add_audit_entry(
            action="status_changed",
            details={
                "old_status": old_status,
                "new_status": new_status,
                "error_message": error_message
            }
        )
        
        # Set timestamps based on status
        if new_status == NotificationStatus.SENT and not self.sent_at:
            self.sent_at = datetime.utcnow()
        elif new_status == NotificationStatus.DELIVERED and not self.delivered_at:
            self.delivered_at = datetime.utcnow()
    
    def increment_retry(self, next_retry_time: datetime):
        """Increment retry count and set next retry time."""
        self.retry_count += 1
        self.next_retry_at = next_retry_time
        self.add_audit_entry(
            action="retry_scheduled",
            details={
                "retry_count": self.retry_count,
                "next_retry_at": next_retry_time.isoformat()
            }
        )
    
    def is_expired(self) -> bool:
        """Check if notification has expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    def should_retry(self) -> bool:
        """Check if notification should be retried."""
        return (
            self.status == NotificationStatus.FAILED and
            self.retry_count < self.max_retries and
            not self.is_expired()
        )
    
    def time_until_send(self) -> Optional[int]:
        """Get seconds until scheduled send time."""
        if not self.send_at:
            return None
        
        delta = self.send_at - datetime.utcnow()
        return max(0, int(delta.total_seconds()))
    
    class Settings:
        name = "notifications"
        use_revision = True
        
        indexes = [
            [("user_id", 1), ("status", 1)],
            [("created_at", -1)],
            [("send_at", 1)],
            [("next_retry_at", 1)],
            "channel",
            "priority",
            "template_id",
        ]
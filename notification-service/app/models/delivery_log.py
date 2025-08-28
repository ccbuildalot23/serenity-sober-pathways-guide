"""
Delivery log model for tracking notification delivery and analytics.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from beanie import Document, Indexed
from pydantic import Field

from .notification import NotificationChannel


class DeliveryStatus(str, Enum):
    """Delivery status for notifications."""
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"
    REJECTED = "rejected"
    OPENED = "opened"
    CLICKED = "clicked"
    UNSUBSCRIBED = "unsubscribed"


class DeliveryLog(Document):
    """
    Log of notification delivery attempts and status updates.
    Used for analytics and compliance tracking.
    """
    
    # Reference information
    notification_id: Indexed(str) = Field(..., description="Associated notification ID")
    user_id: Indexed(str) = Field(..., description="User ID")
    template_id: Optional[str] = Field(None, description="Template ID if used")
    
    # Delivery details
    channel: Indexed(NotificationChannel) = Field(..., description="Delivery channel")
    recipient: str = Field(..., description="Recipient address")
    status: Indexed(DeliveryStatus) = Field(..., description="Delivery status")
    
    # Provider information
    provider: str = Field(..., description="Provider name (twilio, sendgrid, fcm)")
    provider_message_id: Optional[str] = Field(None, description="Provider's message ID")
    provider_status: Optional[str] = Field(None, description="Provider's status code")
    
    # Timing information
    sent_at: Optional[datetime] = Field(None, description="Time message was sent")
    delivered_at: Optional[Indexed(datetime)] = Field(None, description="Time message was delivered")
    opened_at: Optional[datetime] = Field(None, description="Time message was opened (email)")
    clicked_at: Optional[datetime] = Field(None, description="Time links were clicked")
    
    # Error information
    error_message: Optional[str] = Field(None, description="Error message if failed")
    error_code: Optional[str] = Field(None, description="Error code")
    retry_count: int = Field(default=0, description="Number of retry attempts")
    
    # Message metadata
    message_size: Optional[int] = Field(None, description="Message size in bytes")
    message_subject: Optional[str] = Field(None, description="Message subject (email)")
    
    # Tracking and analytics
    user_agent: Optional[str] = Field(None, description="User agent (for opens/clicks)")
    ip_address: Optional[str] = Field(None, description="IP address (for opens/clicks)")
    device_info: Optional[Dict[str, Any]] = Field(None, description="Device information")
    
    # Cost tracking
    cost: Optional[float] = Field(None, description="Cost of delivery")
    currency: Optional[str] = Field(None, description="Currency code")
    
    # Compliance and audit
    audit_data: Optional[Dict[str, Any]] = Field(None, description="Audit trail data")
    retention_expires_at: Optional[datetime] = Field(None, description="Data retention expiration")
    
    # Timestamps
    created_at: Indexed(datetime) = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def update_status(
        self, 
        new_status: DeliveryStatus, 
        provider_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ):
        """Update delivery status with provider data."""
        old_status = self.status
        self.status = new_status
        self.updated_at = datetime.utcnow()
        
        # Set status-specific timestamps
        now = datetime.utcnow()
        if new_status == DeliveryStatus.SENT and not self.sent_at:
            self.sent_at = now
        elif new_status == DeliveryStatus.DELIVERED and not self.delivered_at:
            self.delivered_at = now
        elif new_status == DeliveryStatus.OPENED and not self.opened_at:
            self.opened_at = now
        elif new_status in [DeliveryStatus.CLICKED] and not self.clicked_at:
            self.clicked_at = now
        
        # Update provider information
        if provider_data:
            if "message_id" in provider_data:
                self.provider_message_id = provider_data["message_id"]
            if "status" in provider_data:
                self.provider_status = provider_data["status"]
            if "cost" in provider_data:
                self.cost = provider_data["cost"]
            if "currency" in provider_data:
                self.currency = provider_data["currency"]
        
        # Update error information
        if error_message:
            self.error_message = error_message
        
        # Add to audit trail
        if not self.audit_data:
            self.audit_data = {"status_changes": []}
        
        self.audit_data["status_changes"].append({
            "timestamp": now.isoformat(),
            "old_status": old_status,
            "new_status": new_status,
            "error_message": error_message,
            "provider_data": provider_data
        })
    
    def record_engagement(
        self,
        engagement_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Record user engagement (opens, clicks, etc.)."""
        now = datetime.utcnow()
        
        if engagement_type == "open" and not self.opened_at:
            self.opened_at = now
            if self.status == DeliveryStatus.DELIVERED:
                self.status = DeliveryStatus.OPENED
        elif engagement_type == "click" and not self.clicked_at:
            self.clicked_at = now
            if self.status in [DeliveryStatus.DELIVERED, DeliveryStatus.OPENED]:
                self.status = DeliveryStatus.CLICKED
        
        # Record metadata
        if metadata:
            if "user_agent" in metadata:
                self.user_agent = metadata["user_agent"]
            if "ip_address" in metadata:
                self.ip_address = metadata["ip_address"]
            if "device_info" in metadata:
                self.device_info = metadata["device_info"]
        
        # Update audit trail
        if not self.audit_data:
            self.audit_data = {"engagements": []}
        
        if "engagements" not in self.audit_data:
            self.audit_data["engagements"] = []
        
        self.audit_data["engagements"].append({
            "timestamp": now.isoformat(),
            "type": engagement_type,
            "metadata": metadata
        })
        
        self.updated_at = now
    
    def get_delivery_latency(self) -> Optional[float]:
        """Get delivery latency in seconds."""
        if self.sent_at and self.delivered_at:
            return (self.delivered_at - self.sent_at).total_seconds()
        return None
    
    def get_open_latency(self) -> Optional[float]:
        """Get time to open in seconds."""
        if self.delivered_at and self.opened_at:
            return (self.opened_at - self.delivered_at).total_seconds()
        return None
    
    def is_successful(self) -> bool:
        """Check if delivery was successful."""
        return self.status in [
            DeliveryStatus.SENT,
            DeliveryStatus.DELIVERED,
            DeliveryStatus.OPENED,
            DeliveryStatus.CLICKED
        ]
    
    def is_engagement(self) -> bool:
        """Check if user engaged with the message."""
        return self.status in [DeliveryStatus.OPENED, DeliveryStatus.CLICKED]
    
    class Settings:
        name = "delivery_logs"
        use_revision = True
        
        indexes = [
            [("notification_id", 1)],
            [("user_id", 1), ("channel", 1)],
            [("delivered_at", -1)],
            [("created_at", -1)],
            [("status", 1)],
            [("provider", 1)],
            [("retention_expires_at", 1)],  # For automated cleanup
        ]
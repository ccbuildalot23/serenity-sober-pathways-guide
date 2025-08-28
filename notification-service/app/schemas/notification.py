"""
Notification API schemas for request and response models.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator

from ..models.notification import (
    NotificationChannel, 
    NotificationStatus, 
    NotificationPriority
)
from .common import PaginationQuery, DateRangeQuery, SortOrder


class NotificationCreate(BaseModel):
    """Schema for creating a new notification."""
    
    user_id: str = Field(..., description="User ID receiving the notification", min_length=1)
    channel: NotificationChannel = Field(..., description="Delivery channel")
    recipient: str = Field(..., description="Recipient address", min_length=1)
    message: str = Field(..., description="Message content", min_length=1, max_length=2000)
    
    # Optional fields
    subject: Optional[str] = Field(None, description="Message subject (for email)", max_length=200)
    template_id: Optional[str] = Field(None, description="Template ID if using template")
    template_variables: Optional[Dict[str, Any]] = Field(None, description="Template variable values")
    
    priority: NotificationPriority = Field(default=NotificationPriority.NORMAL, description="Priority level")
    send_at: Optional[datetime] = Field(None, description="Scheduled send time")
    expires_at: Optional[datetime] = Field(None, description="Message expiration time")
    
    # Delivery configuration
    sender_override: Optional[str] = Field(None, description="Override sender address")
    delivery_options: Optional[Dict[str, Any]] = Field(None, description="Channel-specific options")
    max_retries: int = Field(default=3, description="Maximum retry attempts", ge=0, le=10)
    
    # Metadata
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    contains_phi: bool = Field(default=False, description="Contains PHI data")
    
    @validator("send_at")
    def validate_send_at(cls, v):
        """Ensure send_at is not in the past."""
        if v and v < datetime.utcnow():
            raise ValueError("Scheduled send time cannot be in the past")
        return v
    
    @validator("expires_at")
    def validate_expires_at(cls, v, values):
        """Ensure expires_at is after send_at."""
        send_at = values.get("send_at")
        if v and send_at and v <= send_at:
            raise ValueError("Expiration time must be after send time")
        return v


class NotificationUpdate(BaseModel):
    """Schema for updating an existing notification."""
    
    status: Optional[NotificationStatus] = Field(None, description="Update status")
    send_at: Optional[datetime] = Field(None, description="Update scheduled send time")
    expires_at: Optional[datetime] = Field(None, description="Update expiration time")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Update metadata")
    
    @validator("send_at")
    def validate_send_at(cls, v):
        """Ensure send_at is not in the past."""
        if v and v < datetime.utcnow():
            raise ValueError("Scheduled send time cannot be in the past")
        return v


class NotificationResponse(BaseModel):
    """Schema for notification responses."""
    
    id: str = Field(..., description="Notification ID")
    user_id: str = Field(..., description="User ID")
    channel: NotificationChannel = Field(..., description="Delivery channel")
    status: NotificationStatus = Field(..., description="Processing status")
    priority: NotificationPriority = Field(..., description="Priority level")
    
    recipient: str = Field(..., description="Recipient address")
    subject: Optional[str] = Field(None, description="Message subject")
    message: str = Field(..., description="Message content")
    template_id: Optional[str] = Field(None, description="Template ID if used")
    
    # Scheduling
    send_at: Optional[datetime] = Field(None, description="Scheduled send time")
    expires_at: Optional[datetime] = Field(None, description="Expiration time")
    
    # Tracking
    retry_count: int = Field(..., description="Current retry count")
    max_retries: int = Field(..., description="Maximum retries")
    next_retry_at: Optional[datetime] = Field(None, description="Next retry time")
    
    # External references
    external_id: Optional[str] = Field(None, description="External provider message ID")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    sent_at: Optional[datetime] = Field(None, description="Send timestamp")
    delivered_at: Optional[datetime] = Field(None, description="Delivery timestamp")
    
    # Error information
    error_message: Optional[str] = Field(None, description="Last error message")
    error_code: Optional[str] = Field(None, description="Provider error code")
    
    # Metadata
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    contains_phi: bool = Field(default=False, description="Contains PHI data")


class NotificationQuery(BaseModel):
    """Schema for querying notifications."""
    
    # Pagination
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    
    # Filters
    user_id: Optional[str] = Field(None, description="Filter by user ID")
    channel: Optional[NotificationChannel] = Field(None, description="Filter by channel")
    status: Optional[NotificationStatus] = Field(None, description="Filter by status")
    priority: Optional[NotificationPriority] = Field(None, description="Filter by priority")
    template_id: Optional[str] = Field(None, description="Filter by template ID")
    
    # Date filters
    created_after: Optional[datetime] = Field(None, description="Created after date")
    created_before: Optional[datetime] = Field(None, description="Created before date")
    sent_after: Optional[datetime] = Field(None, description="Sent after date")
    sent_before: Optional[datetime] = Field(None, description="Sent before date")
    
    # Search
    search: Optional[str] = Field(None, description="Search in message content", max_length=100)
    
    # Sorting
    sort_by: str = Field(default="created_at", description="Sort field")
    sort_order: SortOrder = Field(default=SortOrder.DESC, description="Sort order")
    
    # Special filters
    contains_phi: Optional[bool] = Field(None, description="Filter by PHI content")
    has_errors: Optional[bool] = Field(None, description="Filter notifications with errors")
    is_scheduled: Optional[bool] = Field(None, description="Filter scheduled notifications")


class BulkNotificationCreate(BaseModel):
    """Schema for creating multiple notifications."""
    
    notifications: List[NotificationCreate] = Field(
        ..., 
        description="List of notifications to create",
        min_items=1,
        max_items=100
    )
    
    # Bulk options
    batch_id: Optional[str] = Field(None, description="Batch identifier")
    priority_override: Optional[NotificationPriority] = Field(None, description="Override priority for all")
    send_at_override: Optional[datetime] = Field(None, description="Override send time for all")
    
    # Processing options
    stop_on_error: bool = Field(default=False, description="Stop processing on first error")
    validate_recipients: bool = Field(default=True, description="Validate all recipients before processing")
    
    @validator("send_at_override")
    def validate_send_at_override(cls, v):
        """Ensure send_at_override is not in the past."""
        if v and v < datetime.utcnow():
            raise ValueError("Scheduled send time cannot be in the past")
        return v


class NotificationStats(BaseModel):
    """Schema for notification statistics."""
    
    total: int = Field(..., description="Total notifications")
    pending: int = Field(default=0, description="Pending notifications")
    processing: int = Field(default=0, description="Processing notifications")
    sent: int = Field(default=0, description="Sent notifications")
    delivered: int = Field(default=0, description="Delivered notifications")
    failed: int = Field(default=0, description="Failed notifications")
    cancelled: int = Field(default=0, description="Cancelled notifications")
    
    # Calculated metrics
    delivery_rate: float = Field(default=0.0, description="Delivery success rate")
    failure_rate: float = Field(default=0.0, description="Failure rate")
    average_delivery_time: Optional[float] = Field(None, description="Average delivery time in seconds")


class ChannelStats(BaseModel):
    """Schema for channel-specific statistics."""
    
    channel: NotificationChannel = Field(..., description="Channel")
    total: int = Field(..., description="Total notifications for channel")
    delivered: int = Field(default=0, description="Delivered notifications")
    failed: int = Field(default=0, description="Failed notifications")
    delivery_rate: float = Field(default=0.0, description="Channel delivery rate")
    average_latency: Optional[float] = Field(None, description="Average latency in ms")
    cost: Optional[float] = Field(None, description="Total cost for channel")


class NotificationWebhook(BaseModel):
    """Schema for webhook delivery status updates."""
    
    notification_id: str = Field(..., description="Notification ID")
    status: NotificationStatus = Field(..., description="New status")
    provider: str = Field(..., description="Provider name")
    provider_message_id: Optional[str] = Field(None, description="Provider message ID")
    timestamp: datetime = Field(..., description="Status update timestamp")
    
    # Provider-specific data
    provider_data: Optional[Dict[str, Any]] = Field(None, description="Provider-specific information")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    error_code: Optional[str] = Field(None, description="Provider error code")
    
    # Tracking data
    engagement_data: Optional[Dict[str, Any]] = Field(None, description="Engagement tracking data")


class ScheduledNotificationQuery(BaseModel):
    """Schema for querying scheduled notifications."""
    
    # Time range for scheduled notifications
    send_after: Optional[datetime] = Field(None, description="Scheduled after this time")
    send_before: Optional[datetime] = Field(None, description="Scheduled before this time")
    
    # Status filters
    include_pending: bool = Field(default=True, description="Include pending notifications")
    include_processing: bool = Field(default=False, description="Include processing notifications")
    
    # Pagination
    limit: int = Field(default=100, ge=1, le=1000, description="Maximum results")
    
    def get_send_window(self) -> tuple[Optional[datetime], Optional[datetime]]:
        """Get the send time window."""
        return (self.send_after, self.send_before)
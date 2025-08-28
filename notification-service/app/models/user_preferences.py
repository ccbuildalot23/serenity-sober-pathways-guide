"""
User notification preferences model for opt-in/opt-out management.
"""

from datetime import datetime, time
from enum import Enum
from typing import Dict, List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field, validator

from .notification import NotificationChannel


class OptInStatus(str, Enum):
    """Opt-in status for notification channels."""
    OPTED_IN = "opted_in"
    OPTED_OUT = "opted_out"
    PENDING = "pending"


class QuietHours(BaseModel):
    """Quiet hours configuration."""
    enabled: bool = Field(default=False, description="Enable quiet hours")
    start_time: time = Field(default=time(22, 0), description="Quiet hours start time")
    end_time: time = Field(default=time(8, 0), description="Quiet hours end time")
    timezone: str = Field(default="UTC", description="Timezone for quiet hours")


class ChannelPreference(BaseModel):
    """Preference settings for a specific notification channel."""
    
    channel: NotificationChannel = Field(..., description="Notification channel")
    opt_in_status: OptInStatus = Field(default=OptInStatus.PENDING, description="Opt-in status")
    
    # Channel-specific settings
    enabled: bool = Field(default=True, description="Channel is enabled")
    priority_filter: Optional[str] = Field(None, description="Minimum priority level")
    
    # Rate limiting preferences
    max_per_hour: Optional[int] = Field(None, description="Maximum notifications per hour")
    max_per_day: Optional[int] = Field(None, description="Maximum notifications per day")
    
    # Quiet hours
    quiet_hours: Optional[QuietHours] = Field(None, description="Quiet hours configuration")
    
    # Category preferences
    allowed_categories: Optional[List[str]] = Field(None, description="Allowed notification categories")
    blocked_categories: Optional[List[str]] = Field(None, description="Blocked notification categories")
    
    # Timestamps
    opted_in_at: Optional[datetime] = Field(None, description="Opt-in timestamp")
    opted_out_at: Optional[datetime] = Field(None, description="Opt-out timestamp")
    last_notification_at: Optional[datetime] = Field(None, description="Last notification timestamp")
    
    def update_opt_in_status(self, status: OptInStatus):
        """Update opt-in status with timestamps."""
        self.opt_in_status = status
        
        if status == OptInStatus.OPTED_IN:
            self.opted_in_at = datetime.utcnow()
            self.enabled = True
        elif status == OptInStatus.OPTED_OUT:
            self.opted_out_at = datetime.utcnow()
            self.enabled = False
    
    def is_in_quiet_hours(self, check_time: Optional[datetime] = None) -> bool:
        """Check if current time is within quiet hours."""
        if not self.quiet_hours or not self.quiet_hours.enabled:
            return False
        
        if not check_time:
            check_time = datetime.utcnow()
        
        # Convert to local time if timezone specified
        # This is a simplified check - in production, use proper timezone handling
        check_time_only = check_time.time()
        
        start = self.quiet_hours.start_time
        end = self.quiet_hours.end_time
        
        if start < end:
            # Same day quiet hours (e.g., 22:00 - 08:00 next day)
            return check_time_only >= start or check_time_only <= end
        else:
            # Overnight quiet hours (e.g., 10:00 - 18:00)
            return start <= check_time_only <= end


class UserPreferences(Document):
    """
    User notification preferences with HIPAA compliance.
    """
    
    # User identification
    user_id: Indexed(str) = Field(..., description="Unique user identifier")
    
    # Global preferences
    notifications_enabled: bool = Field(default=True, description="Global notification toggle")
    
    # Channel-specific preferences
    channel_preferences: Dict[str, ChannelPreference] = Field(
        default_factory=dict, 
        description="Preferences for each channel"
    )
    
    # Contact information (encrypted)
    contact_info: Dict[str, str] = Field(
        default_factory=dict,
        description="Contact information for each channel"
    )
    
    # Marketing preferences
    marketing_opted_in: bool = Field(default=False, description="Opted into marketing communications")
    marketing_opted_in_at: Optional[datetime] = Field(None, description="Marketing opt-in timestamp")
    
    # Emergency contact override
    emergency_contact_enabled: bool = Field(default=True, description="Allow emergency notifications")
    emergency_bypass_quiet_hours: bool = Field(default=True, description="Emergency notifications bypass quiet hours")
    
    # Language and localization
    language: str = Field(default="en", description="Preferred language code")
    timezone: str = Field(default="UTC", description="User timezone")
    
    # Audit and compliance
    consent_version: str = Field(default="1.0", description="Consent policy version")
    consent_given_at: datetime = Field(default_factory=datetime.utcnow, description="Consent timestamp")
    last_updated_by: Optional[str] = Field(None, description="Last updated by user/admin")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @validator("channel_preferences")
    def validate_channel_preferences(cls, v):
        """Ensure channel preferences use valid channels."""
        valid_channels = [channel.value for channel in NotificationChannel]
        
        for channel_key in v.keys():
            if channel_key not in valid_channels:
                raise ValueError(f"Invalid channel: {channel_key}")
        
        return v
    
    def get_channel_preference(self, channel: NotificationChannel) -> Optional[ChannelPreference]:
        """Get preference for a specific channel."""
        return self.channel_preferences.get(channel.value)
    
    def set_channel_preference(self, preference: ChannelPreference):
        """Set preference for a specific channel."""
        self.channel_preferences[preference.channel.value] = preference
        self.updated_at = datetime.utcnow()
    
    def opt_in_channel(self, channel: NotificationChannel, contact_info: Optional[str] = None):
        """Opt user into a notification channel."""
        if channel.value not in self.channel_preferences:
            self.channel_preferences[channel.value] = ChannelPreference(channel=channel)
        
        preference = self.channel_preferences[channel.value]
        preference.update_opt_in_status(OptInStatus.OPTED_IN)
        
        if contact_info:
            self.contact_info[channel.value] = contact_info
        
        self.updated_at = datetime.utcnow()
    
    def opt_out_channel(self, channel: NotificationChannel):
        """Opt user out of a notification channel."""
        if channel.value in self.channel_preferences:
            preference = self.channel_preferences[channel.value]
            preference.update_opt_in_status(OptInStatus.OPTED_OUT)
            self.updated_at = datetime.utcnow()
    
    def is_channel_allowed(
        self, 
        channel: NotificationChannel, 
        category: Optional[str] = None,
        priority: Optional[str] = None,
        is_emergency: bool = False
    ) -> bool:
        """
        Check if notifications are allowed for a channel.
        
        Args:
            channel: Notification channel
            category: Notification category
            priority: Notification priority
            is_emergency: Is this an emergency notification
        
        Returns:
            True if notifications are allowed
        """
        # Global toggle
        if not self.notifications_enabled and not is_emergency:
            return False
        
        # Emergency override
        if is_emergency and self.emergency_contact_enabled:
            return True
        
        # Channel-specific preferences
        preference = self.get_channel_preference(channel)
        if not preference:
            return False
        
        # Check opt-in status
        if preference.opt_in_status != OptInStatus.OPTED_IN:
            return False
        
        # Check if channel is enabled
        if not preference.enabled:
            return False
        
        # Check category filters
        if category:
            if (preference.blocked_categories and 
                category in preference.blocked_categories):
                return False
            
            if (preference.allowed_categories and 
                category not in preference.allowed_categories):
                return False
        
        # Check priority filter
        if priority and preference.priority_filter:
            priority_order = ["low", "normal", "high", "urgent"]
            min_priority_index = priority_order.index(preference.priority_filter)
            current_priority_index = priority_order.index(priority)
            
            if current_priority_index < min_priority_index:
                return False
        
        # Check quiet hours (unless emergency)
        if not is_emergency and preference.is_in_quiet_hours():
            return not self.emergency_bypass_quiet_hours
        
        return True
    
    def get_contact_info(self, channel: NotificationChannel) -> Optional[str]:
        """Get contact information for a channel."""
        return self.contact_info.get(channel.value)
    
    def update_last_notification(self, channel: NotificationChannel):
        """Update last notification timestamp for a channel."""
        if channel.value in self.channel_preferences:
            self.channel_preferences[channel.value].last_notification_at = datetime.utcnow()
    
    def get_rate_limit_info(self, channel: NotificationChannel) -> Dict[str, Optional[int]]:
        """Get rate limit information for a channel."""
        preference = self.get_channel_preference(channel)
        if not preference:
            return {"max_per_hour": None, "max_per_day": None}
        
        return {
            "max_per_hour": preference.max_per_hour,
            "max_per_day": preference.max_per_day
        }
    
    class Settings:
        name = "user_preferences"
        use_revision = True
        
        indexes = [
            [("user_id", 1)],  # Unique index
            [("updated_at", -1)],
            [("notifications_enabled", 1)],
            [("marketing_opted_in", 1)],
        ]
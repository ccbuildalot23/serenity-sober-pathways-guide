"""API schemas for request/response models."""

from .notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationUpdate,
    NotificationQuery,
    BulkNotificationCreate,
)
from .template import (
    TemplateCreate,
    TemplateResponse, 
    TemplateUpdate,
    TemplateRender,
    TemplateQuery,
)
from .user_preferences import (
    UserPreferencesCreate,
    UserPreferencesResponse,
    UserPreferencesUpdate,
    ChannelPreferenceUpdate,
    OptInRequest,
    OptOutRequest,
)
from .analytics import (
    DeliveryAnalytics,
    ChannelAnalytics,
    UserAnalytics,
    AnalyticsQuery,
)
from .common import (
    HealthCheck,
    ErrorResponse,
    SuccessResponse,
    PaginatedResponse,
)

__all__ = [
    # Notification schemas
    "NotificationCreate",
    "NotificationResponse", 
    "NotificationUpdate",
    "NotificationQuery",
    "BulkNotificationCreate",
    
    # Template schemas
    "TemplateCreate",
    "TemplateResponse",
    "TemplateUpdate", 
    "TemplateRender",
    "TemplateQuery",
    
    # User preference schemas
    "UserPreferencesCreate",
    "UserPreferencesResponse",
    "UserPreferencesUpdate",
    "ChannelPreferenceUpdate",
    "OptInRequest",
    "OptOutRequest",
    
    # Analytics schemas
    "DeliveryAnalytics",
    "ChannelAnalytics",
    "UserAnalytics",
    "AnalyticsQuery",
    
    # Common schemas
    "HealthCheck",
    "ErrorResponse",
    "SuccessResponse", 
    "PaginatedResponse",
]
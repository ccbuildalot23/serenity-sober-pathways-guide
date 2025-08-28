"""
Common schemas used across the API.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field


class SuccessResponse(BaseModel):
    """Standard success response."""
    success: bool = Field(default=True, description="Operation was successful")
    message: str = Field(..., description="Success message")
    data: Optional[Dict[str, Any]] = Field(None, description="Optional response data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")


class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = Field(default=False, description="Operation failed")
    error: str = Field(..., description="Error type or code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")


class HealthCheck(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Service health status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Check timestamp")
    version: str = Field(..., description="Service version")
    dependencies: Dict[str, str] = Field(default_factory=dict, description="Dependency status")
    metrics: Optional[Dict[str, Any]] = Field(None, description="Performance metrics")


# Generic type for paginated responses
T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""
    items: List[T] = Field(..., description="Page items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_previous: bool = Field(..., description="Has previous page")
    
    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int,
        page_size: int
    ) -> "PaginatedResponse[T]":
        """Create a paginated response."""
        total_pages = (total + page_size - 1) // page_size
        
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1
        )


class PaginationQuery(BaseModel):
    """Pagination query parameters."""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    
    def get_skip(self) -> int:
        """Calculate skip offset."""
        return (self.page - 1) * self.page_size


class SortOrder(str, Enum):
    """Sort order options."""
    ASC = "asc"
    DESC = "desc"


class DateRangeQuery(BaseModel):
    """Date range filter."""
    start_date: Optional[datetime] = Field(None, description="Start date (inclusive)")
    end_date: Optional[datetime] = Field(None, description="End date (inclusive)")
    
    def validate_range(self) -> bool:
        """Validate date range."""
        if self.start_date and self.end_date:
            return self.start_date <= self.end_date
        return True


class RateLimitInfo(BaseModel):
    """Rate limit information."""
    limit: int = Field(..., description="Rate limit")
    remaining: int = Field(..., description="Remaining requests")
    reset_time: datetime = Field(..., description="Rate limit reset time")
    retry_after: Optional[int] = Field(None, description="Seconds until retry allowed")


class WebSocketMessage(BaseModel):
    """WebSocket message format."""
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(..., description="Message data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    user_id: Optional[str] = Field(None, description="Target user ID")
    channel: Optional[str] = Field(None, description="WebSocket channel")


class BatchOperation(BaseModel):
    """Batch operation request."""
    operation: str = Field(..., description="Operation type")
    items: List[Dict[str, Any]] = Field(..., description="Items to process")
    options: Optional[Dict[str, Any]] = Field(None, description="Operation options")


class BatchResult(BaseModel):
    """Batch operation result."""
    total: int = Field(..., description="Total items processed")
    successful: int = Field(..., description="Successful operations")
    failed: int = Field(..., description="Failed operations")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Error details")
    results: List[Dict[str, Any]] = Field(default_factory=list, description="Operation results")


class ValidationError(BaseModel):
    """Field validation error."""
    field: str = Field(..., description="Field name")
    message: str = Field(..., description="Validation error message")
    value: Optional[Any] = Field(None, description="Invalid value")


class ApiKeyInfo(BaseModel):
    """API key information."""
    key_id: str = Field(..., description="Key identifier")
    name: str = Field(..., description="Key name")
    permissions: List[str] = Field(..., description="Key permissions")
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")
    last_used_at: Optional[datetime] = Field(None, description="Last usage timestamp")


class AuditSummary(BaseModel):
    """Audit event summary."""
    action: str = Field(..., description="Action performed")
    timestamp: datetime = Field(..., description="Event timestamp")
    user_id: Optional[str] = Field(None, description="User ID")
    success: bool = Field(..., description="Operation success")
    phi_accessed: bool = Field(default=False, description="PHI was accessed")


class MetricsSummary(BaseModel):
    """Service metrics summary."""
    notifications_sent: int = Field(default=0, description="Total notifications sent")
    delivery_rate: float = Field(default=0.0, description="Overall delivery rate")
    average_latency: float = Field(default=0.0, description="Average delivery latency (ms)")
    error_rate: float = Field(default=0.0, description="Error rate percentage")
    active_users: int = Field(default=0, description="Active users count")
    queue_size: int = Field(default=0, description="Current queue size")
    uptime: float = Field(default=0.0, description="Service uptime (hours)")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Metrics timestamp")
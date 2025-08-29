"""
Base notification provider interface and common functionality.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class ProviderStatus(str, Enum):
    """Provider delivery status."""
    SENT = "sent"
    DELIVERED = "delivered" 
    FAILED = "failed"
    REJECTED = "rejected"
    BOUNCED = "bounced"


class DeliveryResult(BaseModel):
    """Result of a notification delivery attempt."""
    
    success: bool = Field(..., description="Whether delivery was successful")
    status: ProviderStatus = Field(..., description="Delivery status")
    provider_message_id: Optional[str] = Field(None, description="Provider's message ID")
    
    # Cost information
    cost: Optional[float] = Field(None, description="Delivery cost")
    currency: Optional[str] = Field(None, description="Currency code")
    
    # Timing
    sent_at: datetime = Field(default_factory=datetime.utcnow, description="Send timestamp")
    delivered_at: Optional[datetime] = Field(None, description="Delivery timestamp")
    
    # Error information
    error_message: Optional[str] = Field(None, description="Error message if failed")
    error_code: Optional[str] = Field(None, description="Provider error code") 
    
    # Provider-specific data
    provider_data: Optional[Dict[str, Any]] = Field(None, description="Additional provider data")
    
    # Retry information
    retryable: bool = Field(default=True, description="Whether failure is retryable")
    retry_after: Optional[int] = Field(None, description="Seconds to wait before retry")


class ProviderError(Exception):
    """Base exception for provider errors."""
    
    def __init__(
        self, 
        message: str, 
        error_code: Optional[str] = None,
        retryable: bool = True,
        retry_after: Optional[int] = None
    ):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.retryable = retryable
        self.retry_after = retry_after


class NotificationProvider(ABC):
    """
    Abstract base class for notification providers.
    All providers must implement this interface.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize provider with configuration."""
        self.config = config
        self._validate_config()
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Get the provider name."""
        pass
    
    @property
    @abstractmethod
    def supported_channels(self) -> list[str]:
        """Get list of supported channels."""
        pass
    
    @abstractmethod
    def _validate_config(self) -> None:
        """Validate provider configuration."""
        pass
    
    @abstractmethod
    async def send_notification(
        self,
        recipient: str,
        message: str,
        subject: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> DeliveryResult:
        """
        Send a notification.
        
        Args:
            recipient: Recipient address (phone, email, token)
            message: Message content
            subject: Message subject (for email)
            options: Provider-specific options
            
        Returns:
            DeliveryResult with send status and metadata
            
        Raises:
            ProviderError: If send fails
        """
        pass
    
    @abstractmethod
    async def get_delivery_status(self, message_id: str) -> DeliveryResult:
        """
        Get delivery status for a message.
        
        Args:
            message_id: Provider message ID
            
        Returns:
            DeliveryResult with current status
            
        Raises:
            ProviderError: If status check fails
        """
        pass
    
    async def validate_recipient(self, recipient: str) -> bool:
        """
        Validate recipient format.
        
        Args:
            recipient: Recipient to validate
            
        Returns:
            True if valid, False otherwise
        """
        # Default implementation - providers should override
        return bool(recipient and len(recipient) > 0)
    
    async def estimate_cost(
        self, 
        recipient: str, 
        message: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Optional[float]:
        """
        Estimate delivery cost.
        
        Args:
            recipient: Recipient address
            message: Message content
            options: Provider-specific options
            
        Returns:
            Estimated cost or None if not available
        """
        # Default implementation - providers should override
        return None
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check provider health.
        
        Returns:
            Health status information
        """
        return {
            "provider": self.provider_name,
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_rate_limits(self) -> Dict[str, int]:
        """
        Get provider rate limits.
        
        Returns:
            Dictionary with rate limit information
        """
        # Default implementation - providers should override
        return {
            "requests_per_minute": 60,
            "requests_per_hour": 1000,
            "requests_per_day": 10000
        }
    
    def supports_batch(self) -> bool:
        """Check if provider supports batch sending."""
        return False
    
    async def send_batch(
        self,
        recipients: list[str],
        message: str,
        subject: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> list[DeliveryResult]:
        """
        Send notifications to multiple recipients.
        
        Args:
            recipients: List of recipient addresses
            message: Message content
            subject: Message subject (for email)
            options: Provider-specific options
            
        Returns:
            List of DeliveryResult objects
            
        Raises:
            NotImplementedError: If batch sending not supported
        """
        if not self.supports_batch():
            raise NotImplementedError("Batch sending not supported by this provider")
        
        # Default implementation sends individually
        results = []
        for recipient in recipients:
            try:
                result = await self.send_notification(recipient, message, subject, options)
                results.append(result)
            except ProviderError as e:
                results.append(DeliveryResult(
                    success=False,
                    status=ProviderStatus.FAILED,
                    error_message=str(e),
                    error_code=e.error_code,
                    retryable=e.retryable
                ))
        
        return results
    
    def _build_error_result(
        self,
        error: Exception,
        retryable: bool = True
    ) -> DeliveryResult:
        """Build a DeliveryResult for an error."""
        return DeliveryResult(
            success=False,
            status=ProviderStatus.FAILED,
            error_message=str(error),
            error_code=getattr(error, 'error_code', None),
            retryable=retryable
        )
    
    def _sanitize_message(self, message: str, max_length: Optional[int] = None) -> str:
        """Sanitize message content."""
        # Remove null bytes
        sanitized = message.replace('\x00', '')
        
        # Limit length if specified
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        # Strip whitespace
        return sanitized.strip()
    
    def _extract_country_code(self, phone_number: str) -> Optional[str]:
        """Extract country code from phone number."""
        if phone_number.startswith('+'):
            # Simple extraction - in production use libphonenumber
            return phone_number[1:4]  # Assume 1-3 digit country code
        return None
    
    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation."""
        return '@' in email and '.' in email.split('@')[-1]
    
    def _is_valid_phone(self, phone: str) -> bool:
        """Basic phone number validation."""
        return (phone.startswith('+') and 
                len(phone) >= 10 and 
                phone[1:].replace('-', '').replace(' ', '').isdigit())
    
    def __str__(self) -> str:
        """String representation."""
        return f"{self.provider_name}Provider"
    
    def __repr__(self) -> str:
        """Detailed representation."""
        return f"{self.provider_name}Provider(channels={self.supported_channels})"
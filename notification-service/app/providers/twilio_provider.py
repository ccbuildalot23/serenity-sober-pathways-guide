"""
Twilio provider for SMS and WhatsApp notifications.
"""

import re
from typing import Any, Dict, Optional

import httpx
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from ..core.config import settings
from ..core.logging import get_logger
from ..core.security import mask_sensitive_data
from .base import NotificationProvider, ProviderError, DeliveryResult, ProviderStatus

logger = get_logger(__name__)


class TwilioSMSProvider(NotificationProvider):
    """Twilio SMS notification provider."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize Twilio SMS provider."""
        if config is None:
            config = {
                "account_sid": settings.twilio_account_sid,
                "auth_token": settings.twilio_auth_token,
                "phone_number": settings.twilio_phone_number,
            }
        
        super().__init__(config)
        self.client = Client(config["account_sid"], config["auth_token"])
    
    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "twilio_sms"
    
    @property
    def supported_channels(self) -> list[str]:
        """Get supported channels."""
        return ["sms"]
    
    def _validate_config(self) -> None:
        """Validate Twilio configuration."""
        required_fields = ["account_sid", "auth_token", "phone_number"]
        
        for field in required_fields:
            if not self.config.get(field):
                raise ValueError(f"Missing required Twilio config: {field}")
        
        # Validate phone number format
        phone_number = self.config["phone_number"]
        if not phone_number.startswith("+") or not phone_number[1:].isdigit():
            raise ValueError("Twilio phone number must be in E.164 format")
    
    async def send_notification(
        self,
        recipient: str,
        message: str,
        subject: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> DeliveryResult:
        """
        Send SMS notification via Twilio.
        
        Args:
            recipient: Phone number in E.164 format
            message: SMS message content
            subject: Ignored for SMS
            options: Twilio-specific options
            
        Returns:
            DeliveryResult with send status
        """
        try:
            # Validate recipient
            if not await self.validate_recipient(recipient):
                raise ProviderError(
                    f"Invalid SMS recipient: {mask_sensitive_data(recipient)}",
                    error_code="INVALID_RECIPIENT",
                    retryable=False
                )
            
            # Sanitize message
            sanitized_message = self._sanitize_message(message, max_length=1600)
            if not sanitized_message:
                raise ProviderError(
                    "Message content is empty after sanitization",
                    error_code="EMPTY_MESSAGE",
                    retryable=False
                )
            
            # Prepare Twilio message parameters
            message_params = {
                "body": sanitized_message,
                "from_": self.config["phone_number"],
                "to": recipient,
            }
            
            # Apply options
            if options:
                if "status_callback" in options:
                    message_params["status_callback"] = options["status_callback"]
                if "validity_period" in options:
                    message_params["validity_period"] = options["validity_period"]
                if "max_price" in options:
                    message_params["max_price"] = options["max_price"]
            
            logger.info(
                "Sending SMS via Twilio",
                recipient=mask_sensitive_data(recipient),
                message_length=len(sanitized_message),
                provider="twilio_sms"
            )
            
            # Send message
            twilio_message = self.client.messages.create(**message_params)
            
            # Map Twilio status to our status
            status = self._map_twilio_status(twilio_message.status)
            
            result = DeliveryResult(
                success=True,
                status=status,
                provider_message_id=twilio_message.sid,
                cost=float(twilio_message.price or 0) if twilio_message.price else None,
                currency=twilio_message.price_unit,
                provider_data={
                    "status": twilio_message.status,
                    "direction": twilio_message.direction,
                    "num_segments": twilio_message.num_segments,
                    "error_code": twilio_message.error_code,
                    "error_message": twilio_message.error_message,
                }
            )
            
            logger.info(
                "SMS sent successfully",
                message_id=twilio_message.sid,
                status=twilio_message.status,
                cost=twilio_message.price,
                provider="twilio_sms"
            )
            
            return result
            
        except TwilioRestException as e:
            logger.error(
                "Twilio SMS error",
                error_code=e.code,
                error_message=e.msg,
                status_code=e.status,
                recipient=mask_sensitive_data(recipient),
                provider="twilio_sms"
            )
            
            raise ProviderError(
                f"Twilio SMS error: {e.msg}",
                error_code=str(e.code),
                retryable=self._is_retryable_error(e.code)
            )
            
        except Exception as e:
            logger.error(
                "Unexpected SMS error",
                error=str(e),
                recipient=mask_sensitive_data(recipient),
                provider="twilio_sms"
            )
            
            raise ProviderError(
                f"Unexpected SMS error: {str(e)}",
                retryable=True
            )
    
    async def get_delivery_status(self, message_id: str) -> DeliveryResult:
        """Get SMS delivery status from Twilio."""
        try:
            twilio_message = self.client.messages(message_id).fetch()
            
            status = self._map_twilio_status(twilio_message.status)
            
            return DeliveryResult(
                success=twilio_message.status not in ["failed", "undelivered"],
                status=status,
                provider_message_id=message_id,
                cost=float(twilio_message.price or 0) if twilio_message.price else None,
                currency=twilio_message.price_unit,
                delivered_at=twilio_message.date_updated if twilio_message.status == "delivered" else None,
                error_message=twilio_message.error_message,
                error_code=str(twilio_message.error_code) if twilio_message.error_code else None,
                provider_data={
                    "status": twilio_message.status,
                    "direction": twilio_message.direction,
                    "num_segments": twilio_message.num_segments,
                }
            )
            
        except TwilioRestException as e:
            raise ProviderError(
                f"Failed to get SMS status: {e.msg}",
                error_code=str(e.code),
                retryable=True
            )
    
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate SMS recipient phone number."""
        if not recipient:
            return False
        
        # Basic E.164 format validation
        if not recipient.startswith("+"):
            return False
        
        # Remove + and check if remaining characters are digits
        digits_only = recipient[1:]
        if not digits_only.isdigit():
            return False
        
        # Check length (minimum 10 digits, maximum 15)
        if len(digits_only) < 10 or len(digits_only) > 15:
            return False
        
        return True
    
    async def estimate_cost(
        self,
        recipient: str,
        message: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Optional[float]:
        """Estimate SMS cost based on message length and destination."""
        # Simple estimation - in production, use Twilio pricing API
        message_length = len(message)
        segments = (message_length + 159) // 160  # SMS segment calculation
        
        # Base cost per segment (varies by destination)
        cost_per_segment = 0.0075  # USD
        
        # Adjust based on destination country
        country_code = self._extract_country_code(recipient)
        if country_code == "1":  # US/Canada
            cost_per_segment = 0.0075
        elif country_code in ["44", "33", "49"]:  # UK, France, Germany
            cost_per_segment = 0.05
        else:
            cost_per_segment = 0.10  # International
        
        return segments * cost_per_segment
    
    def get_rate_limits(self) -> Dict[str, int]:
        """Get Twilio SMS rate limits."""
        return {
            "requests_per_second": 10,
            "requests_per_minute": 600,
            "requests_per_hour": 36000,
            "requests_per_day": 200000
        }
    
    def _map_twilio_status(self, twilio_status: str) -> ProviderStatus:
        """Map Twilio status to our status enum."""
        status_map = {
            "queued": ProviderStatus.SENT,
            "sending": ProviderStatus.SENT,
            "sent": ProviderStatus.SENT,
            "received": ProviderStatus.DELIVERED,
            "delivered": ProviderStatus.DELIVERED,
            "undelivered": ProviderStatus.FAILED,
            "failed": ProviderStatus.FAILED,
        }
        
        return status_map.get(twilio_status, ProviderStatus.SENT)
    
    def _is_retryable_error(self, error_code: int) -> bool:
        """Check if Twilio error is retryable."""
        # Non-retryable errors
        non_retryable = [
            21211,  # Invalid phone number
            21612,  # SMS not supported for this phone number
            21614,  # Invalid phone number format
            30007,  # Message blocked (spam)
            30008,  # Unknown error
        ]
        
        return error_code not in non_retryable


class TwilioWhatsAppProvider(NotificationProvider):
    """Twilio WhatsApp notification provider."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize Twilio WhatsApp provider."""
        if config is None:
            config = {
                "account_sid": settings.twilio_account_sid,
                "auth_token": settings.twilio_auth_token,
                "whatsapp_number": settings.twilio_whatsapp_number,
            }
        
        super().__init__(config)
        self.client = Client(config["account_sid"], config["auth_token"])
    
    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "twilio_whatsapp"
    
    @property
    def supported_channels(self) -> list[str]:
        """Get supported channels."""
        return ["whatsapp"]
    
    def _validate_config(self) -> None:
        """Validate Twilio WhatsApp configuration."""
        required_fields = ["account_sid", "auth_token", "whatsapp_number"]
        
        for field in required_fields:
            if not self.config.get(field):
                raise ValueError(f"Missing required Twilio WhatsApp config: {field}")
        
        # Validate WhatsApp number format
        whatsapp_number = self.config["whatsapp_number"]
        if not whatsapp_number.startswith("whatsapp:+"):
            raise ValueError("Twilio WhatsApp number must start with 'whatsapp:+'")
    
    async def send_notification(
        self,
        recipient: str,
        message: str,
        subject: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> DeliveryResult:
        """Send WhatsApp notification via Twilio."""
        try:
            # Validate recipient
            if not await self.validate_recipient(recipient):
                raise ProviderError(
                    f"Invalid WhatsApp recipient: {mask_sensitive_data(recipient)}",
                    error_code="INVALID_RECIPIENT",
                    retryable=False
                )
            
            # Sanitize message
            sanitized_message = self._sanitize_message(message, max_length=4096)
            
            # Prepare message parameters
            message_params = {
                "body": sanitized_message,
                "from_": self.config["whatsapp_number"],
                "to": recipient,
            }
            
            # Apply options
            if options:
                if "status_callback" in options:
                    message_params["status_callback"] = options["status_callback"]
                if "media_url" in options:
                    message_params["media_url"] = options["media_url"]
            
            logger.info(
                "Sending WhatsApp message via Twilio",
                recipient=mask_sensitive_data(recipient),
                message_length=len(sanitized_message),
                provider="twilio_whatsapp"
            )
            
            # Send message
            twilio_message = self.client.messages.create(**message_params)
            
            status = self._map_twilio_status(twilio_message.status)
            
            result = DeliveryResult(
                success=True,
                status=status,
                provider_message_id=twilio_message.sid,
                provider_data={
                    "status": twilio_message.status,
                    "direction": twilio_message.direction,
                    "error_code": twilio_message.error_code,
                    "error_message": twilio_message.error_message,
                }
            )
            
            logger.info(
                "WhatsApp message sent successfully",
                message_id=twilio_message.sid,
                status=twilio_message.status,
                provider="twilio_whatsapp"
            )
            
            return result
            
        except TwilioRestException as e:
            logger.error(
                "Twilio WhatsApp error",
                error_code=e.code,
                error_message=e.msg,
                status_code=e.status,
                recipient=mask_sensitive_data(recipient),
                provider="twilio_whatsapp"
            )
            
            raise ProviderError(
                f"Twilio WhatsApp error: {e.msg}",
                error_code=str(e.code),
                retryable=self._is_retryable_error(e.code)
            )
    
    async def get_delivery_status(self, message_id: str) -> DeliveryResult:
        """Get WhatsApp delivery status from Twilio."""
        try:
            twilio_message = self.client.messages(message_id).fetch()
            
            status = self._map_twilio_status(twilio_message.status)
            
            return DeliveryResult(
                success=twilio_message.status not in ["failed", "undelivered"],
                status=status,
                provider_message_id=message_id,
                delivered_at=twilio_message.date_updated if twilio_message.status == "delivered" else None,
                error_message=twilio_message.error_message,
                error_code=str(twilio_message.error_code) if twilio_message.error_code else None,
                provider_data={
                    "status": twilio_message.status,
                    "direction": twilio_message.direction,
                }
            )
            
        except TwilioRestException as e:
            raise ProviderError(
                f"Failed to get WhatsApp status: {e.msg}",
                error_code=str(e.code),
                retryable=True
            )
    
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate WhatsApp recipient."""
        if not recipient or not recipient.startswith("whatsapp:+"):
            return False
        
        # Extract phone number part
        phone_part = recipient[10:]  # Remove "whatsapp:+"
        
        # Validate phone number
        if not phone_part.isdigit() or len(phone_part) < 10 or len(phone_part) > 15:
            return False
        
        return True
    
    def get_rate_limits(self) -> Dict[str, int]:
        """Get Twilio WhatsApp rate limits."""
        return {
            "requests_per_second": 1,  # WhatsApp has stricter limits
            "requests_per_minute": 60,
            "requests_per_hour": 1000,
            "requests_per_day": 10000
        }
    
    def _map_twilio_status(self, twilio_status: str) -> ProviderStatus:
        """Map Twilio status to our status enum."""
        return TwilioSMSProvider._map_twilio_status(self, twilio_status)
    
    def _is_retryable_error(self, error_code: int) -> bool:
        """Check if Twilio WhatsApp error is retryable."""
        return TwilioSMSProvider._is_retryable_error(self, error_code)
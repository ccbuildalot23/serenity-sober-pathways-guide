"""
SendGrid provider for email notifications.
"""

import re
from typing import Any, Dict, List, Optional

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, From, To, Content, Attachment, FileContent, FileName, FileType, Disposition

from ..core.config import settings
from ..core.logging import get_logger
from ..core.security import mask_sensitive_data
from .base import NotificationProvider, ProviderError, DeliveryResult, ProviderStatus

logger = get_logger(__name__)


class SendGridEmailProvider(NotificationProvider):
    """SendGrid email notification provider."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize SendGrid provider."""
        if config is None:
            config = {
                "api_key": settings.sendgrid_api_key,
                "from_email": settings.sendgrid_from_email,
                "from_name": settings.sendgrid_from_name,
            }
        
        super().__init__(config)
        self.client = SendGridAPIClient(api_key=config["api_key"])
    
    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "sendgrid"
    
    @property
    def supported_channels(self) -> list[str]:
        """Get supported channels."""
        return ["email"]
    
    def _validate_config(self) -> None:
        """Validate SendGrid configuration."""
        required_fields = ["api_key", "from_email", "from_name"]
        
        for field in required_fields:
            if not self.config.get(field):
                raise ValueError(f"Missing required SendGrid config: {field}")
        
        # Validate from email
        if not self._is_valid_email(self.config["from_email"]):
            raise ValueError("Invalid SendGrid from_email format")
    
    async def send_notification(
        self,
        recipient: str,
        message: str,
        subject: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> DeliveryResult:
        """
        Send email notification via SendGrid.
        
        Args:
            recipient: Email address
            message: Email content (HTML or plain text)
            subject: Email subject line
            options: SendGrid-specific options
            
        Returns:
            DeliveryResult with send status
        """
        try:
            # Validate recipient
            if not await self.validate_recipient(recipient):
                raise ProviderError(
                    f"Invalid email recipient: {mask_sensitive_data(recipient)}",
                    error_code="INVALID_RECIPIENT",
                    retryable=False
                )
            
            # Sanitize content
            subject = subject or "Notification from Serenity"
            sanitized_subject = self._sanitize_message(subject, max_length=200)
            sanitized_message = self._sanitize_message(message, max_length=100000)
            
            if not sanitized_message:
                raise ProviderError(
                    "Message content is empty after sanitization",
                    error_code="EMPTY_MESSAGE",
                    retryable=False
                )
            
            # Prepare email
            from_email = From(self.config["from_email"], self.config["from_name"])
            to_email = To(recipient)
            
            # Detect content type
            is_html = self._is_html_content(sanitized_message)
            content_type = "text/html" if is_html else "text/plain"
            content = Content(content_type, sanitized_message)
            
            # Create mail object
            mail = Mail(from_email, to_email, sanitized_subject, content)
            
            # Apply options
            if options:
                await self._apply_sendgrid_options(mail, options)
            
            # Add tracking
            mail.tracking_settings = {
                "click_tracking": {"enable": True},
                "open_tracking": {"enable": True},
                "subscription_tracking": {"enable": False},  # HIPAA compliance
            }
            
            logger.info(
                "Sending email via SendGrid",
                recipient=mask_sensitive_data(recipient),
                subject=sanitized_subject,
                content_type=content_type,
                message_length=len(sanitized_message),
                provider="sendgrid"
            )
            
            # Send email
            response = self.client.send(mail)
            
            # Extract message ID from response headers
            message_id = self._extract_message_id(response.headers)
            
            result = DeliveryResult(
                success=response.status_code in [200, 202],
                status=ProviderStatus.SENT if response.status_code in [200, 202] else ProviderStatus.FAILED,
                provider_message_id=message_id,
                provider_data={
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "body": response.body.decode() if response.body else None,
                }
            )
            
            if response.status_code not in [200, 202]:
                error_msg = f"SendGrid API error: {response.status_code}"
                if response.body:
                    error_msg += f" - {response.body.decode()}"
                
                logger.error(
                    "SendGrid email failed",
                    status_code=response.status_code,
                    response_body=response.body.decode() if response.body else None,
                    recipient=mask_sensitive_data(recipient),
                    provider="sendgrid"
                )
                
                raise ProviderError(
                    error_msg,
                    error_code=str(response.status_code),
                    retryable=response.status_code >= 500
                )
            
            logger.info(
                "Email sent successfully via SendGrid",
                message_id=message_id,
                status_code=response.status_code,
                recipient=mask_sensitive_data(recipient),
                provider="sendgrid"
            )
            
            return result
            
        except Exception as e:
            if isinstance(e, ProviderError):
                raise
            
            logger.error(
                "Unexpected SendGrid error",
                error=str(e),
                recipient=mask_sensitive_data(recipient),
                provider="sendgrid"
            )
            
            raise ProviderError(
                f"Unexpected email error: {str(e)}",
                retryable=True
            )
    
    async def get_delivery_status(self, message_id: str) -> DeliveryResult:
        """Get email delivery status from SendGrid."""
        try:
            # Use SendGrid Events API to get delivery status
            # This is a simplified implementation
            # In production, you'd typically use webhooks for real-time status
            
            # For now, return a basic result since SendGrid doesn't have
            # a simple status API like Twilio
            return DeliveryResult(
                success=True,
                status=ProviderStatus.SENT,
                provider_message_id=message_id,
                provider_data={"note": "Status tracking via webhooks recommended"}
            )
            
        except Exception as e:
            raise ProviderError(
                f"Failed to get email status: {str(e)}",
                retryable=True
            )
    
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate email recipient."""
        if not recipient:
            return False
        
        # Basic email validation
        if not self._is_valid_email(recipient):
            return False
        
        # Additional checks
        if len(recipient) > 254:  # RFC 5321 limit
            return False
        
        return True
    
    async def estimate_cost(
        self,
        recipient: str,
        message: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Optional[float]:
        """Estimate email cost."""
        # SendGrid pricing is typically per email sent
        base_cost = 0.0006  # USD per email for high volume plans
        
        # Adjust for attachments
        if options and "attachments" in options:
            attachment_count = len(options["attachments"])
            base_cost += attachment_count * 0.0001  # Small additional cost
        
        return base_cost
    
    def get_rate_limits(self) -> Dict[str, int]:
        """Get SendGrid rate limits."""
        return {
            "requests_per_second": 100,
            "requests_per_minute": 6000,
            "requests_per_hour": 100000,
            "requests_per_day": 1000000
        }
    
    def supports_batch(self) -> bool:
        """SendGrid supports batch sending."""
        return True
    
    async def send_batch(
        self,
        recipients: List[str],
        message: str,
        subject: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> List[DeliveryResult]:
        """Send batch emails via SendGrid."""
        try:
            if len(recipients) > 1000:  # SendGrid limit
                raise ProviderError(
                    "Too many recipients for batch send (max 1000)",
                    error_code="TOO_MANY_RECIPIENTS",
                    retryable=False
                )
            
            # Validate all recipients first
            valid_recipients = []
            results = []
            
            for recipient in recipients:
                if await self.validate_recipient(recipient):
                    valid_recipients.append(recipient)
                else:
                    results.append(DeliveryResult(
                        success=False,
                        status=ProviderStatus.FAILED,
                        error_message=f"Invalid email: {mask_sensitive_data(recipient)}",
                        error_code="INVALID_RECIPIENT",
                        retryable=False
                    ))
            
            if not valid_recipients:
                return results
            
            # Prepare batch email
            subject = subject or "Notification from Serenity"
            sanitized_subject = self._sanitize_message(subject, max_length=200)
            sanitized_message = self._sanitize_message(message, max_length=100000)
            
            from_email = From(self.config["from_email"], self.config["from_name"])
            
            # Create personalizations for each recipient
            mail = Mail()
            mail.from_email = from_email
            mail.subject = sanitized_subject
            
            # Detect content type
            is_html = self._is_html_content(sanitized_message)
            content_type = "text/html" if is_html else "text/plain"
            mail.add_content(Content(content_type, sanitized_message))
            
            # Add recipients
            for recipient in valid_recipients:
                mail.add_to(To(recipient))
            
            # Apply options
            if options:
                await self._apply_sendgrid_options(mail, options)
            
            # Send batch
            response = self.client.send(mail)
            
            # Create results for all valid recipients
            message_id = self._extract_message_id(response.headers)
            success = response.status_code in [200, 202]
            
            for recipient in valid_recipients:
                results.append(DeliveryResult(
                    success=success,
                    status=ProviderStatus.SENT if success else ProviderStatus.FAILED,
                    provider_message_id=message_id,
                    provider_data={
                        "status_code": response.status_code,
                        "batch_send": True,
                    }
                ))
            
            logger.info(
                "Batch email sent via SendGrid",
                recipient_count=len(valid_recipients),
                message_id=message_id,
                status_code=response.status_code,
                provider="sendgrid"
            )
            
            return results
            
        except Exception as e:
            # Return failure for all recipients
            error_result = DeliveryResult(
                success=False,
                status=ProviderStatus.FAILED,
                error_message=str(e),
                retryable=True
            )
            
            return [error_result for _ in recipients]
    
    async def _apply_sendgrid_options(self, mail: Mail, options: Dict[str, Any]) -> None:
        """Apply SendGrid-specific options to mail object."""
        if "reply_to" in options:
            mail.reply_to = options["reply_to"]
        
        if "attachments" in options:
            for attachment_data in options["attachments"]:
                attachment = Attachment(
                    FileContent(attachment_data["content"]),
                    FileName(attachment_data["filename"]),
                    FileType(attachment_data.get("type", "application/octet-stream")),
                    Disposition("attachment")
                )
                mail.add_attachment(attachment)
        
        if "categories" in options:
            for category in options["categories"]:
                mail.add_category(category)
        
        if "custom_args" in options:
            for key, value in options["custom_args"].items():
                mail.add_custom_arg(key, value)
        
        if "send_at" in options:
            mail.send_at = options["send_at"]
    
    def _is_html_content(self, content: str) -> bool:
        """Check if content is HTML."""
        html_tags = re.compile(r'<[^>]+>')
        return bool(html_tags.search(content))
    
    def _extract_message_id(self, headers: Dict[str, str]) -> Optional[str]:
        """Extract message ID from SendGrid response headers."""
        # SendGrid typically returns message ID in X-Message-Id header
        return headers.get('X-Message-Id') or headers.get('x-message-id')
    
    def _is_valid_email(self, email: str) -> bool:
        """Enhanced email validation."""
        if not email or '@' not in email:
            return False
        
        # Basic regex for email validation
        email_pattern = re.compile(
            r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        )
        
        return bool(email_pattern.match(email))
    
    async def health_check(self) -> Dict[str, Any]:
        """Check SendGrid API health."""
        try:
            # Try to get API key info (this is a lightweight API call)
            response = self.client.client.api_keys.get()
            
            return {
                "provider": self.provider_name,
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "timestamp": "datetime.utcnow().isoformat()",
                "api_status_code": response.status_code
            }
            
        except Exception as e:
            return {
                "provider": self.provider_name,
                "status": "unhealthy",
                "timestamp": "datetime.utcnow().isoformat()",
                "error": str(e)
            }
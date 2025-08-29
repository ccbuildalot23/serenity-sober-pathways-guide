"""
Firebase Cloud Messaging (FCM) provider for push notifications.
"""

import json
from typing import Any, Dict, List, Optional

from pyfcm import FCMNotification

from ..core.config import settings
from ..core.logging import get_logger
from ..core.security import mask_sensitive_data
from .base import NotificationProvider, ProviderError, DeliveryResult, ProviderStatus

logger = get_logger(__name__)


class FCMPushProvider(NotificationProvider):
    """Firebase Cloud Messaging push notification provider."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize FCM provider."""
        if config is None:
            config = {
                "server_key": settings.fcm_server_key,
                "sender_id": settings.fcm_sender_id,
            }
        
        super().__init__(config)
        self.client = FCMNotification(api_key=config["server_key"])
    
    @property
    def provider_name(self) -> str:
        """Get provider name."""
        return "fcm"
    
    @property
    def supported_channels(self) -> list[str]:
        """Get supported channels."""
        return ["push"]
    
    def _validate_config(self) -> None:
        """Validate FCM configuration."""
        required_fields = ["server_key", "sender_id"]
        
        for field in required_fields:
            if not self.config.get(field):
                raise ValueError(f"Missing required FCM config: {field}")
    
    async def send_notification(
        self,
        recipient: str,
        message: str,
        subject: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> DeliveryResult:
        """
        Send push notification via FCM.
        
        Args:
            recipient: FCM registration token or topic
            message: Notification body
            subject: Notification title
            options: FCM-specific options
            
        Returns:
            DeliveryResult with send status
        """
        try:
            # Validate recipient
            if not await self.validate_recipient(recipient):
                raise ProviderError(
                    f"Invalid push token: {mask_sensitive_data(recipient)}",
                    error_code="INVALID_TOKEN",
                    retryable=False
                )
            
            # Sanitize content
            title = subject or "Serenity Notification"
            sanitized_title = self._sanitize_message(title, max_length=100)
            sanitized_message = self._sanitize_message(message, max_length=500)
            
            if not sanitized_message:
                raise ProviderError(
                    "Message content is empty after sanitization",
                    error_code="EMPTY_MESSAGE",
                    retryable=False
                )
            
            # Prepare notification data
            notification_data = {
                "title": sanitized_title,
                "body": sanitized_message,
            }
            
            # Prepare data payload
            data_payload = {}
            if options:
                if "data" in options:
                    data_payload.update(options["data"])
                
                # Add notification options
                if "icon" in options:
                    notification_data["icon"] = options["icon"]
                if "sound" in options:
                    notification_data["sound"] = options["sound"]
                if "color" in options:
                    notification_data["color"] = options["color"]
                if "badge" in options:
                    notification_data["badge"] = options["badge"]
            
            logger.info(
                "Sending push notification via FCM",
                recipient=mask_sensitive_data(recipient),
                title=sanitized_title,
                message_length=len(sanitized_message),
                provider="fcm"
            )
            
            # Send notification
            if recipient.startswith("/topics/"):
                # Topic notification
                result = self.client.notify_topic_subscribers(
                    topic_name=recipient.replace("/topics/", ""),
                    message_title=notification_data["title"],
                    message_body=notification_data["body"],
                    data_message=data_payload if data_payload else None,
                    sound=notification_data.get("sound"),
                    color=notification_data.get("color"),
                    badge=notification_data.get("badge"),
                )
            else:
                # Single device notification
                result = self.client.notify_single_device(
                    registration_id=recipient,
                    message_title=notification_data["title"],
                    message_body=notification_data["body"],
                    data_message=data_payload if data_payload else None,
                    sound=notification_data.get("sound"),
                    color=notification_data.get("color"),
                    badge=notification_data.get("badge"),
                )
            
            # Parse FCM response
            success = result.get("success", 0) > 0
            failure_count = result.get("failure", 0)
            message_id = None
            
            if "results" in result and result["results"]:
                first_result = result["results"][0]
                message_id = first_result.get("message_id")
            
            # Handle failures
            if failure_count > 0 and "results" in result:
                error_result = result["results"][0] if result["results"] else {}
                error_code = error_result.get("error")
                
                if error_code:
                    logger.error(
                        "FCM push notification failed",
                        error_code=error_code,
                        recipient=mask_sensitive_data(recipient),
                        provider="fcm"
                    )
                    
                    raise ProviderError(
                        f"FCM error: {error_code}",
                        error_code=error_code,
                        retryable=self._is_retryable_error(error_code)
                    )
            
            delivery_result = DeliveryResult(
                success=success,
                status=ProviderStatus.SENT if success else ProviderStatus.FAILED,
                provider_message_id=message_id,
                provider_data={
                    "success_count": result.get("success", 0),
                    "failure_count": result.get("failure", 0),
                    "canonical_ids": result.get("canonical_ids", 0),
                    "multicast_id": result.get("multicast_id"),
                }
            )
            
            logger.info(
                "Push notification sent via FCM",
                message_id=message_id,
                success_count=result.get("success", 0),
                failure_count=result.get("failure", 0),
                provider="fcm"
            )
            
            return delivery_result
            
        except Exception as e:
            if isinstance(e, ProviderError):
                raise
            
            logger.error(
                "Unexpected FCM error",
                error=str(e),
                recipient=mask_sensitive_data(recipient),
                provider="fcm"
            )
            
            raise ProviderError(
                f"Unexpected push notification error: {str(e)}",
                retryable=True
            )
    
    async def get_delivery_status(self, message_id: str) -> DeliveryResult:
        """Get push notification delivery status."""
        # FCM doesn't provide a direct API to query message status by ID
        # Status updates typically come via webhooks or client SDK callbacks
        return DeliveryResult(
            success=True,
            status=ProviderStatus.SENT,
            provider_message_id=message_id,
            provider_data={"note": "FCM status tracking via client SDK callbacks"}
        )
    
    async def validate_recipient(self, recipient: str) -> bool:
        """Validate FCM recipient (token or topic)."""
        if not recipient:
            return False
        
        # Topic format
        if recipient.startswith("/topics/"):
            topic_name = recipient[8:]  # Remove "/topics/"
            # Topic names should match: [a-zA-Z0-9-_.~%]+
            import re
            topic_pattern = re.compile(r'^[a-zA-Z0-9\-_.~%]+$')
            return bool(topic_pattern.match(topic_name))
        
        # Registration token format (base64-like string)
        # FCM tokens are typically long alphanumeric strings
        if len(recipient) < 50:  # Tokens are usually much longer
            return False
        
        # Basic check for valid characters
        import re
        token_pattern = re.compile(r'^[a-zA-Z0-9:_-]+$')
        return bool(token_pattern.match(recipient))
    
    async def estimate_cost(
        self,
        recipient: str,
        message: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Optional[float]:
        """Estimate push notification cost."""
        # FCM is free for most use cases
        return 0.0
    
    def get_rate_limits(self) -> Dict[str, int]:
        """Get FCM rate limits."""
        return {
            "requests_per_minute": 600000,  # FCM has very high limits
            "requests_per_hour": 36000000,
            "requests_per_day": 1000000000,
            "concurrent_connections": 1000,
        }
    
    def supports_batch(self) -> bool:
        """FCM supports batch sending."""
        return True
    
    async def send_batch(
        self,
        recipients: List[str],
        message: str,
        subject: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> List[DeliveryResult]:
        """Send batch push notifications via FCM."""
        try:
            if len(recipients) > 1000:  # FCM limit
                raise ProviderError(
                    "Too many recipients for batch send (max 1000)",
                    error_code="TOO_MANY_RECIPIENTS",
                    retryable=False
                )
            
            # Validate recipients
            valid_tokens = []
            results = []
            
            for recipient in recipients:
                if await self.validate_recipient(recipient):
                    if not recipient.startswith("/topics/"):  # Only tokens for batch
                        valid_tokens.append(recipient)
                    else:
                        # Topics need individual sending
                        topic_result = await self.send_notification(
                            recipient, message, subject, options
                        )
                        results.append(topic_result)
                else:
                    results.append(DeliveryResult(
                        success=False,
                        status=ProviderStatus.FAILED,
                        error_message=f"Invalid token: {mask_sensitive_data(recipient)}",
                        error_code="INVALID_TOKEN",
                        retryable=False
                    ))
            
            if not valid_tokens:
                return results
            
            # Prepare notification
            title = subject or "Serenity Notification"
            sanitized_title = self._sanitize_message(title, max_length=100)
            sanitized_message = self._sanitize_message(message, max_length=500)
            
            # Prepare data payload
            data_payload = {}
            if options and "data" in options:
                data_payload = options["data"]
            
            # Send batch notification
            batch_result = self.client.notify_multiple_devices(
                registration_ids=valid_tokens,
                message_title=sanitized_title,
                message_body=sanitized_message,
                data_message=data_payload if data_payload else None,
                sound=options.get("sound") if options else None,
                color=options.get("color") if options else None,
                badge=options.get("badge") if options else None,
            )
            
            # Parse batch results
            fcm_results = batch_result.get("results", [])
            
            for i, token in enumerate(valid_tokens):
                if i < len(fcm_results):
                    fcm_result = fcm_results[i]
                    
                    if "message_id" in fcm_result:
                        # Success
                        results.append(DeliveryResult(
                            success=True,
                            status=ProviderStatus.SENT,
                            provider_message_id=fcm_result["message_id"],
                            provider_data={"batch_send": True}
                        ))
                    elif "error" in fcm_result:
                        # Failure
                        error_code = fcm_result["error"]
                        results.append(DeliveryResult(
                            success=False,
                            status=ProviderStatus.FAILED,
                            error_message=f"FCM error: {error_code}",
                            error_code=error_code,
                            retryable=self._is_retryable_error(error_code),
                            provider_data={"batch_send": True}
                        ))
                    else:
                        # Unknown result
                        results.append(DeliveryResult(
                            success=False,
                            status=ProviderStatus.FAILED,
                            error_message="Unknown FCM batch result",
                            retryable=True,
                            provider_data={"batch_send": True}
                        ))
                else:
                    # Missing result
                    results.append(DeliveryResult(
                        success=False,
                        status=ProviderStatus.FAILED,
                        error_message="Missing FCM batch result",
                        retryable=True,
                        provider_data={"batch_send": True}
                    ))
            
            logger.info(
                "Batch push notifications sent via FCM",
                token_count=len(valid_tokens),
                success_count=batch_result.get("success", 0),
                failure_count=batch_result.get("failure", 0),
                provider="fcm"
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
    
    def _is_retryable_error(self, error_code: str) -> bool:
        """Check if FCM error is retryable."""
        # Non-retryable errors
        non_retryable = [
            "InvalidRegistration",
            "NotRegistered",
            "InvalidPackageName",
            "MismatchSenderId",
            "InvalidParameters",
            "MessageTooBig",
            "InvalidDataKey",
            "InvalidTtl",
        ]
        
        return error_code not in non_retryable
    
    async def health_check(self) -> Dict[str, Any]:
        """Check FCM service health."""
        try:
            # Try to send a test notification to a test topic
            # This is a lightweight way to test the API
            test_result = self.client.notify_topic_subscribers(
                topic_name="health_check_topic",
                message_title="Health Check",
                message_body="Testing FCM connectivity",
                dry_run=True  # Don't actually send
            )
            
            return {
                "provider": self.provider_name,
                "status": "healthy",
                "timestamp": "datetime.utcnow().isoformat()",
                "test_result": test_result
            }
            
        except Exception as e:
            return {
                "provider": self.provider_name,
                "status": "unhealthy", 
                "timestamp": "datetime.utcnow().isoformat()",
                "error": str(e)
            }
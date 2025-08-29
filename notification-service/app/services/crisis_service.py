"""
Crisis notification service for emergency alerts and escalation
"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import structlog
from geopy.distance import geodesic

from app.core.config import settings
from app.core.logging import audit_logger, security_logger
from app.schemas.notification import CrisisNotificationRequest, NotificationResponse
from app.models.crisis_alert import CrisisAlert, CrisisType, EscalationLevel
from app.models.notification import Notification, NotificationPriority
from app.models.user_preferences import UserPreferences
from app.services.notification_service import NotificationService
from app.providers.provider_factory import ProviderFactory
from app.services.websocket_manager import WebSocketManager

logger = structlog.get_logger(__name__)


class CrisisService:
    """Service for handling crisis notifications and emergency escalation"""
    
    def __init__(self):
        self.notification_service = NotificationService()
        self.provider_factory = ProviderFactory()
        self.websocket_manager = WebSocketManager()
        self._escalation_tasks: Dict[str, asyncio.Task] = {}
    
    async def send_crisis_notification(
        self,
        request: CrisisNotificationRequest,
        sender_id: str,
        ip_address: str
    ) -> NotificationResponse:
        """
        Send crisis notification with immediate multi-channel delivery
        and automatic escalation
        """
        try:
            # Create crisis alert record
            crisis_alert = CrisisAlert(
                user_id=request.user_id,
                crisis_type=CrisisType(request.crisis_type),
                message=request.message,
                location=request.location,
                escalation_level=EscalationLevel(request.escalation_level),
                triggered_by=sender_id,
                trigger_ip=ip_address,
                auto_escalate=request.auto_escalate,
                escalation_delay_minutes=request.escalation_delay_minutes or settings.crisis_escalation_delay_minutes
            )
            
            await crisis_alert.insert()
            
            logger.critical(
                "Crisis alert created",
                alert_id=crisis_alert.id,
                user_id=request.user_id,
                crisis_type=request.crisis_type,
                location=request.location,
                escalation_level=request.escalation_level
            )
            
            # Get user's emergency contacts
            emergency_contacts = await self._get_emergency_contacts(
                user_id=request.user_id,
                escalation_level=request.escalation_level
            )
            
            # Send immediate notifications across all available channels
            notification_responses = await self._send_multi_channel_crisis_alert(
                crisis_alert=crisis_alert,
                emergency_contacts=emergency_contacts,
                request=request
            )
            
            # Start escalation timer if enabled
            if request.auto_escalate and request.escalation_level < settings.crisis_max_escalation_levels:
                await self._start_escalation_timer(crisis_alert)
            
            # Send location-based notifications if location provided
            if request.location:
                await self._send_location_based_notifications(crisis_alert, request.location)
            
            # Notify professional responders based on crisis type
            if request.crisis_type in ["medical_emergency", "suicidal_ideation", "violence"]:
                await self._notify_professional_responders(crisis_alert)
            
            # Update crisis alert with notification IDs
            crisis_alert.notification_ids = [resp.notification_id for resp in notification_responses]
            crisis_alert.status = "active"
            await crisis_alert.save()
            
            # Send WebSocket update to all connected users in support network
            await self._broadcast_crisis_alert(crisis_alert)
            
            return NotificationResponse(
                notification_id=crisis_alert.id,
                status="sent",
                provider="crisis_service",
                message=f"Crisis alert sent to {len(emergency_contacts)} contacts via {len(notification_responses)} channels",
                sent_at=datetime.utcnow(),
                metadata={
                    "crisis_type": request.crisis_type,
                    "escalation_level": request.escalation_level,
                    "contacts_notified": len(emergency_contacts),
                    "channels_used": len(notification_responses)
                }
            )
            
        except Exception as e:
            logger.critical(
                "Failed to send crisis notification",
                user_id=request.user_id,
                crisis_type=request.crisis_type,
                error=str(e)
            )
            
            # Log security event for failed crisis alert
            security_logger.log_suspicious_activity(
                user_id=request.user_id,
                ip_address=ip_address,
                activity_type="crisis_alert_failure",
                details={"error": str(e), "crisis_type": request.crisis_type}
            )
            
            raise
    
    async def escalate_crisis_alert(self, alert_id: str) -> bool:
        """
        Escalate crisis alert to next level
        """
        try:
            crisis_alert = await CrisisAlert.get(alert_id)
            if not crisis_alert:
                logger.error("Crisis alert not found for escalation", alert_id=alert_id)
                return False
            
            # Check if already at max escalation
            if crisis_alert.escalation_level >= settings.crisis_max_escalation_levels:
                logger.warning(
                    "Crisis alert already at maximum escalation level",
                    alert_id=alert_id,
                    current_level=crisis_alert.escalation_level
                )
                return False
            
            # Increase escalation level
            crisis_alert.escalation_level += 1
            crisis_alert.escalated_at = datetime.utcnow()
            crisis_alert.escalation_history.append({
                "level": crisis_alert.escalation_level,
                "escalated_at": datetime.utcnow().isoformat(),
                "reason": "automatic_escalation"
            })
            
            logger.critical(
                "Crisis alert escalated",
                alert_id=alert_id,
                new_level=crisis_alert.escalation_level,
                user_id=crisis_alert.user_id
            )
            
            # Get contacts for new escalation level
            emergency_contacts = await self._get_emergency_contacts(
                user_id=crisis_alert.user_id,
                escalation_level=crisis_alert.escalation_level
            )
            
            # Send escalated notifications
            if crisis_alert.escalation_level >= 3:  # Highest level - make voice calls
                await self._make_emergency_voice_calls(crisis_alert, emergency_contacts)
            else:
                # Send urgent notifications via all channels
                await self._send_escalated_notifications(crisis_alert, emergency_contacts)
            
            # Continue escalation if not at max level
            if (crisis_alert.escalation_level < settings.crisis_max_escalation_levels and 
                crisis_alert.auto_escalate):
                await self._start_escalation_timer(crisis_alert)
            
            await crisis_alert.save()
            
            # Audit log
            await audit_logger.log_crisis_alert(
                user_id=crisis_alert.user_id,
                alert_id=alert_id,
                action="crisis_escalated",
                escalation_level=crisis_alert.escalation_level,
                result="success"
            )
            
            return True
            
        except Exception as e:
            logger.critical("Failed to escalate crisis alert", alert_id=alert_id, error=str(e))
            return False
    
    async def acknowledge_crisis_alert(self, alert_id: str, responder_id: str) -> bool:
        """
        Acknowledge crisis alert by emergency contact
        """
        try:
            crisis_alert = await CrisisAlert.get(alert_id)
            if not crisis_alert:
                return False
            
            # Add acknowledgment
            crisis_alert.acknowledgments.append({
                "responder_id": responder_id,
                "acknowledged_at": datetime.utcnow().isoformat(),
                "response_time_minutes": (datetime.utcnow() - crisis_alert.created_at).total_seconds() / 60
            })
            
            # Check if enough acknowledgments received
            required_acks = min(2, len(crisis_alert.emergency_contacts))  # At least 2 or all contacts
            if len(crisis_alert.acknowledgments) >= required_acks:
                crisis_alert.status = "acknowledged"
                
                # Cancel escalation timer
                if alert_id in self._escalation_tasks:
                    self._escalation_tasks[alert_id].cancel()
                    del self._escalation_tasks[alert_id]
            
            await crisis_alert.save()
            
            logger.info(
                "Crisis alert acknowledged",
                alert_id=alert_id,
                responder_id=responder_id,
                total_acknowledgments=len(crisis_alert.acknowledgments)
            )
            
            return True
            
        except Exception as e:
            logger.error("Failed to acknowledge crisis alert", alert_id=alert_id, error=str(e))
            return False
    
    async def resolve_crisis_alert(
        self,
        alert_id: str,
        resolver_id: str,
        resolution_notes: Optional[str] = None
    ) -> bool:
        """
        Resolve crisis alert
        """
        try:
            crisis_alert = await CrisisAlert.get(alert_id)
            if not crisis_alert:
                return False
            
            crisis_alert.status = "resolved"
            crisis_alert.resolved_at = datetime.utcnow()
            crisis_alert.resolved_by = resolver_id
            crisis_alert.resolution_notes = resolution_notes
            
            # Cancel any pending escalation
            if alert_id in self._escalation_tasks:
                self._escalation_tasks[alert_id].cancel()
                del self._escalation_tasks[alert_id]
            
            await crisis_alert.save()
            
            logger.info(
                "Crisis alert resolved",
                alert_id=alert_id,
                resolver_id=resolver_id,
                duration_minutes=(datetime.utcnow() - crisis_alert.created_at).total_seconds() / 60
            )
            
            # Send resolution notification to support network
            await self._send_resolution_notification(crisis_alert)
            
            return True
            
        except Exception as e:
            logger.error("Failed to resolve crisis alert", alert_id=alert_id, error=str(e))
            return False
    
    async def _get_emergency_contacts(
        self,
        user_id: str,
        escalation_level: int
    ) -> List[Dict[str, Any]]:
        """
        Get emergency contacts for escalation level
        """
        try:
            # Get user preferences with emergency contacts
            preferences = await UserPreferences.find_one({"user_id": user_id})
            
            if not preferences or not preferences.emergency_contacts:
                logger.warning("No emergency contacts found", user_id=user_id)
                return []
            
            # Filter contacts by escalation level
            contacts = []
            for contact in preferences.emergency_contacts:
                if contact.get("escalation_level", 1) <= escalation_level:
                    contacts.append(contact)
            
            # Sort by escalation level and priority
            contacts.sort(key=lambda x: (x.get("escalation_level", 1), x.get("priority", 10)))
            
            return contacts
            
        except Exception as e:
            logger.error("Failed to get emergency contacts", user_id=user_id, error=str(e))
            return []
    
    async def _send_multi_channel_crisis_alert(
        self,
        crisis_alert: CrisisAlert,
        emergency_contacts: List[Dict[str, Any]],
        request: CrisisNotificationRequest
    ) -> List[NotificationResponse]:
        """
        Send crisis alert via multiple channels simultaneously
        """
        responses = []
        
        # Prepare crisis message with location if available
        crisis_message = self._format_crisis_message(crisis_alert, request)
        
        # Send to each emergency contact via their preferred channels
        for contact in emergency_contacts:
            contact_channels = contact.get("channels", ["sms", "email", "push"])
            
            for channel in contact_channels:
                try:
                    notification = await self.notification_service.send_notification(
                        request=type('NotificationRequest', (), {
                            'user_id': crisis_alert.user_id,
                            'channel': channel,
                            'recipient': contact.get(f"{channel}_address", contact.get("phone", contact.get("email"))),
                            'message': crisis_message,
                            'subject': f"CRISIS ALERT - {request.crisis_type.upper()}",
                            'priority': NotificationPriority.CRITICAL,
                            'template_id': f"crisis_{request.crisis_type}_{channel}",
                            'template_variables': {
                                'user_name': crisis_alert.user_name or "User",
                                'crisis_type': request.crisis_type,
                                'message': request.message,
                                'location': request.location,
                                'timestamp': datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                                'alert_id': crisis_alert.id,
                                'escalation_level': request.escalation_level
                            },
                            'metadata': {
                                'crisis_alert_id': crisis_alert.id,
                                'emergency_contact_id': contact.get("id"),
                                'is_crisis_alert': True
                            }
                        })(),
                        sender_id="crisis_service",
                        ip_address="127.0.0.1"
                    )
                    
                    responses.append(notification)
                    
                except Exception as e:
                    logger.error(
                        "Failed to send crisis notification",
                        contact_id=contact.get("id"),
                        channel=channel,
                        error=str(e)
                    )
        
        return responses
    
    async def _make_emergency_voice_calls(
        self,
        crisis_alert: CrisisAlert,
        emergency_contacts: List[Dict[str, Any]]
    ) -> None:
        """
        Make voice calls for highest escalation level
        """
        if not settings.crisis_voice_call_enabled:
            logger.warning("Voice calls disabled for crisis alerts")
            return
        
        try:
            twilio_provider = await self.provider_factory.get_provider("twilio")
            
            call_message = (
                f"This is an emergency alert from Serenity. "
                f"{crisis_alert.user_name or 'A user'} has triggered a {crisis_alert.crisis_type} alert. "
                f"Message: {crisis_alert.message} "
                f"Time: {crisis_alert.created_at.strftime('%I:%M %p')} "
                f"Please respond immediately."
            )
            
            for contact in emergency_contacts:
                phone_number = contact.get("phone")
                if phone_number:
                    try:
                        await twilio_provider.make_voice_call(
                            phone_number=phone_number,
                            message=call_message,
                            callback_url=f"{settings.voice_call_webhook_url}/api/v1/webhooks/crisis-call/{crisis_alert.id}"
                        )
                        
                        logger.critical(
                            "Emergency voice call initiated",
                            alert_id=crisis_alert.id,
                            contact_phone=phone_number[-4:],  # Log last 4 digits only
                            crisis_type=crisis_alert.crisis_type
                        )
                        
                    except Exception as e:
                        logger.error(
                            "Failed to make emergency voice call",
                            contact_phone=phone_number[-4:],
                            error=str(e)
                        )
            
        except Exception as e:
            logger.error("Failed to initiate emergency voice calls", error=str(e))
    
    async def _start_escalation_timer(self, crisis_alert: CrisisAlert) -> None:
        """
        Start automatic escalation timer
        """
        delay_seconds = crisis_alert.escalation_delay_minutes * 60
        
        async def escalation_task():
            try:
                await asyncio.sleep(delay_seconds)
                await self.escalate_crisis_alert(crisis_alert.id)
            except asyncio.CancelledError:
                logger.info("Escalation timer cancelled", alert_id=crisis_alert.id)
            except Exception as e:
                logger.error("Escalation timer error", alert_id=crisis_alert.id, error=str(e))
        
        # Cancel existing timer if any
        if crisis_alert.id in self._escalation_tasks:
            self._escalation_tasks[crisis_alert.id].cancel()
        
        # Start new timer
        self._escalation_tasks[crisis_alert.id] = asyncio.create_task(escalation_task())
        
        logger.info(
            "Escalation timer started",
            alert_id=crisis_alert.id,
            delay_minutes=crisis_alert.escalation_delay_minutes,
            current_level=crisis_alert.escalation_level
        )
    
    async def _send_location_based_notifications(
        self,
        crisis_alert: CrisisAlert,
        location: Dict[str, Any]
    ) -> None:
        """
        Send notifications to nearby responders based on location
        """
        try:
            if not location.get("latitude") or not location.get("longitude"):
                return
            
            # Find nearby professional responders within 10 miles
            radius_miles = 10
            user_location = (location["latitude"], location["longitude"])
            
            # This would typically query a database of registered responders
            # For now, we'll log the location-based alert
            logger.critical(
                "Location-based crisis alert",
                alert_id=crisis_alert.id,
                user_id=crisis_alert.user_id,
                latitude=location["latitude"],
                longitude=location["longitude"],
                address=location.get("address", "Unknown"),
                radius_miles=radius_miles
            )
            
            # In a real implementation, you would:
            # 1. Query responder database for nearby professionals
            # 2. Send notifications to available responders
            # 3. Track response times and availability
            
        except Exception as e:
            logger.error("Failed to send location-based notifications", error=str(e))
    
    async def _notify_professional_responders(self, crisis_alert: CrisisAlert) -> None:
        """
        Notify professional responders for serious crisis types
        """
        try:
            # This would integrate with professional responder systems
            # For now, we'll log the professional notification
            logger.critical(
                "Professional responder notification",
                alert_id=crisis_alert.id,
                crisis_type=crisis_alert.crisis_type,
                user_id=crisis_alert.user_id,
                escalation_level=crisis_alert.escalation_level
            )
            
            # In a real implementation, you would:
            # 1. Integrate with crisis hotlines (988 Lifeline, etc.)
            # 2. Notify on-call mental health professionals
            # 3. Alert care team members
            # 4. Integration with emergency services if appropriate
            
        except Exception as e:
            logger.error("Failed to notify professional responders", error=str(e))
    
    def _format_crisis_message(
        self,
        crisis_alert: CrisisAlert,
        request: CrisisNotificationRequest
    ) -> str:
        """
        Format crisis alert message with essential information
        """
        message_parts = [
            f"🚨 CRISIS ALERT - {request.crisis_type.upper().replace('_', ' ')}",
            f"",
            f"User: {crisis_alert.user_name or 'Anonymous'}",
            f"Time: {crisis_alert.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}",
            f"Level: {request.escalation_level}",
            f"",
            f"Message: {request.message}",
        ]
        
        if request.location:
            if request.location.get("address"):
                message_parts.append(f"Location: {request.location['address']}")
            elif request.location.get("latitude") and request.location.get("longitude"):
                message_parts.append(f"Coordinates: {request.location['latitude']}, {request.location['longitude']}")
        
        message_parts.extend([
            f"",
            f"Alert ID: {crisis_alert.id}",
            f"",
            f"Please respond immediately. If this is a medical emergency, call 911."
        ])
        
        return "\n".join(message_parts)
    
    async def _broadcast_crisis_alert(self, crisis_alert: CrisisAlert) -> None:
        """
        Broadcast crisis alert via WebSocket to connected support network
        """
        try:
            # Send to user's WebSocket connection
            await self.websocket_manager.send_crisis_alert(
                user_id=crisis_alert.user_id,
                alert_data={
                    "alert_id": crisis_alert.id,
                    "crisis_type": crisis_alert.crisis_type,
                    "message": crisis_alert.message,
                    "escalation_level": crisis_alert.escalation_level,
                    "created_at": crisis_alert.created_at.isoformat(),
                    "status": crisis_alert.status
                }
            )
            
            # Send to emergency contacts if they're connected
            for contact in crisis_alert.emergency_contacts:
                if contact.get("user_id"):
                    await self.websocket_manager.send_crisis_alert(
                        user_id=contact["user_id"],
                        alert_data={
                            "alert_id": crisis_alert.id,
                            "crisis_type": crisis_alert.crisis_type,
                            "user_name": crisis_alert.user_name,
                            "message": crisis_alert.message,
                            "escalation_level": crisis_alert.escalation_level,
                            "created_at": crisis_alert.created_at.isoformat(),
                            "is_emergency_contact": True
                        }
                    )
            
        except Exception as e:
            logger.error("Failed to broadcast crisis alert", error=str(e))
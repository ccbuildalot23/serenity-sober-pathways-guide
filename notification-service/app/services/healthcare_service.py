"""
Healthcare-specific notification service
Handles medication reminders, appointments, check-ins, and care team notifications
"""
import asyncio
from datetime import datetime, timedelta, time
from typing import Dict, Any, List, Optional
import structlog
from croniter import croniter

from app.core.config import settings
from app.core.logging import audit_logger, performance_logger
from app.schemas.notification import HealthcareNotificationRequest, NotificationResponse
from app.models.healthcare_reminder import (
    HealthcareReminder, ReminderType, RecurrencePattern,
    MedicationReminder, AppointmentReminder, CheckinReminder
)
from app.models.notification import Notification, NotificationPriority
from app.models.user_preferences import UserPreferences
from app.services.notification_service import NotificationService
from app.services.template_service import TemplateService
from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


class HealthcareService:
    """Service for healthcare-specific notifications and reminders"""
    
    def __init__(self):
        self.notification_service = NotificationService()
        self.template_service = TemplateService()
        self._scheduled_reminders: Dict[str, asyncio.Task] = {}
    
    async def send_healthcare_notification(
        self,
        request: HealthcareNotificationRequest,
        sender_id: str,
        ip_address: str
    ) -> NotificationResponse:
        """
        Send healthcare-specific notification
        """
        try:
            # Determine template and priority based on healthcare type
            template_id, priority = self._get_healthcare_template_and_priority(
                request.healthcare_type,
                request.urgency_level
            )
            
            # Prepare template variables
            template_variables = {
                'user_name': request.user_name or "Patient",
                'provider_name': request.provider_name or "Your Care Team",
                'healthcare_type': request.healthcare_type,
                'message': request.message,
                'scheduled_time': request.scheduled_time.strftime("%I:%M %p") if request.scheduled_time else None,
                'scheduled_date': request.scheduled_time.strftime("%B %d, %Y") if request.scheduled_time else None,
                'medication_name': request.medication_name,
                'dosage': request.dosage,
                'instructions': request.instructions,
                'appointment_type': request.appointment_type,
                'provider_contact': request.provider_contact,
                'checkin_type': request.checkin_type,
                'lab_test_name': request.lab_test_name,
                'result_summary': request.result_summary,
                'care_plan_update': request.care_plan_update
            }
            
            # Send notification
            response = await self.notification_service.send_notification(
                request=type('NotificationRequest', (), {
                    'user_id': request.user_id,
                    'channel': request.channel,
                    'recipient': request.recipient,
                    'message': request.message,
                    'subject': request.subject,
                    'priority': priority,
                    'template_id': template_id,
                    'template_variables': template_variables,
                    'scheduled_at': request.scheduled_time,
                    'metadata': {
                        'healthcare_type': request.healthcare_type,
                        'urgency_level': request.urgency_level,
                        'contains_phi': True
                    }
                })(),
                sender_id=sender_id,
                ip_address=ip_address
            )
            
            # Log healthcare notification audit
            await audit_logger.log_phi_access(
                user_id=request.user_id,
                action="healthcare_notification_sent",
                resource=f"healthcare_notification/{response.notification_id}",
                ip_address=ip_address,
                phi_accessed=True,
                additional_data={
                    'healthcare_type': request.healthcare_type,
                    'urgency_level': request.urgency_level
                }
            )
            
            logger.info(
                "Healthcare notification sent",
                notification_id=response.notification_id,
                user_id=request.user_id,
                healthcare_type=request.healthcare_type,
                channel=request.channel
            )
            
            return response
            
        except Exception as e:
            logger.error(
                "Failed to send healthcare notification",
                user_id=request.user_id,
                healthcare_type=request.healthcare_type,
                error=str(e)
            )
            raise
    
    async def schedule_medication_reminder(
        self,
        user_id: str,
        medication_name: str,
        dosage: str,
        schedule_times: List[str],  # ["08:00", "14:00", "20:00"]
        start_date: datetime,
        end_date: Optional[datetime] = None,
        instructions: Optional[str] = None,
        prescriber: Optional[str] = None
    ) -> List[str]:
        """
        Schedule recurring medication reminders
        """
        try:
            reminder_ids = []
            
            for time_str in schedule_times:
                # Parse time
                hour, minute = map(int, time_str.split(':'))
                reminder_time = time(hour, minute)
                
                # Create medication reminder
                reminder = MedicationReminder(
                    user_id=user_id,
                    reminder_type=ReminderType.MEDICATION,
                    medication_name=medication_name,
                    dosage=dosage,
                    schedule_time=reminder_time,
                    start_date=start_date,
                    end_date=end_date,
                    instructions=instructions,
                    prescriber=prescriber,
                    recurrence_pattern=RecurrencePattern.DAILY,
                    is_active=True,
                    next_reminder=self._calculate_next_reminder(start_date, reminder_time)
                )
                
                await reminder.insert()
                reminder_ids.append(reminder.id)
                
                # Schedule the reminder task
                await self._schedule_reminder_task(reminder)
                
                logger.info(
                    "Medication reminder scheduled",
                    reminder_id=reminder.id,
                    user_id=user_id,
                    medication_name=medication_name,
                    schedule_time=time_str
                )
            
            return reminder_ids
            
        except Exception as e:
            logger.error(
                "Failed to schedule medication reminder",
                user_id=user_id,
                medication_name=medication_name,
                error=str(e)
            )
            raise
    
    async def schedule_appointment_reminder(
        self,
        user_id: str,
        appointment_datetime: datetime,
        appointment_type: str,
        provider_name: str,
        location: str,
        provider_contact: Optional[str] = None,
        reminder_advance_hours: List[int] = None  # [24, 2] for 24h and 2h before
    ) -> List[str]:
        """
        Schedule appointment reminders at specified intervals before appointment
        """
        try:
            if reminder_advance_hours is None:
                reminder_advance_hours = [24, 2]  # Default: 24 hours and 2 hours before
            
            reminder_ids = []
            
            for hours_before in reminder_advance_hours:
                reminder_datetime = appointment_datetime - timedelta(hours=hours_before)
                
                # Skip if reminder time is in the past
                if reminder_datetime <= datetime.utcnow():
                    continue
                
                reminder = AppointmentReminder(
                    user_id=user_id,
                    reminder_type=ReminderType.APPOINTMENT,
                    appointment_datetime=appointment_datetime,
                    appointment_type=appointment_type,
                    provider_name=provider_name,
                    location=location,
                    provider_contact=provider_contact,
                    reminder_advance_hours=hours_before,
                    is_active=True,
                    next_reminder=reminder_datetime
                )
                
                await reminder.insert()
                reminder_ids.append(reminder.id)
                
                # Schedule the reminder task
                await self._schedule_reminder_task(reminder)
                
                logger.info(
                    "Appointment reminder scheduled",
                    reminder_id=reminder.id,
                    user_id=user_id,
                    appointment_datetime=appointment_datetime.isoformat(),
                    hours_before=hours_before
                )
            
            return reminder_ids
            
        except Exception as e:
            logger.error(
                "Failed to schedule appointment reminder",
                user_id=user_id,
                appointment_datetime=appointment_datetime.isoformat(),
                error=str(e)
            )
            raise
    
    async def schedule_daily_checkin_reminder(
        self,
        user_id: str,
        checkin_type: str = "mood_tracking",
        reminder_time: str = "09:00",
        timezone: str = "UTC",
        custom_message: Optional[str] = None
    ) -> str:
        """
        Schedule daily check-in reminders
        """
        try:
            # Parse reminder time
            hour, minute = map(int, reminder_time.split(':'))
            daily_time = time(hour, minute)
            
            # Calculate next reminder
            next_reminder = self._calculate_next_daily_reminder(daily_time, timezone)
            
            reminder = CheckinReminder(
                user_id=user_id,
                reminder_type=ReminderType.CHECKIN,
                checkin_type=checkin_type,
                schedule_time=daily_time,
                timezone=timezone,
                custom_message=custom_message,
                recurrence_pattern=RecurrencePattern.DAILY,
                is_active=True,
                next_reminder=next_reminder
            )
            
            await reminder.insert()
            
            # Schedule the reminder task
            await self._schedule_reminder_task(reminder)
            
            logger.info(
                "Daily check-in reminder scheduled",
                reminder_id=reminder.id,
                user_id=user_id,
                checkin_type=checkin_type,
                reminder_time=reminder_time
            )
            
            return reminder.id
            
        except Exception as e:
            logger.error(
                "Failed to schedule daily check-in reminder",
                user_id=user_id,
                checkin_type=checkin_type,
                error=str(e)
            )
            raise
    
    async def send_lab_result_notification(
        self,
        user_id: str,
        lab_test_name: str,
        result_summary: str,
        provider_name: str,
        critical: bool = False,
        full_results_url: Optional[str] = None,
        followup_required: bool = False
    ) -> NotificationResponse:
        """
        Send lab result notification with appropriate priority
        """
        try:
            priority = NotificationPriority.HIGH if critical else NotificationPriority.NORMAL
            urgency = "critical" if critical else "normal"
            
            # Get user's preferred notification channel for lab results
            preferences = await UserPreferences.find_one({"user_id": user_id})
            channel = "email"  # Default to email for lab results
            
            if preferences and preferences.channel_preferences:
                lab_channel = preferences.channel_preferences.get("lab_results")
                if lab_channel and lab_channel.get("enabled"):
                    channel = lab_channel.get("channel", "email")
            
            request = HealthcareNotificationRequest(
                user_id=user_id,
                healthcare_type="lab_results",
                channel=channel,
                recipient=preferences.email if preferences else None,
                message=result_summary,
                subject=f"Lab Results Available: {lab_test_name}",
                urgency_level=urgency,
                provider_name=provider_name,
                lab_test_name=lab_test_name,
                result_summary=result_summary
            )
            
            response = await self.send_healthcare_notification(
                request=request,
                sender_id="healthcare_system",
                ip_address="127.0.0.1"
            )
            
            # If critical, also send SMS backup
            if critical and preferences and preferences.phone:
                sms_request = HealthcareNotificationRequest(
                    user_id=user_id,
                    healthcare_type="lab_results",
                    channel="sms",
                    recipient=preferences.phone,
                    message=f"URGENT: Lab results for {lab_test_name} are ready. Please check your patient portal or contact {provider_name}.",
                    urgency_level="critical",
                    provider_name=provider_name,
                    lab_test_name=lab_test_name,
                    result_summary="Critical results - check patient portal"
                )
                
                await self.send_healthcare_notification(
                    request=sms_request,
                    sender_id="healthcare_system", 
                    ip_address="127.0.0.1"
                )
            
            return response
            
        except Exception as e:
            logger.error(
                "Failed to send lab result notification",
                user_id=user_id,
                lab_test_name=lab_test_name,
                error=str(e)
            )
            raise
    
    async def send_care_team_notification(
        self,
        user_id: str,
        care_team_members: List[str],
        notification_type: str,
        message: str,
        priority_level: str = "normal",
        patient_data: Optional[Dict[str, Any]] = None
    ) -> List[NotificationResponse]:
        """
        Send notifications to care team members
        """
        try:
            responses = []
            
            for member_id in care_team_members:
                # Get care team member's preferences
                member_prefs = await UserPreferences.find_one({"user_id": member_id})
                
                if not member_prefs:
                    logger.warning("No preferences found for care team member", member_id=member_id)
                    continue
                
                # Determine channel preference for care team notifications
                channel = "email"  # Default
                if member_prefs.channel_preferences:
                    care_channel = member_prefs.channel_preferences.get("care_team_notifications")
                    if care_channel and care_channel.get("enabled"):
                        channel = care_channel.get("channel", "email")
                
                request = HealthcareNotificationRequest(
                    user_id=member_id,
                    healthcare_type="care_team_notification",
                    channel=channel,
                    recipient=member_prefs.email if channel == "email" else member_prefs.phone,
                    message=message,
                    subject=f"Care Team Update - Patient {user_id}",
                    urgency_level=priority_level,
                    provider_name="Care Team System"
                )
                
                response = await self.send_healthcare_notification(
                    request=request,
                    sender_id="care_team_system",
                    ip_address="127.0.0.1"
                )
                
                responses.append(response)
                
                logger.info(
                    "Care team notification sent",
                    patient_id=user_id,
                    care_team_member=member_id,
                    notification_type=notification_type,
                    channel=channel
                )
            
            return responses
            
        except Exception as e:
            logger.error(
                "Failed to send care team notifications",
                user_id=user_id,
                notification_type=notification_type,
                error=str(e)
            )
            raise
    
    async def process_reminder_task(self, reminder_id: str) -> bool:
        """
        Process a scheduled reminder task
        """
        try:
            reminder = await HealthcareReminder.get(reminder_id)
            
            if not reminder or not reminder.is_active:
                logger.warning("Reminder not found or inactive", reminder_id=reminder_id)
                return False
            
            # Check if it's time for this reminder
            if reminder.next_reminder > datetime.utcnow():
                logger.warning("Reminder not yet due", reminder_id=reminder_id, next_reminder=reminder.next_reminder)
                return False
            
            # Get user preferences
            preferences = await UserPreferences.find_one({"user_id": reminder.user_id})
            
            # Check quiet hours
            if preferences and self._is_quiet_hours(preferences):
                # Reschedule for after quiet hours
                reminder.next_reminder = self._calculate_after_quiet_hours(preferences)
                await reminder.save()
                await self._schedule_reminder_task(reminder)
                return True
            
            # Send reminder based on type
            success = False
            
            if reminder.reminder_type == ReminderType.MEDICATION:
                success = await self._send_medication_reminder(reminder, preferences)
            elif reminder.reminder_type == ReminderType.APPOINTMENT:
                success = await self._send_appointment_reminder(reminder, preferences)
            elif reminder.reminder_type == ReminderType.CHECKIN:
                success = await self._send_checkin_reminder(reminder, preferences)
            
            if success:
                # Update reminder for next occurrence if recurring
                if reminder.recurrence_pattern != RecurrencePattern.ONCE:
                    reminder.next_reminder = self._calculate_next_occurrence(reminder)
                    reminder.last_sent = datetime.utcnow()
                    await reminder.save()
                    
                    # Schedule next occurrence
                    await self._schedule_reminder_task(reminder)
                else:
                    # Mark as completed for one-time reminders
                    reminder.is_active = False
                    reminder.completed_at = datetime.utcnow()
                    await reminder.save()
            
            return success
            
        except Exception as e:
            logger.error("Failed to process reminder task", reminder_id=reminder_id, error=str(e))
            return False
    
    def _get_healthcare_template_and_priority(
        self,
        healthcare_type: str,
        urgency_level: str
    ) -> tuple[str, NotificationPriority]:
        """
        Get appropriate template and priority for healthcare notification type
        """
        template_mapping = {
            "medication_reminder": "medication_reminder",
            "appointment_reminder": "appointment_reminder", 
            "checkin_reminder": "daily_checkin",
            "lab_results": "lab_results",
            "care_team_notification": "care_team_update",
            "prescription_ready": "prescription_ready",
            "insurance_update": "insurance_update"
        }
        
        priority_mapping = {
            "low": NotificationPriority.LOW,
            "normal": NotificationPriority.NORMAL,
            "high": NotificationPriority.HIGH,
            "critical": NotificationPriority.CRITICAL
        }
        
        template_id = template_mapping.get(healthcare_type, "healthcare_general")
        priority = priority_mapping.get(urgency_level, NotificationPriority.NORMAL)
        
        return template_id, priority
    
    async def _schedule_reminder_task(self, reminder: HealthcareReminder) -> None:
        """
        Schedule reminder task using Celery
        """
        try:
            # Calculate delay until next reminder
            delay = (reminder.next_reminder - datetime.utcnow()).total_seconds()
            
            if delay <= 0:
                # Send immediately
                celery_app.send_task(
                    "process_healthcare_reminder",
                    args=[reminder.id],
                    countdown=0
                )
            else:
                # Schedule for future
                celery_app.send_task(
                    "process_healthcare_reminder",
                    args=[reminder.id],
                    countdown=int(delay)
                )
            
            logger.debug(
                "Reminder task scheduled",
                reminder_id=reminder.id,
                next_reminder=reminder.next_reminder.isoformat(),
                delay_seconds=delay
            )
            
        except Exception as e:
            logger.error("Failed to schedule reminder task", reminder_id=reminder.id, error=str(e))
    
    def _calculate_next_reminder(self, start_date: datetime, reminder_time: time) -> datetime:
        """
        Calculate next reminder datetime
        """
        today = datetime.utcnow().date()
        reminder_datetime = datetime.combine(today, reminder_time)
        
        # If time has passed today, schedule for tomorrow
        if reminder_datetime <= datetime.utcnow():
            reminder_datetime += timedelta(days=1)
        
        return reminder_datetime
    
    def _calculate_next_daily_reminder(self, reminder_time: time, timezone: str) -> datetime:
        """
        Calculate next daily reminder considering timezone
        """
        # For now, treat all as UTC. In production, would handle timezone conversion
        return self._calculate_next_reminder(datetime.utcnow(), reminder_time)
    
    def _is_quiet_hours(self, preferences: UserPreferences) -> bool:
        """
        Check if current time is within user's quiet hours
        """
        if not preferences.quiet_hours_enabled:
            return False
        
        now = datetime.utcnow().time()
        start = preferences.quiet_hours_start or time(22, 0)
        end = preferences.quiet_hours_end or time(8, 0)
        
        if start < end:
            # Same day quiet hours (e.g., 23:00 to 06:00)
            return start <= now <= end
        else:
            # Overnight quiet hours (e.g., 22:00 to 08:00)
            return now >= start or now <= end
    
    def _calculate_after_quiet_hours(self, preferences: UserPreferences) -> datetime:
        """
        Calculate datetime after quiet hours end
        """
        quiet_end = preferences.quiet_hours_end or time(8, 0)
        today = datetime.utcnow().date()
        end_datetime = datetime.combine(today, quiet_end)
        
        # If quiet hours end has passed today, schedule for tomorrow
        if end_datetime <= datetime.utcnow():
            end_datetime += timedelta(days=1)
        
        return end_datetime
    
    def _calculate_next_occurrence(self, reminder: HealthcareReminder) -> datetime:
        """
        Calculate next occurrence based on recurrence pattern
        """
        if reminder.recurrence_pattern == RecurrencePattern.DAILY:
            return reminder.next_reminder + timedelta(days=1)
        elif reminder.recurrence_pattern == RecurrencePattern.WEEKLY:
            return reminder.next_reminder + timedelta(weeks=1)
        elif reminder.recurrence_pattern == RecurrencePattern.MONTHLY:
            # Add one month (approximate)
            return reminder.next_reminder + timedelta(days=30)
        else:
            # For custom patterns, would use croniter or similar
            return reminder.next_reminder + timedelta(days=1)
    
    async def _send_medication_reminder(
        self,
        reminder: MedicationReminder,
        preferences: Optional[UserPreferences]
    ) -> bool:
        """
        Send medication reminder notification
        """
        try:
            channel = "sms"  # Default for medication reminders
            recipient = preferences.phone if preferences else None
            
            if preferences and preferences.channel_preferences:
                med_pref = preferences.channel_preferences.get("medication_reminders")
                if med_pref and med_pref.get("enabled"):
                    channel = med_pref.get("channel", "sms")
                    recipient = getattr(preferences, channel, None)
            
            if not recipient:
                logger.warning("No recipient for medication reminder", reminder_id=reminder.id)
                return False
            
            request = HealthcareNotificationRequest(
                user_id=reminder.user_id,
                healthcare_type="medication_reminder",
                channel=channel,
                recipient=recipient,
                message=f"Time to take your medication: {reminder.medication_name} ({reminder.dosage})",
                urgency_level="normal",
                medication_name=reminder.medication_name,
                dosage=reminder.dosage,
                instructions=reminder.instructions
            )
            
            await self.send_healthcare_notification(
                request=request,
                sender_id="medication_reminder_system",
                ip_address="127.0.0.1"
            )
            
            return True
            
        except Exception as e:
            logger.error("Failed to send medication reminder", reminder_id=reminder.id, error=str(e))
            return False
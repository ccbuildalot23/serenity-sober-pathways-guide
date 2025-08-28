"""
Notification API endpoints
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.logging import audit_logger, performance_logger
from app.schemas.notification import (
    NotificationRequest, NotificationResponse, NotificationStatus,
    BulkNotificationRequest, BulkNotificationResponse,
    CrisisNotificationRequest, HealthcareNotificationRequest,
    NotificationListResponse
)
from app.services.notification_service import NotificationService
from app.services.crisis_service import CrisisService
from app.services.healthcare_service import HealthcareService
from app.models.notification import Notification
from app.utils.auth import get_current_user, require_permissions

router = APIRouter()
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)
logger = structlog.get_logger(__name__)

notification_service = NotificationService()
crisis_service = CrisisService()
healthcare_service = HealthcareService()


@router.post("/", response_model=NotificationResponse)
@limiter.limit("50/minute")
async def send_notification(
    request: NotificationRequest,
    background_tasks: BackgroundTasks,
    req: Request,
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> NotificationResponse:
    """
    Send a single notification
    
    Supports all channels: SMS, Email, WhatsApp, Push, WebSocket
    """
    start_time = datetime.utcnow()
    
    try:
        # Validate request
        if not request.recipient:
            raise HTTPException(status_code=400, detail="Recipient is required")
        
        if not request.message and not request.template_id:
            raise HTTPException(status_code=400, detail="Message or template_id is required")
        
        # Check user permissions
        await require_permissions(current_user, ["send_notifications"])
        
        # Process notification
        response = await notification_service.send_notification(
            request=request,
            sender_id=current_user["sub"],
            ip_address=req.client.host,
            user_agent=req.headers.get("user-agent")
        )
        
        # Log audit trail
        await audit_logger.log_notification_sent(
            notification_id=response.notification_id,
            user_id=request.user_id,
            channel=request.channel,
            template_id=request.template_id,
            ip_address=req.client.host,
            result="success"
        )
        
        # Log performance
        duration = (datetime.utcnow() - start_time).total_seconds() * 1000
        performance_logger.log_notification_delivery_time(
            notification_id=response.notification_id,
            channel=request.channel,
            duration_ms=duration,
            success=response.status == "sent",
            provider=response.provider
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to send notification",
            error=str(e),
            user_id=request.user_id,
            channel=request.channel
        )
        
        await audit_logger.log_notification_sent(
            notification_id=request.notification_id or "unknown",
            user_id=request.user_id,
            channel=request.channel,
            ip_address=req.client.host,
            result="failed",
            error_message=str(e)
        )
        
        raise HTTPException(status_code=500, detail="Failed to send notification")


@router.post("/bulk", response_model=BulkNotificationResponse)
@limiter.limit("10/minute")
async def send_bulk_notifications(
    request: BulkNotificationRequest,
    background_tasks: BackgroundTasks,
    req: Request,
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> BulkNotificationResponse:
    """
    Send bulk notifications to multiple recipients
    
    Supports batch processing with rate limiting and retry logic
    """
    try:
        # Check permissions
        await require_permissions(current_user, ["send_bulk_notifications"])
        
        # Validate batch size
        if len(request.notifications) > 1000:
            raise HTTPException(
                status_code=400, 
                detail="Batch size cannot exceed 1000 notifications"
            )
        
        # Process bulk notifications
        response = await notification_service.send_bulk_notifications(
            request=request,
            sender_id=current_user["sub"],
            ip_address=req.client.host
        )
        
        logger.info(
            "Bulk notifications processed",
            batch_id=response.batch_id,
            total=response.total,
            successful=response.successful,
            failed=response.failed
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to send bulk notifications", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to process bulk notifications")


@router.post("/crisis", response_model=NotificationResponse)
@limiter.limit("20/minute")
async def send_crisis_notification(
    request: CrisisNotificationRequest,
    background_tasks: BackgroundTasks,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> NotificationResponse:
    """
    Send crisis/emergency notification with immediate escalation
    
    Features:
    - Immediate multi-channel delivery
    - Tiered contact escalation
    - Location-based notifications
    - Voice call escalation for critical alerts
    """
    try:
        # Crisis notifications don't require explicit permissions - emergency override
        logger.critical(
            "Crisis notification initiated",
            user_id=request.user_id,
            crisis_type=request.crisis_type,
            location=request.location,
            escalation_level=request.escalation_level
        )
        
        # Process crisis notification
        response = await crisis_service.send_crisis_notification(
            request=request,
            sender_id=current_user["sub"],
            ip_address=req.client.host
        )
        
        # Log crisis audit (critical level)
        await audit_logger.log_crisis_alert(
            user_id=request.user_id,
            alert_id=response.notification_id,
            action="crisis_notification_sent",
            escalation_level=request.escalation_level,
            ip_address=req.client.host,
            location=request.location
        )
        
        return response
        
    except Exception as e:
        logger.critical(
            "Failed to send crisis notification",
            error=str(e),
            user_id=request.user_id,
            crisis_type=request.crisis_type
        )
        raise HTTPException(status_code=500, detail="Failed to send crisis notification")


@router.post("/healthcare", response_model=NotificationResponse)
@limiter.limit("100/minute")
async def send_healthcare_notification(
    request: HealthcareNotificationRequest,
    background_tasks: BackgroundTasks,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> NotificationResponse:
    """
    Send healthcare-specific notifications
    
    Types:
    - Medication reminders
    - Appointment reminders  
    - Daily check-in prompts
    - Lab result notifications
    - Care team notifications
    """
    try:
        # Check permissions
        await require_permissions(current_user, ["send_healthcare_notifications"])
        
        # Process healthcare notification
        response = await healthcare_service.send_healthcare_notification(
            request=request,
            sender_id=current_user["sub"],
            ip_address=req.client.host
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to send healthcare notification", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to send healthcare notification")


@router.get("/", response_model=NotificationListResponse)
@limiter.limit("100/minute")
async def list_notifications(
    req: Request,
    user_id: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(default=50, le=1000),
    offset: int = Query(default=0),
    current_user: dict = Depends(get_current_user)
) -> NotificationListResponse:
    """
    List notifications with filtering and pagination
    """
    try:
        # Build filter criteria
        filters = {}
        
        if user_id:
            # Check permission to view other user's notifications
            if user_id != current_user["sub"]:
                await require_permissions(current_user, ["view_all_notifications"])
            filters["user_id"] = user_id
        else:
            # Default to current user's notifications
            filters["user_id"] = current_user["sub"]
        
        if channel:
            filters["channel"] = channel
        if status:
            filters["status"] = status
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            filters["created_at"] = date_filter
        
        # Query notifications
        notifications = await Notification.find(filters).skip(offset).limit(limit).to_list()
        total = await Notification.find(filters).count()
        
        return NotificationListResponse(
            notifications=notifications,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to list notifications", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to list notifications")


@router.get("/{notification_id}", response_model=NotificationStatus)
@limiter.limit("200/minute")
async def get_notification_status(
    notification_id: str,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> NotificationStatus:
    """
    Get detailed notification status and delivery information
    """
    try:
        notification = await Notification.get(notification_id)
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        # Check permission to view notification
        if (notification.user_id != current_user["sub"] and 
            not await require_permissions(current_user, ["view_all_notifications"], raise_on_error=False)):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Get delivery status from provider if available
        delivery_info = await notification_service.get_delivery_status(notification_id)
        
        return NotificationStatus(
            notification_id=notification_id,
            status=notification.status,
            channel=notification.channel,
            created_at=notification.created_at,
            sent_at=notification.sent_at,
            delivered_at=delivery_info.get("delivered_at"),
            read_at=delivery_info.get("read_at"),
            provider=notification.provider,
            provider_message_id=notification.provider_message_id,
            error_message=notification.error_message,
            retry_count=notification.retry_count,
            delivery_info=delivery_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get notification status",
            notification_id=notification_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to get notification status")


@router.post("/{notification_id}/retry", response_model=NotificationResponse)
@limiter.limit("10/minute")
async def retry_notification(
    notification_id: str,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> NotificationResponse:
    """
    Retry a failed notification
    """
    try:
        await require_permissions(current_user, ["retry_notifications"])
        
        notification = await Notification.get(notification_id)
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        if notification.status not in ["failed", "undelivered"]:
            raise HTTPException(
                status_code=400, 
                detail="Can only retry failed or undelivered notifications"
            )
        
        # Retry notification
        response = await notification_service.retry_notification(
            notification_id=notification_id,
            requester_id=current_user["sub"]
        )
        
        logger.info(
            "Notification retry initiated",
            notification_id=notification_id,
            requester=current_user["sub"]
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to retry notification",
            notification_id=notification_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to retry notification")


@router.delete("/{notification_id}")
@limiter.limit("20/minute")
async def cancel_notification(
    notification_id: str,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Cancel a scheduled notification
    """
    try:
        await require_permissions(current_user, ["cancel_notifications"])
        
        result = await notification_service.cancel_notification(
            notification_id=notification_id,
            requester_id=current_user["sub"]
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Notification not found or cannot be cancelled")
        
        logger.info(
            "Notification cancelled",
            notification_id=notification_id,
            requester=current_user["sub"]
        )
        
        return {"message": "Notification cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to cancel notification",
            notification_id=notification_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to cancel notification")


@router.get("/{notification_id}/delivery-log")
@limiter.limit("100/minute") 
async def get_delivery_log(
    notification_id: str,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get detailed delivery log for a notification
    """
    try:
        await require_permissions(current_user, ["view_delivery_logs"])
        
        from app.models.delivery_log import DeliveryLog
        
        delivery_logs = await DeliveryLog.find(
            {"notification_id": notification_id}
        ).sort([("timestamp", -1)]).to_list()
        
        return [log.dict() for log in delivery_logs]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get delivery log",
            notification_id=notification_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to get delivery log")
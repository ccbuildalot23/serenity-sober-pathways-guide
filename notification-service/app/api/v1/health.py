"""
Health check endpoints for monitoring and diagnostics
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
import structlog
import psutil
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis

from app.core.config import settings
from app.core.database import db_manager
from app.services.notification_service import NotificationService
from app.providers.provider_factory import ProviderFactory

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/")
async def basic_health() -> Dict[str, str]:
    """
    Basic health check endpoint
    
    Returns simple status for load balancer health checks
    """
    return {
        "status": "healthy",
        "service": settings.app_name,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/detailed")
async def detailed_health() -> Dict[str, Any]:
    """
    Detailed health check with component status
    
    Checks:
    - Database connectivity
    - Redis connectivity  
    - Provider health
    - System resources
    - Service dependencies
    """
    health_status = {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": _get_uptime(),
        "components": {}
    }
    
    overall_healthy = True
    
    # Check database health
    try:
        db_health = await _check_database_health()
        health_status["components"]["database"] = db_health
        if db_health["status"] != "healthy":
            overall_healthy = False
    except Exception as e:
        health_status["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_healthy = False
    
    # Check Redis health
    try:
        redis_health = await _check_redis_health()
        health_status["components"]["redis"] = redis_health
        if redis_health["status"] != "healthy":
            overall_healthy = False
    except Exception as e:
        health_status["components"]["redis"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_healthy = False
    
    # Check provider health
    try:
        provider_health = await _check_provider_health()
        health_status["components"]["providers"] = provider_health
        # Providers can be degraded without marking overall service unhealthy
    except Exception as e:
        health_status["components"]["providers"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check system resources
    try:
        system_health = await _check_system_health()
        health_status["components"]["system"] = system_health
        if system_health["status"] == "critical":
            overall_healthy = False
    except Exception as e:
        health_status["components"]["system"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Check notification service health
    try:
        service_health = await _check_notification_service_health()
        health_status["components"]["notification_service"] = service_health
        if service_health["status"] != "healthy":
            overall_healthy = False
    except Exception as e:
        health_status["components"]["notification_service"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # Set overall status
    health_status["status"] = "healthy" if overall_healthy else "unhealthy"
    
    return health_status


@router.get("/readiness")
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check for Kubernetes/container orchestration
    
    Checks if service is ready to accept requests
    """
    checks = []
    ready = True
    
    # Database connection
    try:
        await db_manager.database.command('ping')
        checks.append({"name": "database", "status": "ready"})
    except Exception as e:
        checks.append({"name": "database", "status": "not_ready", "error": str(e)})
        ready = False
    
    # Redis connection
    try:
        redis_client = redis.from_url(settings.redis_url)
        await redis_client.ping()
        await redis_client.close()
        checks.append({"name": "redis", "status": "ready"})
    except Exception as e:
        checks.append({"name": "redis", "status": "not_ready", "error": str(e)})
        ready = False
    
    # Critical providers
    try:
        provider_factory = ProviderFactory()
        twilio_provider = await provider_factory.get_provider("twilio")
        twilio_health = await twilio_provider.get_provider_health()
        
        if twilio_health["status"] in ["healthy", "degraded"]:
            checks.append({"name": "twilio", "status": "ready"})
        else:
            checks.append({"name": "twilio", "status": "not_ready", "health": twilio_health})
            ready = False
            
    except Exception as e:
        checks.append({"name": "twilio", "status": "not_ready", "error": str(e)})
        ready = False
    
    status_code = 200 if ready else 503
    
    return {
        "status": "ready" if ready else "not_ready",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/liveness")
async def liveness_check() -> Dict[str, str]:
    """
    Liveness check for Kubernetes/container orchestration
    
    Simple check to verify service is alive
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/metrics")
async def health_metrics() -> Dict[str, Any]:
    """
    Health metrics for monitoring dashboards
    """
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Application metrics
        from app.models.notification import Notification
        from app.models.delivery_log import DeliveryLog
        
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        last_1h = now - timedelta(hours=1)
        
        # Notification counts
        total_notifications = await Notification.count()
        notifications_24h = await Notification.find({"created_at": {"$gte": last_24h}}).count()
        notifications_1h = await Notification.find({"created_at": {"$gte": last_1h}}).count()
        
        # Delivery success rates
        successful_24h = await DeliveryLog.find({
            "timestamp": {"$gte": last_24h},
            "status": "delivered"
        }).count()
        
        failed_24h = await DeliveryLog.find({
            "timestamp": {"$gte": last_24h},
            "status": {"$in": ["failed", "undelivered"]}
        }).count()
        
        success_rate_24h = (successful_24h / (successful_24h + failed_24h)) * 100 if (successful_24h + failed_24h) > 0 else 0
        
        # Channel breakdown
        channel_stats = {}
        for channel in ["sms", "email", "push", "whatsapp"]:
            count = await Notification.find({
                "channel": channel,
                "created_at": {"$gte": last_24h}
            }).count()
            channel_stats[channel] = count
        
        return {
            "timestamp": now.isoformat(),
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "disk_percent": disk.percent,
                "disk_free_gb": disk.free / (1024**3)
            },
            "notifications": {
                "total": total_notifications,
                "last_24h": notifications_24h,
                "last_1h": notifications_1h,
                "success_rate_24h": round(success_rate_24h, 2),
                "channel_breakdown_24h": channel_stats
            },
            "delivery": {
                "successful_24h": successful_24h,
                "failed_24h": failed_24h,
                "success_rate_24h": round(success_rate_24h, 2)
            }
        }
        
    except Exception as e:
        logger.error("Failed to get health metrics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get health metrics")


async def _check_database_health() -> Dict[str, Any]:
    """Check MongoDB database health"""
    try:
        # Ping database
        result = await db_manager.database.command('ping')
        
        if result.get('ok') == 1:
            # Get collection stats
            collections = await db_manager.database.list_collection_names()
            
            # Test a simple query
            from app.models.notification import Notification
            test_count = await Notification.count()
            
            return {
                "status": "healthy",
                "collections": len(collections),
                "test_query_result": test_count,
                "response_time_ms": result.get('operationTime', 0)
            }
        else:
            return {
                "status": "unhealthy",
                "reason": "Database ping failed"
            }
            
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def _check_redis_health() -> Dict[str, Any]:
    """Check Redis health"""
    try:
        redis_client = redis.from_url(
            settings.redis_url,
            password=settings.redis_password,
            decode_responses=True
        )
        
        # Test basic operations
        start_time = datetime.utcnow()
        await redis_client.ping()
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Get info
        info = await redis_client.info()
        
        await redis_client.close()
        
        return {
            "status": "healthy",
            "response_time_ms": round(response_time, 2),
            "version": info.get("redis_version", "unknown"),
            "connected_clients": info.get("connected_clients", 0),
            "used_memory": info.get("used_memory", 0),
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0)
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def _check_provider_health() -> Dict[str, Any]:
    """Check notification provider health"""
    try:
        provider_factory = ProviderFactory()
        providers = ["twilio", "sendgrid", "fcm"]
        
        provider_statuses = {}
        
        for provider_name in providers:
            try:
                provider = await provider_factory.get_provider(provider_name)
                health = await provider.get_provider_health()
                provider_statuses[provider_name] = health
            except Exception as e:
                provider_statuses[provider_name] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        # Determine overall provider health
        healthy_count = sum(1 for status in provider_statuses.values() if status.get("status") == "healthy")
        total_count = len(provider_statuses)
        
        if healthy_count == total_count:
            overall_status = "healthy"
        elif healthy_count > 0:
            overall_status = "degraded"
        else:
            overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "providers": provider_statuses,
            "healthy_providers": healthy_count,
            "total_providers": total_count
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def _check_system_health() -> Dict[str, Any]:
    """Check system resource health"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Determine status based on thresholds
        status = "healthy"
        warnings = []
        
        if cpu_percent > 90:
            status = "critical"
            warnings.append(f"High CPU usage: {cpu_percent}%")
        elif cpu_percent > 80:
            status = "warning"
            warnings.append(f"Elevated CPU usage: {cpu_percent}%")
        
        if memory.percent > 95:
            status = "critical"
            warnings.append(f"High memory usage: {memory.percent}%")
        elif memory.percent > 85:
            status = "warning"
            warnings.append(f"Elevated memory usage: {memory.percent}%")
        
        if disk.percent > 95:
            status = "critical"
            warnings.append(f"High disk usage: {disk.percent}%")
        elif disk.percent > 85:
            status = "warning"
            warnings.append(f"Elevated disk usage: {disk.percent}%")
        
        return {
            "status": status,
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_percent": disk.percent,
            "disk_free_gb": round(disk.free / (1024**3), 2),
            "warnings": warnings
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def _check_notification_service_health() -> Dict[str, Any]:
    """Check notification service specific health"""
    try:
        notification_service = NotificationService()
        
        # Check if service is initialized
        if not hasattr(notification_service, '_initialized') or not notification_service._initialized:
            return {
                "status": "unhealthy",
                "reason": "Service not initialized"
            }
        
        # Check recent notification processing
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)
        
        from app.models.notification import Notification
        from app.models.delivery_log import DeliveryLog
        
        recent_notifications = await Notification.find({"created_at": {"$gte": last_hour}}).count()
        recent_deliveries = await DeliveryLog.find({"timestamp": {"$gte": last_hour}}).count()
        
        # Check for any stuck notifications
        stuck_notifications = await Notification.find({
            "status": "queued",
            "created_at": {"$lt": now - timedelta(minutes=30)}
        }).count()
        
        status = "healthy"
        warnings = []
        
        if stuck_notifications > 0:
            status = "degraded"
            warnings.append(f"{stuck_notifications} notifications stuck in queue")
        
        return {
            "status": status,
            "recent_notifications": recent_notifications,
            "recent_deliveries": recent_deliveries,
            "stuck_notifications": stuck_notifications,
            "warnings": warnings
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


def _get_uptime() -> str:
    """Get service uptime"""
    try:
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.utcnow() - boot_time
        
        days = uptime.days
        hours, remainder = divmod(uptime.seconds, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        return f"{days}d {hours}h {minutes}m {seconds}s"
        
    except Exception:
        return "unknown"
"""
Serenity Notification Service
HIPAA-compliant multi-channel notification system
"""
import logging
import structlog
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app, Counter, Histogram, Gauge
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import redis.asyncio as redis

from app.core.config import settings
from app.core.database import init_database, close_database
from app.core.logging import setup_logging
from app.middleware.audit import AuditMiddleware
from app.middleware.encryption import PHIEncryptionMiddleware
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.api.v1 import notifications, templates, preferences, analytics, webhooks, health
from app.services.websocket_manager import WebSocketManager
from app.services.notification_service import NotificationService
from app.tasks.celery_app import celery_app

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
ACTIVE_CONNECTIONS = Gauge('websocket_connections_active', 'Active WebSocket connections')
NOTIFICATION_COUNTER = Counter('notifications_sent_total', 'Total notifications sent', ['channel', 'status'])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# WebSocket manager
websocket_manager = WebSocketManager()

# Notification service
notification_service = NotificationService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger = structlog.get_logger()
    logger.info("Starting Serenity Notification Service", version=settings.app_version)
    
    # Initialize database
    await init_database()
    
    # Initialize Redis connection
    app.state.redis = redis.from_url(
        settings.redis_url,
        password=settings.redis_password,
        decode_responses=True
    )
    
    # Test connections
    try:
        await app.state.redis.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.error("Failed to connect to Redis", error=str(e))
        raise
    
    # Initialize WebSocket manager
    await websocket_manager.initialize()
    
    # Initialize notification service
    await notification_service.initialize()
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Serenity Notification Service")
    
    # Close connections
    await app.state.redis.close()
    await close_database()
    
    # Cleanup services
    await websocket_manager.cleanup()
    await notification_service.cleanup()
    
    logger.info("Application shutdown complete")


def create_application() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title="Serenity Notification Service",
        description="HIPAA-compliant multi-channel notification system for healthcare",
        version=settings.app_version,
        debug=settings.debug,
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
        lifespan=lifespan
    )
    
    # Setup logging
    setup_logging()
    
    # Add middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=settings.allowed_methods,
        allow_headers=settings.allowed_headers,
    )
    
    # Custom middleware
    app.add_middleware(ErrorHandlerMiddleware)
    app.add_middleware(PHIEncryptionMiddleware)
    app.add_middleware(AuditMiddleware)
    
    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    # Request tracking middleware
    @app.middleware("http")
    async def track_requests(request: Request, call_next):
        start_time = datetime.utcnow()
        
        response = await call_next(request)
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        REQUEST_DURATION.observe(duration)
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        
        return response
    
    # Include routers
    app.include_router(health.router, prefix="/health", tags=["health"])
    app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
    app.include_router(templates.router, prefix="/api/v1/templates", tags=["templates"])
    app.include_router(preferences.router, prefix="/api/v1/preferences", tags=["preferences"])
    app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
    app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])
    
    # WebSocket endpoint
    @app.websocket("/ws/{user_id}")
    async def websocket_endpoint(websocket, user_id: str):
        await websocket_manager.connect(websocket, user_id)
        try:
            ACTIVE_CONNECTIONS.inc()
            while True:
                data = await websocket.receive_text()
                await websocket_manager.handle_message(user_id, data)
        except Exception as e:
            logger = structlog.get_logger()
            logger.warning("WebSocket connection closed", user_id=user_id, error=str(e))
        finally:
            ACTIVE_CONNECTIONS.dec()
            await websocket_manager.disconnect(user_id)
    
    # Metrics endpoint
    if settings.prometheus_enabled:
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)
    
    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger = structlog.get_logger()
        logger.error(
            "Unhandled exception",
            path=request.url.path,
            method=request.method,
            error=str(exc),
            exc_info=exc
        )
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": "An unexpected error occurred" if settings.environment == "production" else str(exc),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    return app


# Create application instance
app = create_application()


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "healthy",
        "features": [
            "Multi-channel notifications",
            "Template management",
            "HIPAA compliance",
            "Real-time WebSocket updates",
            "Crisis alert system",
            "Healthcare integrations"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        workers=1 if settings.debug else settings.workers,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
        access_log=True
    )

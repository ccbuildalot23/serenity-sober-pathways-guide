"""
Database configuration and connection management for MongoDB.
HIPAA-compliant with audit logging and encryption at rest.
"""

import asyncio
from typing import Optional

import motor.motor_asyncio
from beanie import init_beanie
from pymongo.errors import ConnectionFailure, OperationFailure

from ..models.notification import Notification
from ..models.template import NotificationTemplate
from ..models.user_preferences import UserPreferences
from ..models.delivery_log import DeliveryLog
from ..models.audit_log import AuditLog
from .config import settings
from .logging import get_logger

logger = get_logger(__name__)

# Global database client
_db_client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
_database = None


async def get_database():
    """Get database instance with connection pooling."""
    global _database, _db_client
    
    if _database is None:
        await init_db()
    
    return _database


async def init_db():
    """Initialize database connection and models."""
    global _database, _db_client
    
    try:
        # Create MongoDB client with connection pooling
        _db_client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.mongodb_url,
            maxPoolSize=10,
            minPoolSize=5,
            maxIdleTimeMS=30000,
            waitQueueTimeoutMS=5000,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
        )
        
        # Get database
        _database = _db_client[settings.mongodb_database]
        
        # Test connection
        await _db_client.admin.command('ping')
        logger.info(f"Connected to MongoDB: {settings.mongodb_database}")
        
        # Initialize Beanie with document models
        document_models = [
            Notification,
            NotificationTemplate, 
            UserPreferences,
            DeliveryLog,
            AuditLog,
        ]
        
        await init_beanie(
            database=_database,
            document_models=document_models,
        )
        
        logger.info("Beanie ODM initialized with document models")
        
        # Create indexes for performance and compliance
        await create_indexes()
        
        logger.info("Database initialization completed")
        
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise
    except OperationFailure as e:
        logger.error(f"MongoDB operation failed: {e}")
        raise
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise


async def create_indexes():
    """Create database indexes for performance and compliance."""
    try:
        # Notification indexes
        await Notification.create_index("user_id")
        await Notification.create_index("status")
        await Notification.create_index("channel")
        await Notification.create_index("created_at")
        await Notification.create_index([("user_id", 1), ("status", 1)])
        await Notification.create_index([("created_at", -1)])
        
        # Template indexes
        await NotificationTemplate.create_index("name", unique=True)
        await NotificationTemplate.create_index("category")
        await NotificationTemplate.create_index("is_active")
        
        # User preferences indexes
        await UserPreferences.create_index("user_id", unique=True)
        await UserPreferences.create_index("updated_at")
        
        # Delivery log indexes (for analytics and compliance)
        await DeliveryLog.create_index("notification_id")
        await DeliveryLog.create_index("user_id")
        await DeliveryLog.create_index("channel")
        await DeliveryLog.create_index("status")
        await DeliveryLog.create_index("delivered_at")
        await DeliveryLog.create_index([("user_id", 1), ("channel", 1)])
        await DeliveryLog.create_index([("delivered_at", -1)])
        
        # Audit log indexes (HIPAA compliance)
        await AuditLog.create_index("user_id")
        await AuditLog.create_index("action")
        await AuditLog.create_index("timestamp")
        await AuditLog.create_index([("user_id", 1), ("timestamp", -1)])
        await AuditLog.create_index([("timestamp", -1)])
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Failed to create database indexes: {e}")
        raise


async def close_db():
    """Close database connection."""
    global _db_client
    
    if _db_client:
        _db_client.close()
        logger.info("Database connection closed")


class DatabaseHealthCheck:
    """Database health check for monitoring."""
    
    @staticmethod
    async def check_connection() -> dict:
        """Check database connection health."""
        try:
            if _db_client is None:
                return {
                    "status": "unhealthy",
                    "message": "No database connection",
                    "connected": False
                }
            
            # Ping database
            result = await _db_client.admin.command('ping')
            
            if result.get('ok') == 1:
                # Check collection counts for basic validation
                notification_count = await Notification.count()
                
                return {
                    "status": "healthy",
                    "message": "Database connection active",
                    "connected": True,
                    "database": settings.mongodb_database,
                    "collections": {
                        "notifications": notification_count,
                    }
                }
            else:
                return {
                    "status": "unhealthy", 
                    "message": "Database ping failed",
                    "connected": False
                }
                
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "message": str(e),
                "connected": False
            }


# Database transaction context manager
class DatabaseTransaction:
    """Context manager for database transactions."""
    
    def __init__(self):
        self.session = None
    
    async def __aenter__(self):
        """Start database session."""
        if _db_client:
            self.session = await _db_client.start_session()
            self.session.start_transaction()
        return self.session
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Handle transaction completion."""
        if self.session:
            try:
                if exc_type is None:
                    await self.session.commit_transaction()
                else:
                    await self.session.abort_transaction()
            finally:
                await self.session.end_session()
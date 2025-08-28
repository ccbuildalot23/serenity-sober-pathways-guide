"""
Test configuration and fixtures for the notification service.
"""

import asyncio
import os
import pytest
from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.database import init_db
from app.models.notification import Notification
from app.models.template import NotificationTemplate
from app.models.user_preferences import UserPreferences


# Override settings for testing
settings.mongodb_url = "mongodb://localhost:27017/serenity_notifications_test"
settings.redis_url = "redis://localhost:6379/10"  # Use different Redis DB
settings.debug = True
settings.environment = "testing"


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def db():
    """Initialize test database."""
    await init_db()
    yield
    # Cleanup - drop test database
    client = AsyncIOMotorClient(settings.mongodb_url)
    await client.drop_database("serenity_notifications_test")


@pytest.fixture
async def clean_db(db):
    """Clean database before each test."""
    # Clear all collections
    await Notification.delete_all()
    await NotificationTemplate.delete_all()
    await UserPreferences.delete_all()
    yield


@pytest.fixture
def client() -> TestClient:
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_notification_data():
    """Sample notification data for testing."""
    return {
        "user_id": "test_user_123",
        "channel": "email",
        "recipient": "test@example.com",
        "message": "Test notification message",
        "subject": "Test Subject",
        "priority": "normal"
    }


@pytest.fixture
def sample_template_data():
    """Sample template data for testing."""
    return {
        "name": "test_template",
        "display_name": "Test Template",
        "category": "notification",
        "subject_template": "Hello {{user_name}}!",
        "message_template": "Welcome {{user_name}} to {{app_name}}!",
        "variables": ["user_name", "app_name"],
        "created_by": "test_admin"
    }


@pytest.fixture
def sample_preferences_data():
    """Sample user preferences data for testing."""
    return {
        "user_id": "test_user_123",
        "notifications_enabled": True,
        "channel_preferences": {
            "email": {
                "channel": "email",
                "opt_in_status": "opted_in",
                "enabled": True
            }
        },
        "contact_info": {
            "email": "test@example.com"
        }
    }


@pytest.fixture
def auth_headers():
    """Mock authentication headers."""
    return {
        "Authorization": "Bearer test_token",
        "X-User-ID": "test_user_123"
    }


@pytest.fixture
def mock_twilio_client(monkeypatch):
    """Mock Twilio client for testing."""
    class MockTwilioMessage:
        def __init__(self):
            self.sid = "test_message_id"
            self.status = "sent"
            self.price = "0.0075"
            self.price_unit = "USD"
            self.direction = "outbound-api"
            self.num_segments = 1
            self.error_code = None
            self.error_message = None
            self.date_updated = None
    
    class MockTwilioMessages:
        def create(self, **kwargs):
            return MockTwilioMessage()
        
        def __call__(self, sid):
            return MockTwilioMessage()
        
        def fetch(self):
            return MockTwilioMessage()
    
    class MockTwilioClient:
        def __init__(self, *args, **kwargs):
            self.messages = MockTwilioMessages()
    
    monkeypatch.setattr("twilio.rest.Client", MockTwilioClient)
    return MockTwilioClient


@pytest.fixture
def mock_sendgrid_client(monkeypatch):
    """Mock SendGrid client for testing."""
    class MockSendGridResponse:
        def __init__(self):
            self.status_code = 202
            self.body = b'{"message": "success"}'
            self.headers = {"X-Message-Id": "test_email_id"}
    
    class MockSendGridClient:
        def __init__(self, *args, **kwargs):
            pass
        
        def send(self, message):
            return MockSendGridResponse()
    
    monkeypatch.setattr("sendgrid.SendGridAPIClient", MockSendGridClient)
    return MockSendGridClient


@pytest.fixture
def mock_fcm_client(monkeypatch):
    """Mock FCM client for testing."""
    class MockFCMNotification:
        def __init__(self, *args, **kwargs):
            pass
        
        def notify_single_device(self, **kwargs):
            return {
                "success": 1,
                "failure": 0,
                "results": [{"message_id": "test_push_id"}]
            }
        
        def notify_multiple_devices(self, **kwargs):
            return {
                "success": len(kwargs.get("registration_ids", [])),
                "failure": 0,
                "results": [{"message_id": f"test_push_id_{i}"} 
                          for i in range(len(kwargs.get("registration_ids", [])))]
            }
        
        def notify_topic_subscribers(self, **kwargs):
            return {
                "success": 1,
                "failure": 0,
                "message_id": "test_topic_message_id"
            }
    
    monkeypatch.setattr("pyfcm.FCMNotification", MockFCMNotification)
    return MockFCMNotification
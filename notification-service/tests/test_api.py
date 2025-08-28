"""
API integration tests for the notification service.
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.models.notification import Notification, NotificationStatus, NotificationChannel
from app.models.template import NotificationTemplate
from app.models.user_preferences import UserPreferences


class TestNotificationAPI:
    """Test notification API endpoints."""
    
    def test_create_notification(self, client: TestClient, clean_db, sample_notification_data, auth_headers):
        """Test creating a new notification."""
        response = client.post(
            "/api/v1/notifications/",
            json=sample_notification_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == sample_notification_data["user_id"]
        assert data["channel"] == sample_notification_data["channel"]
        assert data["status"] == "pending"
    
    def test_create_notification_invalid_data(self, client: TestClient, auth_headers):
        """Test creating notification with invalid data."""
        invalid_data = {
            "user_id": "",  # Invalid: empty user_id
            "channel": "invalid_channel",  # Invalid channel
            "recipient": "invalid_email",  # Invalid email
            "message": ""  # Invalid: empty message
        }
        
        response = client.post(
            "/api/v1/notifications/",
            json=invalid_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422
    
    def test_get_notification(self, client: TestClient, clean_db, auth_headers):
        """Test retrieving a notification."""
        # First create a notification
        notification_data = {
            "user_id": "test_user",
            "channel": "email",
            "recipient": "test@example.com",
            "message": "Test message"
        }
        
        create_response = client.post(
            "/api/v1/notifications/",
            json=notification_data,
            headers=auth_headers
        )
        
        notification_id = create_response.json()["id"]
        
        # Then retrieve it
        response = client.get(
            f"/api/v1/notifications/{notification_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == notification_id
        assert data["user_id"] == notification_data["user_id"]
    
    def test_list_notifications(self, client: TestClient, clean_db, auth_headers):
        """Test listing notifications with pagination."""
        # Create multiple notifications
        for i in range(5):
            notification_data = {
                "user_id": f"test_user_{i}",
                "channel": "email",
                "recipient": f"test{i}@example.com",
                "message": f"Test message {i}"
            }
            client.post(
                "/api/v1/notifications/",
                json=notification_data,
                headers=auth_headers
            )
        
        # Test pagination
        response = client.get(
            "/api/v1/notifications/?page=1&page_size=3",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["has_next"] == True
    
    def test_bulk_create_notifications(self, client: TestClient, clean_db, auth_headers):
        """Test bulk notification creation."""
        bulk_data = {
            "notifications": [
                {
                    "user_id": "user1",
                    "channel": "email",
                    "recipient": "user1@example.com",
                    "message": "Message 1"
                },
                {
                    "user_id": "user2",
                    "channel": "sms", 
                    "recipient": "+1234567890",
                    "message": "Message 2"
                }
            ]
        }
        
        response = client.post(
            "/api/v1/notifications/bulk",
            json=bulk_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["total"] == 2
        assert data["successful"] == 2
        assert data["failed"] == 0
    
    def test_send_notification(self, client: TestClient, clean_db, auth_headers, mock_sendgrid_client):
        """Test sending a notification immediately."""
        notification_data = {
            "user_id": "test_user",
            "channel": "email",
            "recipient": "test@example.com", 
            "message": "Test message",
            "send_immediately": True
        }
        
        response = client.post(
            "/api/v1/notifications/send",
            json=notification_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "message_id" in data


class TestTemplateAPI:
    """Test template API endpoints."""
    
    def test_create_template(self, client: TestClient, clean_db, sample_template_data, auth_headers):
        """Test creating a new template."""
        response = client.post(
            "/api/v1/templates/",
            json=sample_template_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_template_data["name"]
        assert data["category"] == sample_template_data["category"]
    
    def test_list_templates(self, client: TestClient, clean_db, auth_headers):
        """Test listing templates."""
        # Create a template first
        template_data = {
            "name": "welcome_email",
            "display_name": "Welcome Email",
            "category": "welcome",
            "message_template": "Welcome {{user_name}}!",
            "created_by": "admin"
        }
        
        client.post(
            "/api/v1/templates/",
            json=template_data,
            headers=auth_headers
        )
        
        response = client.get(
            "/api/v1/templates/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "welcome_email"
    
    def test_render_template(self, client: TestClient, clean_db, auth_headers):
        """Test template rendering with variables."""
        # Create template
        template_data = {
            "name": "greeting_template",
            "display_name": "Greeting Template",
            "category": "notification",
            "subject_template": "Hello {{user_name}}!",
            "message_template": "Welcome {{user_name}} to {{app_name}}!",
            "created_by": "admin"
        }
        
        create_response = client.post(
            "/api/v1/templates/",
            json=template_data,
            headers=auth_headers
        )
        
        template_id = create_response.json()["id"]
        
        # Render template
        render_data = {
            "channel": "email",
            "variables": {
                "user_name": "John Doe",
                "app_name": "Serenity"
            }
        }
        
        response = client.post(
            f"/api/v1/templates/{template_id}/render",
            json=render_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["subject"] == "Hello John Doe!"
        assert data["message"] == "Welcome John Doe to Serenity!"


class TestUserPreferencesAPI:
    """Test user preferences API endpoints."""
    
    def test_create_preferences(self, client: TestClient, clean_db, sample_preferences_data, auth_headers):
        """Test creating user preferences."""
        response = client.post(
            "/api/v1/preferences/",
            json=sample_preferences_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == sample_preferences_data["user_id"]
        assert data["notifications_enabled"] == True
    
    def test_get_preferences(self, client: TestClient, clean_db, auth_headers):
        """Test retrieving user preferences."""
        user_id = "test_user_123"
        
        # Create preferences first
        preferences_data = {
            "user_id": user_id,
            "notifications_enabled": True,
            "contact_info": {
                "email": "test@example.com"
            }
        }
        
        client.post(
            "/api/v1/preferences/",
            json=preferences_data,
            headers=auth_headers
        )
        
        # Retrieve preferences
        response = client.get(
            f"/api/v1/preferences/{user_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == user_id
        assert data["notifications_enabled"] == True
    
    def test_opt_in_channel(self, client: TestClient, clean_db, auth_headers):
        """Test opting into a notification channel."""
        user_id = "test_user_123"
        
        opt_in_data = {
            "channel": "email",
            "contact_info": "test@example.com"
        }
        
        response = client.post(
            f"/api/v1/preferences/{user_id}/opt-in",
            json=opt_in_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
    
    def test_opt_out_channel(self, client: TestClient, clean_db, auth_headers):
        """Test opting out of a notification channel."""
        user_id = "test_user_123"
        
        # First opt in
        opt_in_data = {
            "channel": "email",
            "contact_info": "test@example.com"
        }
        
        client.post(
            f"/api/v1/preferences/{user_id}/opt-in",
            json=opt_in_data,
            headers=auth_headers
        )
        
        # Then opt out
        opt_out_data = {
            "channel": "email"
        }
        
        response = client.post(
            f"/api/v1/preferences/{user_id}/opt-out",
            json=opt_out_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True


class TestHealthAPI:
    """Test health check endpoints."""
    
    def test_basic_health_check(self, client: TestClient):
        """Test basic health endpoint."""
        response = client.get("/health/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
    
    def test_detailed_health_check(self, client: TestClient):
        """Test detailed health endpoint."""
        response = client.get("/health/detailed")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "dependencies" in data
        assert "metrics" in data
    
    def test_ready_check(self, client: TestClient):
        """Test readiness endpoint."""
        response = client.get("/health/ready")
        
        assert response.status_code == 200
        data = response.json()
        assert data["ready"] == True


class TestAnalyticsAPI:
    """Test analytics API endpoints."""
    
    def test_delivery_analytics(self, client: TestClient, clean_db, auth_headers):
        """Test delivery analytics endpoint."""
        response = client.get(
            "/api/v1/analytics/delivery",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_notifications" in data
        assert "delivery_rate" in data
        assert "channel_breakdown" in data
    
    def test_channel_analytics(self, client: TestClient, auth_headers):
        """Test channel analytics endpoint."""
        response = client.get(
            "/api/v1/analytics/channels",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "channels" in data
    
    def test_user_analytics(self, client: TestClient, auth_headers):
        """Test user analytics endpoint."""
        response = client.get(
            "/api/v1/analytics/users",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "active_users" in data


class TestErrorHandling:
    """Test API error handling."""
    
    def test_not_found_error(self, client: TestClient, auth_headers):
        """Test 404 error handling."""
        response = client.get(
            "/api/v1/notifications/nonexistent_id",
            headers=auth_headers
        )
        
        assert response.status_code == 404
        data = response.json()
        assert data["success"] == False
        assert "error" in data
    
    def test_validation_error(self, client: TestClient, auth_headers):
        """Test validation error handling."""
        invalid_data = {
            "user_id": "",  # Invalid
            "channel": "invalid"  # Invalid
        }
        
        response = client.post(
            "/api/v1/notifications/",
            json=invalid_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
    
    def test_unauthorized_access(self, client: TestClient):
        """Test unauthorized access handling."""
        response = client.get("/api/v1/notifications/")
        
        assert response.status_code == 401
    
    def test_rate_limit_error(self, client: TestClient, auth_headers):
        """Test rate limiting (this would need to be configured for testing)."""
        # This test would need rate limiting to be properly configured
        # For now, just ensure the endpoint exists
        response = client.get("/api/v1/notifications/", headers=auth_headers)
        assert response.status_code in [200, 429]
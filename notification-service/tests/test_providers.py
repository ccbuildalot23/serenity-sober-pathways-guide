"""
Tests for notification providers.
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.providers.twilio_provider import TwilioSMSProvider, TwilioWhatsAppProvider
from app.providers.sendgrid_provider import SendGridEmailProvider
from app.providers.fcm_provider import FCMPushProvider
from app.providers.base import ProviderStatus, ProviderError


class TestTwilioSMSProvider:
    """Test Twilio SMS provider."""
    
    def test_provider_properties(self):
        """Test provider basic properties."""
        config = {
            "account_sid": "test_sid",
            "auth_token": "test_token", 
            "phone_number": "+1234567890"
        }
        provider = TwilioSMSProvider(config)
        
        assert provider.provider_name == "twilio_sms"
        assert provider.supported_channels == ["sms"]
    
    async def test_validate_recipient(self):
        """Test SMS recipient validation."""
        config = {
            "account_sid": "test_sid",
            "auth_token": "test_token",
            "phone_number": "+1234567890"
        }
        provider = TwilioSMSProvider(config)
        
        # Valid phone numbers
        assert await provider.validate_recipient("+1234567890") == True
        assert await provider.validate_recipient("+447901234567") == True
        
        # Invalid phone numbers
        assert await provider.validate_recipient("1234567890") == False  # No +
        assert await provider.validate_recipient("+123") == False  # Too short
        assert await provider.validate_recipient("+1234567890abcd") == False  # Non-digits
        assert await provider.validate_recipient("") == False  # Empty
    
    async def test_send_notification_success(self, mock_twilio_client):
        """Test successful SMS sending."""
        config = {
            "account_sid": "test_sid", 
            "auth_token": "test_token",
            "phone_number": "+1234567890"
        }
        provider = TwilioSMSProvider(config)
        
        result = await provider.send_notification(
            recipient="+1987654321",
            message="Test SMS message"
        )
        
        assert result.success == True
        assert result.status == ProviderStatus.SENT
        assert result.provider_message_id == "test_message_id"
        assert result.cost == 0.0075
        assert result.currency == "USD"
    
    async def test_send_notification_invalid_recipient(self, mock_twilio_client):
        """Test SMS sending with invalid recipient."""
        config = {
            "account_sid": "test_sid",
            "auth_token": "test_token", 
            "phone_number": "+1234567890"
        }
        provider = TwilioSMSProvider(config)
        
        with pytest.raises(ProviderError) as exc_info:
            await provider.send_notification(
                recipient="invalid_number",
                message="Test message"
            )
        
        assert "Invalid SMS recipient" in str(exc_info.value)
        assert exc_info.value.retryable == False
    
    async def test_estimate_cost(self):
        """Test SMS cost estimation."""
        config = {
            "account_sid": "test_sid",
            "auth_token": "test_token",
            "phone_number": "+1234567890"
        }
        provider = TwilioSMSProvider(config)
        
        # Short message (1 segment)
        cost = await provider.estimate_cost("+1234567890", "Short message")
        assert cost == 0.0075  # US rate
        
        # Long message (2 segments)
        long_message = "x" * 200
        cost = await provider.estimate_cost("+1234567890", long_message)
        assert cost == 0.015  # 2 segments * 0.0075


class TestSendGridEmailProvider:
    """Test SendGrid email provider."""
    
    def test_provider_properties(self):
        """Test provider basic properties."""
        config = {
            "api_key": "test_key",
            "from_email": "test@example.com",
            "from_name": "Test Sender"
        }
        provider = SendGridEmailProvider(config)
        
        assert provider.provider_name == "sendgrid"
        assert provider.supported_channels == ["email"]
    
    async def test_validate_recipient(self):
        """Test email recipient validation."""
        config = {
            "api_key": "test_key",
            "from_email": "test@example.com",
            "from_name": "Test Sender"
        }
        provider = SendGridEmailProvider(config)
        
        # Valid emails
        assert await provider.validate_recipient("test@example.com") == True
        assert await provider.validate_recipient("user.name+tag@domain.co.uk") == True
        
        # Invalid emails
        assert await provider.validate_recipient("invalid_email") == False
        assert await provider.validate_recipient("@example.com") == False
        assert await provider.validate_recipient("test@") == False
        assert await provider.validate_recipient("") == False
    
    async def test_send_notification_success(self, mock_sendgrid_client):
        """Test successful email sending."""
        config = {
            "api_key": "test_key",
            "from_email": "test@example.com", 
            "from_name": "Test Sender"
        }
        provider = SendGridEmailProvider(config)
        
        result = await provider.send_notification(
            recipient="recipient@example.com",
            message="<h1>Test email</h1>",
            subject="Test Subject"
        )
        
        assert result.success == True
        assert result.status == ProviderStatus.SENT
        assert result.provider_message_id == "test_email_id"
    
    def test_html_content_detection(self):
        """Test HTML content detection."""
        config = {
            "api_key": "test_key",
            "from_email": "test@example.com",
            "from_name": "Test Sender"
        }
        provider = SendGridEmailProvider(config)
        
        assert provider._is_html_content("<p>Hello</p>") == True
        assert provider._is_html_content("Plain text") == False
        assert provider._is_html_content("Text with <b>bold</b> part") == True


class TestFCMPushProvider:
    """Test FCM push notification provider."""
    
    def test_provider_properties(self):
        """Test provider basic properties."""
        config = {
            "server_key": "test_key",
            "sender_id": "test_sender_id"
        }
        provider = FCMPushProvider(config)
        
        assert provider.provider_name == "fcm"
        assert provider.supported_channels == ["push"]
    
    async def test_validate_recipient(self):
        """Test push token validation."""
        config = {
            "server_key": "test_key",
            "sender_id": "test_sender_id"
        }
        provider = FCMPushProvider(config)
        
        # Valid tokens
        valid_token = "f" + "a" * 150 + ":APA91bHuT4X"  # Typical FCM token format
        assert await provider.validate_recipient(valid_token) == True
        
        # Valid topic
        assert await provider.validate_recipient("/topics/news") == True
        assert await provider.validate_recipient("/topics/user_123") == True
        
        # Invalid recipients
        assert await provider.validate_recipient("short_token") == False
        assert await provider.validate_recipient("/topics/") == False
        assert await provider.validate_recipient("") == False
    
    async def test_send_notification_success(self, mock_fcm_client):
        """Test successful push notification sending."""
        config = {
            "server_key": "test_key",
            "sender_id": "test_sender_id"
        }
        provider = FCMPushProvider(config)
        
        token = "f" + "a" * 150 + ":APA91bHuT4X"
        result = await provider.send_notification(
            recipient=token,
            message="Test push notification",
            subject="Test Title"
        )
        
        assert result.success == True
        assert result.status == ProviderStatus.SENT
        assert result.provider_message_id == "test_push_id"
    
    async def test_send_topic_notification(self, mock_fcm_client):
        """Test sending notification to topic."""
        config = {
            "server_key": "test_key", 
            "sender_id": "test_sender_id"
        }
        provider = FCMPushProvider(config)
        
        result = await provider.send_notification(
            recipient="/topics/news",
            message="Breaking news!",
            subject="News Alert"
        )
        
        assert result.success == True
        assert result.status == ProviderStatus.SENT
    
    async def test_estimate_cost(self):
        """Test push notification cost estimation."""
        config = {
            "server_key": "test_key",
            "sender_id": "test_sender_id"
        }
        provider = FCMPushProvider(config)
        
        token = "f" + "a" * 150 + ":APA91bHuT4X"
        cost = await provider.estimate_cost(token, "Test message")
        assert cost == 0.0  # FCM is free
    
    def test_supports_batch(self):
        """Test batch support."""
        config = {
            "server_key": "test_key",
            "sender_id": "test_sender_id"
        }
        provider = FCMPushProvider(config)
        
        assert provider.supports_batch() == True


class TestWhatsAppProvider:
    """Test Twilio WhatsApp provider."""
    
    def test_provider_properties(self):
        """Test provider basic properties."""
        config = {
            "account_sid": "test_sid",
            "auth_token": "test_token",
            "whatsapp_number": "whatsapp:+1234567890"
        }
        provider = TwilioWhatsAppProvider(config)
        
        assert provider.provider_name == "twilio_whatsapp"
        assert provider.supported_channels == ["whatsapp"]
    
    async def test_validate_recipient(self):
        """Test WhatsApp recipient validation."""
        config = {
            "account_sid": "test_sid",
            "auth_token": "test_token",
            "whatsapp_number": "whatsapp:+1234567890"
        }
        provider = TwilioWhatsAppProvider(config)
        
        # Valid WhatsApp numbers
        assert await provider.validate_recipient("whatsapp:+1234567890") == True
        assert await provider.validate_recipient("whatsapp:+447901234567") == True
        
        # Invalid formats
        assert await provider.validate_recipient("+1234567890") == False
        assert await provider.validate_recipient("whatsapp:1234567890") == False
        assert await provider.validate_recipient("whatsapp:+123") == False
        assert await provider.validate_recipient("") == False
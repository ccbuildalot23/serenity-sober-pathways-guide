"""
Provider factory for creating notification provider instances.
"""

from typing import Dict, Any, Optional

from ..models.notification import NotificationChannel
from ..core.logging import get_logger
from .base import NotificationProvider
from .twilio_provider import TwilioSMSProvider, TwilioWhatsAppProvider
from .sendgrid_provider import SendGridEmailProvider
from .fcm_provider import FCMPushProvider

logger = get_logger(__name__)


class ProviderFactory:
    """Factory for creating notification provider instances."""
    
    _providers: Dict[NotificationChannel, NotificationProvider] = {}
    
    @classmethod
    def register_provider(
        self,
        channel: NotificationChannel,
        provider: NotificationProvider
    ) -> None:
        """Register a provider for a channel."""
        self._providers[channel] = provider
        logger.info(f"Registered {provider.provider_name} for {channel.value}")
    
    @classmethod
    def get_provider(
        cls,
        channel: NotificationChannel,
        config: Optional[Dict[str, Any]] = None
    ) -> NotificationProvider:
        """Get provider instance for a channel."""
        if channel in cls._providers:
            return cls._providers[channel]
        
        # Create provider based on channel
        provider = cls._create_provider(channel, config)
        cls._providers[channel] = provider
        
        logger.info(f"Created and cached {provider.provider_name} for {channel.value}")
        return provider
    
    @classmethod
    def _create_provider(
        cls,
        channel: NotificationChannel,
        config: Optional[Dict[str, Any]] = None
    ) -> NotificationProvider:
        """Create a new provider instance."""
        provider_map = {
            NotificationChannel.SMS: TwilioSMSProvider,
            NotificationChannel.EMAIL: SendGridEmailProvider,
            NotificationChannel.PUSH: FCMPushProvider,
            NotificationChannel.WHATSAPP: TwilioWhatsAppProvider,
        }
        
        provider_class = provider_map.get(channel)
        if not provider_class:
            raise ValueError(f"No provider available for channel: {channel}")
        
        return provider_class(config)
    
    @classmethod
    def get_all_providers(cls) -> Dict[NotificationChannel, NotificationProvider]:
        """Get all registered providers."""
        return cls._providers.copy()
    
    @classmethod
    def health_check_all(cls) -> Dict[str, Any]:
        """Check health of all providers."""
        results = {}
        
        for channel, provider in cls._providers.items():
            try:
                health = provider.health_check()
                results[channel.value] = health
            except Exception as e:
                results[channel.value] = {
                    "provider": provider.provider_name,
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        return results
    
    @classmethod
    def clear_cache(cls) -> None:
        """Clear provider cache."""
        cls._providers.clear()
        logger.info("Provider cache cleared")


def get_provider(
    channel: NotificationChannel,
    config: Optional[Dict[str, Any]] = None
) -> NotificationProvider:
    """Convenience function to get a provider."""
    return ProviderFactory.get_provider(channel, config)


def initialize_providers() -> None:
    """Initialize all providers with default configurations."""
    try:
        # Initialize SMS provider
        sms_provider = TwilioSMSProvider()
        ProviderFactory.register_provider(NotificationChannel.SMS, sms_provider)
        
        # Initialize email provider
        email_provider = SendGridEmailProvider()
        ProviderFactory.register_provider(NotificationChannel.EMAIL, email_provider)
        
        # Initialize push provider
        push_provider = FCMPushProvider()
        ProviderFactory.register_provider(NotificationChannel.PUSH, push_provider)
        
        # Initialize WhatsApp provider
        whatsapp_provider = TwilioWhatsAppProvider()
        ProviderFactory.register_provider(NotificationChannel.WHATSAPP, whatsapp_provider)
        
        logger.info("All notification providers initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize providers: {e}")
        raise
"""
HIPAA-compliant logging configuration with audit trails.
"""

import logging
import sys
from datetime import datetime
from typing import Any, Dict, Optional

import structlog
from structlog.types import Processor

from .config import settings


def setup_logging() -> None:
    """Configure structured logging for HIPAA compliance."""
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.log_level),
    )
    
    # Configure structlog processors
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        add_timestamp,
        mask_sensitive_fields,
    ]
    
    if settings.environment == "development":
        processors.extend([
            structlog.dev.ConsoleRenderer(colors=True)
        ])
    else:
        processors.extend([
            structlog.processors.JSONRenderer()
        ])
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level)
        ),
        context_class=dict,
        logger_factory=structlog.WriteLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def add_timestamp(logger, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Add ISO timestamp to log entries."""
    event_dict["timestamp"] = datetime.utcnow().isoformat()
    return event_dict


def mask_sensitive_fields(logger, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Mask sensitive fields in log entries for HIPAA compliance."""
    sensitive_fields = [
        "password", "token", "api_key", "secret", "auth_token",
        "phone_number", "email", "ssn", "dob", "medical_record_number"
    ]
    
    def mask_value(value: Any) -> Any:
        """Mask sensitive values."""
        if isinstance(value, str) and len(value) > 4:
            return value[:2] + "*" * (len(value) - 4) + value[-2:]
        elif isinstance(value, str):
            return "*" * len(value)
        elif isinstance(value, dict):
            return {k: mask_value(v) if k.lower() in sensitive_fields else v 
                   for k, v in value.items()}
        return value
    
    # Mask sensitive fields
    for field in sensitive_fields:
        if field in event_dict:
            event_dict[field] = mask_value(event_dict[field])
    
    return event_dict


def get_logger(name: str) -> structlog.BoundLogger:
    """Get a configured logger instance."""
    return structlog.get_logger(name)


class AuditLogger:
    """Specialized logger for HIPAA audit trails."""
    
    def __init__(self, service_name: str = "notification-service"):
        self.logger = get_logger("audit")
        self.service_name = service_name
    
    async def log_notification_sent(
        self,
        user_id: str,
        notification_id: str,
        channel: str,
        success: bool,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log notification delivery for audit trail."""
        await self._log_audit_event(
            action="notification_sent",
            user_id=user_id,
            resource_id=notification_id,
            details={
                "channel": channel,
                "success": success,
                "metadata": metadata or {}
            }
        )
    
    async def log_user_preference_change(
        self,
        user_id: str,
        changes: Dict[str, Any],
        changed_by: str
    ) -> None:
        """Log user preference changes for audit trail."""
        await self._log_audit_event(
            action="preference_updated",
            user_id=user_id,
            details={
                "changes": changes,
                "changed_by": changed_by
            }
        )
    
    async def log_template_access(
        self,
        user_id: str,
        template_id: str,
        action: str
    ) -> None:
        """Log template access for audit trail."""
        await self._log_audit_event(
            action=f"template_{action}",
            user_id=user_id,
            resource_id=template_id
        )
    
    async def log_phi_access(
        self,
        user_id: str,
        accessed_by: str,
        data_type: str,
        purpose: str
    ) -> None:
        """Log PHI data access for HIPAA compliance."""
        await self._log_audit_event(
            action="phi_accessed",
            user_id=user_id,
            details={
                "accessed_by": accessed_by,
                "data_type": data_type,
                "purpose": purpose,
                "phi_flag": True
            }
        )
    
    async def log_security_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log security-related events."""
        await self._log_audit_event(
            action=f"security_{event_type}",
            user_id=user_id,
            details={
                "ip_address": ip_address,
                **(details or {})
            }
        )
    
    async def _log_audit_event(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log an audit event with standard fields."""
        self.logger.info(
            "Audit event logged",
            service=self.service_name,
            action=action,
            user_id=user_id,
            resource_id=resource_id,
            details=details or {},
            audit_event=True,
            compliance="HIPAA"
        )


# Global audit logger instance
audit_logger = AuditLogger()


class PerformanceLogger:
    """Logger for performance monitoring."""
    
    def __init__(self):
        self.logger = get_logger("performance")
    
    async def log_notification_latency(
        self,
        channel: str,
        latency_ms: float,
        success: bool,
        user_id: Optional[str] = None
    ) -> None:
        """Log notification delivery latency."""
        self.logger.info(
            "Notification delivery performance",
            channel=channel,
            latency_ms=latency_ms,
            success=success,
            user_id=user_id,
            metric_type="latency"
        )
    
    async def log_queue_metrics(
        self,
        queue_name: str,
        queue_size: int,
        processing_rate: float
    ) -> None:
        """Log queue performance metrics."""
        self.logger.info(
            "Queue performance metrics",
            queue_name=queue_name,
            queue_size=queue_size,
            processing_rate=processing_rate,
            metric_type="queue_performance"
        )


# Global performance logger instance  
performance_logger = PerformanceLogger()
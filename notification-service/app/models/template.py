"""
Notification template model for reusable message templates.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from beanie import Document, Indexed
from pydantic import Field, validator


class TemplateCategory(str, Enum):
    """Template categories for organization."""
    CRISIS = "crisis"
    REMINDER = "reminder"
    WELCOME = "welcome"
    NOTIFICATION = "notification"
    MARKETING = "marketing"
    SYSTEM = "system"


class TemplateVariable(str, Enum):
    """Available template variables."""
    USER_NAME = "user_name"
    USER_FIRST_NAME = "user_first_name"
    USER_LAST_NAME = "user_last_name"
    PROVIDER_NAME = "provider_name"
    APPOINTMENT_DATE = "appointment_date"
    APPOINTMENT_TIME = "appointment_time"
    CRISIS_LEVEL = "crisis_level"
    SUPPORT_PHONE = "support_phone"
    MEDICATION_NAME = "medication_name"
    CHECKIN_SCORE = "checkin_score"
    CUSTOM_MESSAGE = "custom_message"
    VERIFICATION_CODE = "verification_code"
    RESET_LINK = "reset_link"
    APP_NAME = "app_name"
    COMPANY_NAME = "company_name"


class NotificationTemplate(Document):
    """
    Template for generating personalized notifications.
    """
    
    # Template identification
    name: Indexed(str) = Field(..., description="Unique template name", min_length=1, max_length=100)
    display_name: str = Field(..., description="Human-readable template name")
    category: Indexed(TemplateCategory) = Field(..., description="Template category")
    description: Optional[str] = Field(None, description="Template description", max_length=500)
    
    # Template content
    subject_template: Optional[str] = Field(None, description="Subject line template (for email)")
    message_template: str = Field(..., description="Message content template", min_length=1, max_length=5000)
    
    # Template configuration
    variables: List[TemplateVariable] = Field(default_factory=list, description="Required variables")
    default_values: Optional[Dict[str, str]] = Field(None, description="Default variable values")
    
    # Channel-specific templates
    sms_template: Optional[str] = Field(None, description="SMS-specific template")
    email_template: Optional[str] = Field(None, description="Email-specific template") 
    push_template: Optional[str] = Field(None, description="Push notification template")
    whatsapp_template: Optional[str] = Field(None, description="WhatsApp-specific template")
    
    # Template metadata
    is_active: Indexed(bool) = Field(default=True, description="Template is active")
    version: int = Field(default=1, description="Template version number")
    tags: List[str] = Field(default_factory=list, description="Template tags")
    
    # HIPAA compliance
    contains_phi: bool = Field(default=False, description="Template may contain PHI")
    compliance_notes: Optional[str] = Field(None, description="Compliance notes")
    
    # Usage tracking
    usage_count: int = Field(default=0, description="Number of times used")
    last_used_at: Optional[datetime] = Field(None, description="Last usage timestamp")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = Field(..., description="User who created template")
    updated_by: Optional[str] = Field(None, description="User who last updated template")
    
    @validator("name")
    def validate_name(cls, v):
        """Validate template name format."""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Template name can only contain letters, numbers, hyphens, and underscores")
        return v.lower()
    
    @validator("message_template", "subject_template", "sms_template", 
              "email_template", "push_template", "whatsapp_template")
    def validate_template_syntax(cls, v):
        """Validate template variable syntax."""
        if not v:
            return v
        
        # Check for proper variable syntax: {{variable_name}}
        import re
        variables = re.findall(r'\{\{([^}]+)\}\}', v)
        
        for var in variables:
            var = var.strip()
            if not var.isalnum() and not var.replace("_", "").isalnum():
                raise ValueError(f"Invalid variable name: {var}")
        
        return v
    
    def render_template(
        self, 
        channel: str, 
        variables: Dict[str, Any], 
        fallback_to_default: bool = True
    ) -> Dict[str, str]:
        """
        Render template with provided variables.
        
        Args:
            channel: Target channel (sms, email, push, whatsapp)
            variables: Variable values to substitute
            fallback_to_default: Use default template if channel-specific not available
        
        Returns:
            Dict with rendered subject and message
        """
        # Get channel-specific template or fallback to default
        template_map = {
            "sms": self.sms_template,
            "email": self.email_template,
            "push": self.push_template,
            "whatsapp": self.whatsapp_template,
        }
        
        message_template = template_map.get(channel)
        if not message_template and fallback_to_default:
            message_template = self.message_template
        elif not message_template:
            raise ValueError(f"No template available for channel: {channel}")
        
        # Merge with default values
        render_vars = {}
        if self.default_values:
            render_vars.update(self.default_values)
        render_vars.update(variables)
        
        # Render message
        try:
            rendered_message = self._render_string(message_template, render_vars)
        except KeyError as e:
            raise ValueError(f"Missing required variable: {e}")
        
        result = {"message": rendered_message}
        
        # Render subject if applicable (email)
        if channel == "email" and self.subject_template:
            try:
                result["subject"] = self._render_string(self.subject_template, render_vars)
            except KeyError as e:
                raise ValueError(f"Missing required variable for subject: {e}")
        
        return result
    
    def _render_string(self, template: str, variables: Dict[str, Any]) -> str:
        """Render a template string with variables."""
        import re
        
        def replace_var(match):
            var_name = match.group(1).strip()
            if var_name not in variables:
                raise KeyError(var_name)
            return str(variables[var_name])
        
        return re.sub(r'\{\{([^}]+)\}\}', replace_var, template)
    
    def get_required_variables(self) -> List[str]:
        """Extract required variables from templates."""
        import re
        
        all_variables = set()
        templates_to_check = [
            self.message_template,
            self.subject_template,
            self.sms_template,
            self.email_template,
            self.push_template,
            self.whatsapp_template,
        ]
        
        for template in templates_to_check:
            if template:
                variables = re.findall(r'\{\{([^}]+)\}\}', template)
                all_variables.update(var.strip() for var in variables)
        
        return list(all_variables)
    
    def validate_variables(self, variables: Dict[str, Any]) -> List[str]:
        """Validate that all required variables are provided."""
        required = set(self.get_required_variables())
        provided = set(variables.keys())
        missing = required - provided
        return list(missing)
    
    def increment_usage(self):
        """Increment usage counter."""
        self.usage_count += 1
        self.last_used_at = datetime.utcnow()
    
    def create_version(self, updated_by: str) -> "NotificationTemplate":
        """Create a new version of this template."""
        new_template = self.copy()
        new_template.version = self.version + 1
        new_template.updated_by = updated_by
        new_template.updated_at = datetime.utcnow()
        new_template.usage_count = 0
        new_template.last_used_at = None
        return new_template
    
    class Settings:
        name = "notification_templates"
        use_revision = True
        
        indexes = [
            [("name", 1)],  # Unique index
            [("category", 1), ("is_active", 1)],
            [("created_at", -1)],
            [("usage_count", -1)],
            "tags",
            "version",
        ]
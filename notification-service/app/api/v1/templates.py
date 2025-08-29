"""
Template management API endpoints
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.logging import audit_logger, performance_logger
from app.schemas.template import (
    TemplateRequest, TemplateResponse, TemplateListResponse,
    TemplateRenderRequest, TemplateRenderResponse,
    TemplateVariables, TemplateCategory
)
from app.services.template_service import TemplateService
from app.models.template import NotificationTemplate
from app.utils.auth import get_current_user, require_permissions

router = APIRouter()
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)
logger = structlog.get_logger(__name__)

template_service = TemplateService()


@router.post("/", response_model=TemplateResponse)
@limiter.limit("20/minute")
async def create_template(
    request: TemplateRequest,
    req: Request,
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TemplateResponse:
    """
    Create a new notification template
    
    Features:
    - Jinja2 template engine with variable substitution
    - Multi-channel support (SMS, Email, Push, WhatsApp)
    - Template categories and versioning
    - Variable validation and sanitization
    """
    try:
        # Check permissions
        await require_permissions(current_user, ["manage_templates"])
        
        # Validate template syntax
        validation_result = await template_service.validate_template(
            subject_template=request.subject_template,
            message_template=request.message_template,
            variables=request.variables
        )
        
        if not validation_result.is_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Template validation failed: {validation_result.error_message}"
            )
        
        # Create template
        template = await template_service.create_template(
            request=request,
            creator_id=current_user["sub"]
        )
        
        # Log audit trail
        await audit_logger.log_template_access(
            user_id=current_user["sub"],
            template_id=template.id,
            action="create_template",
            ip_address=req.client.host,
            result="success"
        )
        
        logger.info(
            "Template created",
            template_id=template.id,
            name=template.name,
            category=template.category,
            creator=current_user["sub"]
        )
        
        return TemplateResponse(
            id=template.id,
            name=template.name,
            category=template.category,
            subject_template=template.subject_template,
            message_template=template.message_template,
            variables=template.variables,
            channels=template.channels,
            is_active=template.is_active,
            created_at=template.created_at,
            updated_at=template.updated_at,
            created_by=template.created_by
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create template", error=str(e), name=request.name)
        
        await audit_logger.log_template_access(
            user_id=current_user["sub"],
            template_id="unknown",
            action="create_template",
            ip_address=req.client.host,
            result="failed"
        )
        
        raise HTTPException(status_code=500, detail="Failed to create template")


@router.get("/", response_model=TemplateListResponse)
@limiter.limit("100/minute")
async def list_templates(
    req: Request,
    category: Optional[TemplateCategory] = Query(None),
    active_only: bool = Query(default=True),
    search: Optional[str] = Query(None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    current_user: dict = Depends(get_current_user)
) -> TemplateListResponse:
    """
    List notification templates with filtering and search
    """
    try:
        await require_permissions(current_user, ["view_templates"])
        
        # Build filter criteria
        filters = {}
        
        if active_only:
            filters["is_active"] = True
        
        if category:
            filters["category"] = category.value
        
        if search:
            filters["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]
        
        # Query templates
        templates = await NotificationTemplate.find(filters).skip(offset).limit(limit).to_list()
        total = await NotificationTemplate.find(filters).count()
        
        return TemplateListResponse(
            templates=templates,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to list templates", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to list templates")


@router.get("/{template_id}", response_model=TemplateResponse)
@limiter.limit("200/minute")
async def get_template(
    template_id: str,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> TemplateResponse:
    """
    Get a specific template by ID
    """
    try:
        await require_permissions(current_user, ["view_templates"])
        
        template = await NotificationTemplate.get(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return TemplateResponse(
            id=template.id,
            name=template.name,
            category=template.category,
            description=template.description,
            subject_template=template.subject_template,
            message_template=template.message_template,
            variables=template.variables,
            channels=template.channels,
            is_active=template.is_active,
            created_at=template.created_at,
            updated_at=template.updated_at,
            created_by=template.created_by,
            usage_count=template.usage_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get template", template_id=template_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get template")


@router.put("/{template_id}", response_model=TemplateResponse)
@limiter.limit("20/minute")
async def update_template(
    template_id: str,
    request: TemplateRequest,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> TemplateResponse:
    """
    Update an existing template
    """
    try:
        await require_permissions(current_user, ["manage_templates"])
        
        template = await NotificationTemplate.get(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Validate template syntax
        validation_result = await template_service.validate_template(
            subject_template=request.subject_template,
            message_template=request.message_template,
            variables=request.variables
        )
        
        if not validation_result.is_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Template validation failed: {validation_result.error_message}"
            )
        
        # Store changes for audit
        changes = {}
        if template.name != request.name:
            changes["name"] = {"old": template.name, "new": request.name}
        if template.message_template != request.message_template:
            changes["message_template"] = {"old": "***", "new": "***"}  # Don't log template content
        
        # Update template
        updated_template = await template_service.update_template(
            template_id=template_id,
            request=request,
            updater_id=current_user["sub"]
        )
        
        # Log audit trail
        await audit_logger.log_template_access(
            user_id=current_user["sub"],
            template_id=template_id,
            action="update_template",
            ip_address=req.client.host,
            result="success",
            changes=changes
        )
        
        logger.info(
            "Template updated",
            template_id=template_id,
            name=updated_template.name,
            updater=current_user["sub"]
        )
        
        return TemplateResponse(**updated_template.dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update template", template_id=template_id, error=str(e))
        
        await audit_logger.log_template_access(
            user_id=current_user["sub"],
            template_id=template_id,
            action="update_template",
            ip_address=req.client.host,
            result="failed"
        )
        
        raise HTTPException(status_code=500, detail="Failed to update template")


@router.delete("/{template_id}")
@limiter.limit("10/minute")
async def delete_template(
    template_id: str,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a template (soft delete - marks as inactive)
    """
    try:
        await require_permissions(current_user, ["manage_templates"])
        
        result = await template_service.delete_template(
            template_id=template_id,
            deleter_id=current_user["sub"]
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Log audit trail
        await audit_logger.log_template_access(
            user_id=current_user["sub"],
            template_id=template_id,
            action="delete_template",
            ip_address=req.client.host,
            result="success"
        )
        
        logger.info(
            "Template deleted",
            template_id=template_id,
            deleter=current_user["sub"]
        )
        
        return {"message": "Template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete template", template_id=template_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete template")


@router.post("/{template_id}/render", response_model=TemplateRenderResponse)
@limiter.limit("100/minute")
async def render_template(
    template_id: str,
    request: TemplateRenderRequest,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> TemplateRenderResponse:
    """
    Render a template with provided variables
    
    Features:
    - Variable substitution using Jinja2
    - Validation of required variables
    - Sanitization of user input
    - Preview mode for testing
    """
    start_time = datetime.utcnow()
    
    try:
        await require_permissions(current_user, ["use_templates"])
        
        template = await NotificationTemplate.get(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if not template.is_active:
            raise HTTPException(status_code=400, detail="Template is inactive")
        
        # Render template
        rendered = await template_service.render_template(
            template=template,
            variables=request.variables,
            channel=request.channel
        )
        
        # Log performance
        duration = (datetime.utcnow() - start_time).total_seconds() * 1000
        performance_logger.log_template_render_time(
            template_id=template_id,
            render_time_ms=duration,
            variable_count=len(request.variables)
        )
        
        return TemplateRenderResponse(
            template_id=template_id,
            channel=request.channel,
            rendered_subject=rendered.subject,
            rendered_message=rendered.message,
            variables_used=rendered.variables_used,
            render_time_ms=duration
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to render template",
            template_id=template_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to render template")


@router.post("/{template_id}/validate", response_model=Dict[str, Any])
@limiter.limit("50/minute")
async def validate_template(
    template_id: str,
    request: TemplateVariables,
    req: Request,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Validate template with provided variables
    """
    try:
        await require_permissions(current_user, ["use_templates"])
        
        template = await NotificationTemplate.get(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Validate template
        validation = await template_service.validate_template_variables(
            template=template,
            variables=request.variables
        )
        
        return {
            "is_valid": validation.is_valid,
            "missing_variables": validation.missing_variables,
            "invalid_variables": validation.invalid_variables,
            "warnings": validation.warnings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to validate template",
            template_id=template_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Failed to validate template")


@router.get("/{template_id}/preview")
@limiter.limit("50/minute")
async def preview_template(
    template_id: str,
    req: Request,
    channel: str = Query(...),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Get template preview with sample data
    """
    try:
        await require_permissions(current_user, ["view_templates"])
        
        preview = await template_service.get_template_preview(
            template_id=template_id,
            channel=channel
        )
        
        return {
            "subject_preview": preview.subject,
            "message_preview": preview.message,
            "sample_variables": preview.sample_variables
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to preview template", template_id=template_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to preview template")


@router.get("/{template_id}/usage-stats")
@limiter.limit("50/minute")
async def get_template_usage_stats(
    template_id: str,
    req: Request,
    days: int = Query(default=30, le=365),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get template usage statistics
    """
    try:
        await require_permissions(current_user, ["view_analytics"])
        
        stats = await template_service.get_usage_stats(
            template_id=template_id,
            days=days
        )
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get template usage stats", template_id=template_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get template usage stats")


@router.post("/{template_id}/duplicate", response_model=TemplateResponse)
@limiter.limit("10/minute")
async def duplicate_template(
    template_id: str,
    req: Request,
    new_name: str = Query(...),
    current_user: dict = Depends(get_current_user)
) -> TemplateResponse:
    """
    Duplicate an existing template
    """
    try:
        await require_permissions(current_user, ["manage_templates"])
        
        duplicated = await template_service.duplicate_template(
            template_id=template_id,
            new_name=new_name,
            creator_id=current_user["sub"]
        )
        
        if not duplicated:
            raise HTTPException(status_code=404, detail="Template not found")
        
        logger.info(
            "Template duplicated",
            original_id=template_id,
            new_id=duplicated.id,
            new_name=new_name,
            creator=current_user["sub"]
        )
        
        return TemplateResponse(**duplicated.dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to duplicate template", template_id=template_id, error=str(e))
        raise HTTPException(status_code=500, detail="Failed to duplicate template")
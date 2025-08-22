import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { templateService } from '@/services/TemplateService';
import { logger } from '@/utils/logger';
import { NotificationType, NotificationChannel, APIResponse } from '@/types';

export class TemplateController {
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const template = await templateService.getTemplate(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found'
          }
        });
        return;
      }

      const response: APIResponse = {
        success: true,
        data: template,
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to get template', {
        id: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_RETRIEVAL_ERROR',
          message: 'Failed to retrieve template'
        }
      });
    }
  }

  async getTemplatesByType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const { channel } = req.query;

      const templates = await templateService.getTemplatesByType(
        type as NotificationType,
        channel as NotificationChannel | undefined
      );

      const response: APIResponse = {
        success: true,
        data: {
          templates,
          count: templates.length,
          filters: {
            type,
            channel: channel || 'all'
          }
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to get templates by type', {
        type: req.params.type,
        channel: req.query.channel,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATES_RETRIEVAL_ERROR',
          message: 'Failed to retrieve templates'
        }
      });
    }
  }

  async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const templateData = req.body;

      // Extract variables from template content if not provided
      if (!templateData.variables) {
        const bodyVars = templateService.extractVariables(templateData.body);
        const subjectVars = templateData.subject 
          ? templateService.extractVariables(templateData.subject)
          : [];
        const htmlVars = templateData.htmlBody 
          ? templateService.extractVariables(templateData.htmlBody)
          : [];

        templateData.variables = [...new Set([...bodyVars, ...subjectVars, ...htmlVars])];
      }

      const template = await templateService.createTemplate(templateData);

      if (!template) {
        res.status(500).json({
          success: false,
          error: {
            code: 'TEMPLATE_CREATION_FAILED',
            message: 'Failed to create template'
          }
        });
        return;
      }

      logger.info('Template created successfully', {
        templateId: template.id,
        name: template.name,
        type: template.type,
        channel: template.channel,
        createdBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: template,
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.status(201).json(response);

    } catch (error: any) {
      logger.error('Failed to create template', {
        templateData: req.body,
        error: error.message,
        createdBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_CREATION_ERROR',
          message: 'Failed to create template'
        }
      });
    }
  }

  async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Extract variables from updated content if body is being updated
      if (updates.body || updates.subject || updates.htmlBody) {
        const template = await templateService.getTemplate(id);
        if (template) {
          const bodyVars = templateService.extractVariables(updates.body || template.body);
          const subjectVars = templateService.extractVariables(updates.subject || template.subject || '');
          const htmlVars = templateService.extractVariables(updates.htmlBody || template.htmlBody || '');

          updates.variables = [...new Set([...bodyVars, ...subjectVars, ...htmlVars])];
        }
      }

      const updated = await templateService.updateTemplate(id, updates);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found or update failed'
          }
        });
        return;
      }

      logger.info('Template updated successfully', {
        templateId: id,
        updates: Object.keys(updates),
        updatedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Template updated successfully',
          templateId: id,
          updatedFields: Object.keys(updates)
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to update template', {
        id: req.params.id,
        updates: req.body,
        error: error.message,
        updatedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_UPDATE_ERROR',
          message: 'Failed to update template'
        }
      });
    }
  }

  async deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await templateService.deleteTemplate(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found'
          }
        });
        return;
      }

      logger.info('Template deleted successfully', {
        templateId: id,
        deletedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Template deleted successfully',
          templateId: id
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to delete template', {
        id: req.params.id,
        error: error.message,
        deletedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_DELETE_ERROR',
          message: 'Failed to delete template'
        }
      });
    }
  }

  async renderTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { data } = req.body;

      const template = await templateService.getTemplate(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Template not found'
          }
        });
        return;
      }

      const rendered = await templateService.renderTemplate(template, data || {});

      const response: APIResponse = {
        success: true,
        data: {
          rendered,
          template: {
            id: template.id,
            name: template.name,
            type: template.type,
            channel: template.channel
          }
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to render template', {
        id: req.params.id,
        data: req.body.data,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_RENDER_ERROR',
          message: 'Failed to render template',
          details: error.message
        }
      });
    }
  }

  async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { template, data } = req.body;

      if (!template || !template.body) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TEMPLATE',
            message: 'Template body is required'
          }
        });
        return;
      }

      // Create a temporary template object
      const tempTemplate = {
        id: 'preview',
        name: 'Preview Template',
        type: template.type || NotificationType.SYSTEM_NOTIFICATION,
        channel: template.channel || NotificationChannel.EMAIL,
        subject: template.subject,
        body: template.body,
        htmlBody: template.htmlBody,
        variables: templateService.extractVariables(template.body),
        isActive: true,
        isHipaaCompliant: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const rendered = await templateService.renderTemplate(tempTemplate, data || {});

      const response: APIResponse = {
        success: true,
        data: {
          rendered,
          extractedVariables: tempTemplate.variables,
          isPreview: true
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to preview template', {
        template: req.body.template,
        data: req.body.data,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_PREVIEW_ERROR',
          message: 'Failed to preview template',
          details: error.message
        }
      });
    }
  }

  async getTemplateVariables(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body;

      if (!content) {
        res.status(400).json({
          success: false,
          error: {
            code: 'CONTENT_REQUIRED',
            message: 'Template content is required'
          }
        });
        return;
      }

      const variables = templateService.extractVariables(content);

      const response: APIResponse = {
        success: true,
        data: {
          variables,
          count: variables.length
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to extract template variables', {
        content: req.body.content,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'VARIABLE_EXTRACTION_ERROR',
          message: 'Failed to extract template variables'
        }
      });
    }
  }

  async cloneTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const originalTemplate = await templateService.getTemplate(id);

      if (!originalTemplate) {
        res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Original template not found'
          }
        });
        return;
      }

      const clonedTemplate = await templateService.createTemplate({
        name: name || `${originalTemplate.name} (Copy)`,
        type: originalTemplate.type,
        channel: originalTemplate.channel,
        subject: originalTemplate.subject,
        body: originalTemplate.body,
        htmlBody: originalTemplate.htmlBody,
        variables: originalTemplate.variables,
        isHipaaCompliant: originalTemplate.isHipaaCompliant
      });

      if (!clonedTemplate) {
        res.status(500).json({
          success: false,
          error: {
            code: 'TEMPLATE_CLONE_FAILED',
            message: 'Failed to clone template'
          }
        });
        return;
      }

      logger.info('Template cloned successfully', {
        originalId: id,
        clonedId: clonedTemplate.id,
        clonedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: clonedTemplate,
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.status(201).json(response);

    } catch (error: any) {
      logger.error('Failed to clone template', {
        id: req.params.id,
        name: req.body.name,
        error: error.message,
        clonedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_CLONE_ERROR',
          message: 'Failed to clone template'
        }
      });
    }
  }
}

export const templateController = new TemplateController();
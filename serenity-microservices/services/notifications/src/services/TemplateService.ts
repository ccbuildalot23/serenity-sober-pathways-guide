import Handlebars from 'handlebars';
import { database } from '@/models/database';
import { logger } from '@/utils/logger';
import { NotificationTemplate, NotificationType, NotificationChannel } from '@/types';

export class TemplateService {
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor() {
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date | string, format: string = 'MMM DD, YYYY') => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    });

    // Time formatting helper
    Handlebars.registerHelper('formatTime', (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // Capitalization helper
    Handlebars.registerHelper('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Truncate helper
    Handlebars.registerHelper('truncate', (str: string, length: number = 50) => {
      if (str.length <= length) return str;
      return str.substring(0, length) + '...';
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Crisis urgency helper
    Handlebars.registerHelper('crisisUrgency', (level: string) => {
      const urgencyMap: Record<string, string> = {
        low: '🟡 Low Priority',
        medium: '🟠 Medium Priority',
        high: '🔴 High Priority',
        critical: '🚨 CRITICAL ALERT'
      };
      return urgencyMap[level] || level;
    });

    // Milestone celebration helper
    Handlebars.registerHelper('celebratedays', (days: number) => {
      if (days === 1) return '🎉 1 Day Sober!';
      if (days === 7) return '🌟 One Week Sober!';
      if (days === 30) return '🏆 One Month Sober!';
      if (days === 90) return '💎 90 Days Sober!';
      if (days === 365) return '👑 One Year Sober!';
      return `🎊 ${days} Days Sober!`;
    });
  }

  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      const query = `
        SELECT * FROM notification_templates 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await database.query(query, [templateId]);
      
      if (result.rows.length === 0) {
        logger.warn('Template not found or inactive', { templateId });
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        type: row.type as NotificationType,
        channel: row.channel as NotificationChannel,
        subject: row.subject,
        body: row.body,
        htmlBody: row.html_body,
        variables: Array.isArray(row.variables) ? row.variables : JSON.parse(row.variables || '[]'),
        isActive: row.is_active,
        isHipaaCompliant: row.is_hipaa_compliant,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version
      };

    } catch (error) {
      logger.error('Failed to get template', { templateId, error });
      return null;
    }
  }

  async getTemplatesByType(
    type: NotificationType, 
    channel?: NotificationChannel
  ): Promise<NotificationTemplate[]> {
    try {
      let query = `
        SELECT * FROM notification_templates 
        WHERE type = $1 AND is_active = true
      `;
      const params = [type];

      if (channel) {
        query += ' AND channel = $2';
        params.push(channel);
      }

      query += ' ORDER BY version DESC';

      const result = await database.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type as NotificationType,
        channel: row.channel as NotificationChannel,
        subject: row.subject,
        body: row.body,
        htmlBody: row.html_body,
        variables: Array.isArray(row.variables) ? row.variables : JSON.parse(row.variables || '[]'),
        isActive: row.is_active,
        isHipaaCompliant: row.is_hipaa_compliant,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version
      }));

    } catch (error) {
      logger.error('Failed to get templates by type', { type, channel, error });
      return [];
    }
  }

  async renderTemplate(
    template: NotificationTemplate,
    data: Record<string, any>
  ): Promise<{
    subject?: string;
    body: string;
    htmlBody?: string;
  }> {
    try {
      // Validate required variables
      const missingVars = this.validateTemplateData(template, data);
      if (missingVars.length > 0) {
        throw new Error(`Missing template variables: ${missingVars.join(', ')}`);
      }

      // Add default data
      const enhancedData = {
        ...data,
        currentDate: new Date(),
        currentYear: new Date().getFullYear(),
        platformName: 'Serenity',
        supportEmail: 'support@serenity.com',
        supportPhone: '1-800-SERENITY'
      };

      // Render subject (if exists)
      let renderedSubject: string | undefined;
      if (template.subject) {
        const subjectTemplate = this.getCompiledTemplate(template.id + '_subject', template.subject);
        renderedSubject = subjectTemplate(enhancedData);
      }

      // Render body
      const bodyTemplate = this.getCompiledTemplate(template.id + '_body', template.body);
      const renderedBody = bodyTemplate(enhancedData);

      // Render HTML body (if exists)
      let renderedHtmlBody: string | undefined;
      if (template.htmlBody) {
        const htmlTemplate = this.getCompiledTemplate(template.id + '_html', template.htmlBody);
        renderedHtmlBody = htmlTemplate(enhancedData);
      }

      logger.debug('Template rendered successfully', {
        templateId: template.id,
        templateName: template.name,
        hasSubject: !!renderedSubject,
        hasHtml: !!renderedHtmlBody
      });

      return {
        subject: renderedSubject,
        body: renderedBody,
        htmlBody: renderedHtmlBody
      };

    } catch (error: any) {
      logger.error('Failed to render template', {
        templateId: template.id,
        templateName: template.name,
        error: error.message
      });
      throw error;
    }
  }

  async createTemplate(templateData: {
    name: string;
    type: NotificationType;
    channel: NotificationChannel;
    subject?: string;
    body: string;
    htmlBody?: string;
    variables?: string[];
    isHipaaCompliant?: boolean;
  }): Promise<NotificationTemplate | null> {
    try {
      const query = `
        INSERT INTO notification_templates (
          name, type, channel, subject, body, html_body, variables, 
          is_hipaa_compliant, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        templateData.name,
        templateData.type,
        templateData.channel,
        templateData.subject || null,
        templateData.body,
        templateData.htmlBody || null,
        JSON.stringify(templateData.variables || []),
        templateData.isHipaaCompliant || false
      ];

      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      logger.info('Template created successfully', {
        templateId: result.rows[0].id,
        name: templateData.name,
        type: templateData.type,
        channel: templateData.channel
      });

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        type: row.type as NotificationType,
        channel: row.channel as NotificationChannel,
        subject: row.subject,
        body: row.body,
        htmlBody: row.html_body,
        variables: JSON.parse(row.variables || '[]'),
        isActive: row.is_active,
        isHipaaCompliant: row.is_hipaa_compliant,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version
      };

    } catch (error) {
      logger.error('Failed to create template', { templateData, error });
      return null;
    }
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<{
      name: string;
      subject: string;
      body: string;
      htmlBody: string;
      variables: string[];
      isActive: boolean;
      isHipaaCompliant: boolean;
    }>
  ): Promise<boolean> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key === 'htmlBody' ? 'html_body' : 
                        key === 'isActive' ? 'is_active' :
                        key === 'isHipaaCompliant' ? 'is_hipaa_compliant' : key;
          
          setClauses.push(`${dbKey} = $${paramIndex}`);
          values.push(key === 'variables' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      });

      if (setClauses.length === 0) {
        logger.warn('No valid updates provided for template', { templateId });
        return false;
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(templateId);

      const query = `
        UPDATE notification_templates 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id
      `;

      const result = await database.query(query, values);
      
      if (result.rowCount === 0) {
        logger.warn('Template not found for update', { templateId });
        return false;
      }

      // Clear compiled template cache
      this.clearCompiledTemplate(templateId);

      logger.info('Template updated successfully', { templateId, updates });
      return true;

    } catch (error) {
      logger.error('Failed to update template', { templateId, updates, error });
      return false;
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const query = `
        UPDATE notification_templates 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `;

      const result = await database.query(query, [templateId]);
      
      if (result.rowCount === 0) {
        logger.warn('Template not found for deletion', { templateId });
        return false;
      }

      // Clear compiled template cache
      this.clearCompiledTemplate(templateId);

      logger.info('Template deleted (deactivated) successfully', { templateId });
      return true;

    } catch (error) {
      logger.error('Failed to delete template', { templateId, error });
      return false;
    }
  }

  private getCompiledTemplate(cacheKey: string, templateSource: string): HandlebarsTemplateDelegate {
    if (this.compiledTemplates.has(cacheKey)) {
      return this.compiledTemplates.get(cacheKey)!;
    }

    try {
      const compiledTemplate = Handlebars.compile(templateSource);
      this.compiledTemplates.set(cacheKey, compiledTemplate);
      return compiledTemplate;
    } catch (error) {
      logger.error('Failed to compile template', { cacheKey, error });
      throw new Error(`Template compilation failed: ${error}`);
    }
  }

  private clearCompiledTemplate(templateId: string): void {
    const keysToRemove = Array.from(this.compiledTemplates.keys())
      .filter(key => key.startsWith(templateId));
    
    keysToRemove.forEach(key => {
      this.compiledTemplates.delete(key);
    });
  }

  private validateTemplateData(
    template: NotificationTemplate,
    data: Record<string, any>
  ): string[] {
    const missingVars: string[] = [];
    
    for (const requiredVar of template.variables) {
      if (!(requiredVar in data) || data[requiredVar] === null || data[requiredVar] === undefined) {
        missingVars.push(requiredVar);
      }
    }

    return missingVars;
  }

  // Utility method to extract variables from template content
  extractVariables(templateContent: string): string[] {
    const variableRegex = /\{\{\s*([^}\s]+)\s*\}\}/g;
    const variables: Set<string> = new Set();
    let match;

    while ((match = variableRegex.exec(templateContent)) !== null) {
      // Extract the variable name (without helpers)
      const varName = match[1].split(' ')[0];
      if (varName && !varName.startsWith('#') && !varName.startsWith('/')) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  // Pre-populate common templates
  async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'Crisis Alert Email',
        type: NotificationType.CRISIS_ALERT,
        channel: NotificationChannel.EMAIL,
        subject: '🚨 CRISIS ALERT - {{userName}} needs immediate support',
        body: 'URGENT: {{userName}} has triggered a crisis alert.\n\nTime: {{formatTime alertTime}}\nLocation: {{location}}\nMessage: {{message}}\n\nPlease respond immediately or call emergency services if needed.\n\n- Serenity Crisis Team',
        variables: ['userName', 'alertTime', 'location', 'message'],
        isHipaaCompliant: true
      },
      {
        name: 'Daily Check-in Reminder',
        type: NotificationType.CHECKIN_REMINDER,
        channel: NotificationChannel.PUSH,
        subject: 'Daily Check-in Reminder',
        body: 'Hi {{firstName}}! 👋 Don\'t forget to complete your daily check-in. Your progress matters!',
        variables: ['firstName'],
        isHipaaCompliant: false
      },
      {
        name: 'Milestone Celebration',
        type: NotificationType.MILESTONE_CELEBRATION,
        channel: NotificationChannel.IN_APP,
        subject: 'Congratulations! 🎉',
        body: '{{celebratedays daysSober}} You\'re doing amazing, {{firstName}}! Keep up the incredible work.',
        variables: ['daysSober', 'firstName'],
        isHipaaCompliant: false
      }
    ];

    for (const template of defaultTemplates) {
      try {
        // Check if template already exists
        const existing = await this.getTemplatesByType(template.type, template.channel);
        if (existing.length === 0) {
          await this.createTemplate(template);
        }
      } catch (error) {
        logger.error('Failed to initialize default template', { template: template.name, error });
      }
    }

    logger.info('Default templates initialization completed');
  }
}

export const templateService = new TemplateService();
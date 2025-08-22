import { TemplateService } from '@/services/TemplateService';
import { database } from '@/models/database';
import { NotificationType, NotificationChannel } from '@/types';
import { createTestTemplate } from '../setup';

// Mock database
jest.mock('@/models/database');
const mockDatabase = database as jest.Mocked<typeof database>;

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
    jest.clearAllMocks();
  });

  describe('getTemplate', () => {
    it('should retrieve a template by ID', async () => {
      const templateId = 'test-template-123';
      const mockTemplate = {
        id: templateId,
        name: 'Test Template',
        type: 'system_notification',
        channel: 'email',
        subject: 'Test Subject',
        body: 'Test Body',
        html_body: '<p>Test Body</p>',
        variables: JSON.stringify(['firstName']),
        is_active: true,
        is_hipaa_compliant: false,
        created_at: new Date(),
        updated_at: new Date(),
        version: 1
      };

      mockDatabase.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await templateService.getTemplate(templateId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(templateId);
      expect(result?.name).toBe('Test Template');
      expect(result?.variables).toEqual(['firstName']);
    });

    it('should return null for non-existent template', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [] });

      const result = await templateService.getTemplate('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockDatabase.query.mockRejectedValue(new Error('Database error'));

      const result = await templateService.getTemplate('test-id');

      expect(result).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const templateData = createTestTemplate();
      const mockCreatedTemplate = {
        id: 'new-template-123',
        name: templateData.name,
        type: templateData.type,
        channel: templateData.channel,
        subject: templateData.subject,
        body: templateData.body,
        html_body: null,
        variables: JSON.stringify(templateData.variables),
        is_active: true,
        is_hipaa_compliant: templateData.isHipaaCompliant,
        created_at: new Date(),
        updated_at: new Date(),
        version: 1
      };

      mockDatabase.query.mockResolvedValue({ rows: [mockCreatedTemplate] });

      const result = await templateService.createTemplate(templateData);

      expect(result).toBeDefined();
      expect(result?.name).toBe(templateData.name);
      expect(result?.type).toBe(templateData.type);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_templates'),
        expect.arrayContaining([
          templateData.name,
          templateData.type,
          templateData.channel,
          templateData.subject,
          templateData.body
        ])
      );
    });

    it('should handle creation failure', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [] });

      const result = await templateService.createTemplate(createTestTemplate());

      expect(result).toBeNull();
    });
  });

  describe('renderTemplate', () => {
    it('should render template with provided data', async () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        type: NotificationType.SYSTEM_NOTIFICATION,
        channel: NotificationChannel.EMAIL,
        subject: 'Hello {{firstName}}',
        body: 'Welcome {{firstName}}, your message: {{message}}',
        htmlBody: '<p>Welcome {{firstName}}</p>',
        variables: ['firstName', 'message'],
        isActive: true,
        isHipaaCompliant: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const data = {
        firstName: 'John',
        message: 'Test message'
      };

      const result = await templateService.renderTemplate(template, data);

      expect(result.subject).toBe('Hello John');
      expect(result.body).toBe('Welcome John, your message: Test message');
      expect(result.htmlBody).toBe('<p>Welcome John</p>');
    });

    it('should fail when required variables are missing', async () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        type: NotificationType.SYSTEM_NOTIFICATION,
        channel: NotificationChannel.EMAIL,
        subject: 'Hello {{firstName}}',
        body: 'Welcome {{firstName}}',
        variables: ['firstName'],
        isActive: true,
        isHipaaCompliant: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const data = {}; // Missing firstName

      await expect(templateService.renderTemplate(template, data))
        .rejects.toThrow('Missing template variables: firstName');
    });

    it('should add default variables to rendering context', async () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        type: NotificationType.SYSTEM_NOTIFICATION,
        channel: NotificationChannel.EMAIL,
        subject: 'Current year: {{currentYear}}',
        body: 'Platform: {{platformName}}',
        variables: [],
        isActive: true,
        isHipaaCompliant: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const result = await templateService.renderTemplate(template, {});

      expect(result.subject).toContain(new Date().getFullYear().toString());
      expect(result.body).toBe('Platform: Serenity');
    });
  });

  describe('updateTemplate', () => {
    it('should update template fields', async () => {
      const templateId = 'test-template-123';
      const updates = {
        name: 'Updated Template Name',
        body: 'Updated body content'
      };

      mockDatabase.query.mockResolvedValue({ rowCount: 1 });

      const result = await templateService.updateTemplate(templateId, updates);

      expect(result).toBe(true);
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notification_templates'),
        expect.arrayContaining([updates.name, updates.body, templateId])
      );
    });

    it('should return false for non-existent template', async () => {
      mockDatabase.query.mockResolvedValue({ rowCount: 0 });

      const result = await templateService.updateTemplate('non-existent', { name: 'New Name' });

      expect(result).toBe(false);
    });

    it('should return false when no updates provided', async () => {
      const result = await templateService.updateTemplate('test-id', {});

      expect(result).toBe(false);
    });
  });

  describe('extractVariables', () => {
    it('should extract Handlebars variables from template content', () => {
      const content = 'Hello {{firstName}}, your {{itemType}} is {{status}}!';
      
      const variables = templateService.extractVariables(content);

      expect(variables).toEqual(['firstName', 'itemType', 'status']);
    });

    it('should handle templates with helpers', () => {
      const content = 'Today is {{formatDate currentDate}} and {{capitalize status}}';
      
      const variables = templateService.extractVariables(content);

      expect(variables).toEqual(['currentDate', 'status']);
    });

    it('should handle templates with no variables', () => {
      const content = 'This is a static template with no variables';
      
      const variables = templateService.extractVariables(content);

      expect(variables).toEqual([]);
    });

    it('should handle duplicate variables', () => {
      const content = 'Hello {{firstName}}, {{firstName}} is your name';
      
      const variables = templateService.extractVariables(content);

      expect(variables).toEqual(['firstName']);
    });
  });

  describe('getTemplatesByType', () => {
    it('should retrieve templates by type', async () => {
      const templates = [
        {
          id: 'template-1',
          name: 'Template 1',
          type: 'system_notification',
          channel: 'email',
          subject: 'Subject 1',
          body: 'Body 1',
          variables: '[]',
          is_active: true,
          is_hipaa_compliant: false,
          created_at: new Date(),
          updated_at: new Date(),
          version: 1
        }
      ];

      mockDatabase.query.mockResolvedValue({ rows: templates });

      const result = await templateService.getTemplatesByType(NotificationType.SYSTEM_NOTIFICATION);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(NotificationType.SYSTEM_NOTIFICATION);
    });

    it('should filter by channel when provided', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [] });

      await templateService.getTemplatesByType(
        NotificationType.SYSTEM_NOTIFICATION,
        NotificationChannel.EMAIL
      );

      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('AND channel = $2'),
        [NotificationType.SYSTEM_NOTIFICATION, NotificationChannel.EMAIL]
      );
    });
  });

  describe('Handlebars helpers', () => {
    it('should register and use custom helpers', async () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        type: NotificationType.MILESTONE_CELEBRATION,
        channel: NotificationChannel.SMS,
        body: '{{celebratedays daysSober}} Keep it up!',
        variables: ['daysSober'],
        isActive: true,
        isHipaaCompliant: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const data = { daysSober: 30 };

      const result = await templateService.renderTemplate(template, data);

      expect(result.body).toBe('🏆 One Month Sober! Keep it up!');
    });

    it('should handle date formatting helper', async () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        type: NotificationType.APPOINTMENT_REMINDER,
        channel: NotificationChannel.EMAIL,
        body: 'Your appointment is on {{formatDate appointmentDate}}',
        variables: ['appointmentDate'],
        isActive: true,
        isHipaaCompliant: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const data = { appointmentDate: new Date('2024-03-15') };

      const result = await templateService.renderTemplate(template, data);

      expect(result.body).toContain('Mar 15, 2024');
    });
  });
});
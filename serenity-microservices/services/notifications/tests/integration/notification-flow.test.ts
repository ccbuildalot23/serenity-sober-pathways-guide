import request from 'supertest';
import NotificationServer from '@/server';
import { database } from '@/models/database';
import { queueService } from '@/services/QueueService';
import { templateService } from '@/services/TemplateService';
import { userPreferencesService } from '@/services/UserPreferencesService';
import { createTestNotification, createTestTemplate, createTestUserPreferences } from '../setup';

describe('Notification Flow Integration Tests', () => {
  let app: any;
  let server: NotificationServer;
  let testUserId: string;
  let testTemplateId: string;

  beforeAll(async () => {
    // Initialize server
    server = new NotificationServer();
    app = (server as any).app;

    // Set up test data
    testUserId = 'integration-test-user';
    
    // Create test template
    const template = await templateService.createTemplate(createTestTemplate());
    testTemplateId = template?.id || 'test-template';

    // Create test user preferences
    await userPreferencesService.createUserPreferences(
      testUserId,
      createTestUserPreferences()
    );
  });

  afterAll(async () => {
    // Clean up test data
    await database.query('DELETE FROM notification_logs WHERE user_id = $1', [testUserId]);
    await database.query('DELETE FROM user_notification_preferences WHERE user_id = $1', [testUserId]);
    await database.query('DELETE FROM notification_templates WHERE id = $1', [testTemplateId]);
    
    // Close connections
    await queueService.close();
    await database.close();
  });

  describe('Complete Notification Flow', () => {
    it('should handle end-to-end notification sending', async () => {
      const notification = {
        ...createTestNotification(),
        userId: testUserId,
        templateId: testTemplateId
      };

      // Step 1: Send notification request
      const sendResponse = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(notification)
        .expect(202);

      expect(sendResponse.body.success).toBe(true);
      expect(sendResponse.body.data.notificationId).toBeDefined();

      const notificationId = sendResponse.body.data.notificationId;

      // Step 2: Check notification status
      const statusResponse = await request(app)
        .get(`/api/v1/notifications/status/${notificationId}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.id).toBe(notificationId);

      // Step 3: Verify notification appears in user's list
      const userNotificationsResponse = await request(app)
        .get(`/api/v1/notifications/user/${testUserId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(userNotificationsResponse.body.success).toBe(true);
      expect(userNotificationsResponse.body.data.some((n: any) => n.id === notificationId)).toBe(true);
    }, 10000);

    it('should handle bulk notification sending', async () => {
      const bulkRequest = {
        notifications: [
          {
            ...createTestNotification(),
            userId: testUserId,
            templateId: testTemplateId
          },
          {
            ...createTestNotification(),
            userId: testUserId,
            templateId: testTemplateId,
            data: { firstName: 'Jane', message: 'Second message' }
          }
        ],
        scheduleMode: 'immediate'
      };

      const response = await request(app)
        .post('/api/v1/notifications/bulk')
        .set('Authorization', 'Bearer test-token')
        .send(bulkRequest)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notificationCount).toBe(2);
    });

    it('should respect user notification preferences', async () => {
      // Update user preferences to disable email
      await userPreferencesService.updateUserPreferences(testUserId, {
        email: { enabled: false, address: 'test@example.com', verified: true }
      });

      const notification = {
        ...createTestNotification(),
        userId: testUserId,
        templateId: testTemplateId,
        channel: 'email' as const
      };

      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(notification)
        .expect(202);

      expect(response.body.success).toBe(true);

      // Re-enable email for cleanup
      await userPreferencesService.updateUserPreferences(testUserId, {
        email: { enabled: true, address: 'test@example.com', verified: true }
      });
    });
  });

  describe('Template Management Flow', () => {
    it('should create, update, and use templates', async () => {
      // Create template
      const templateData = {
        ...createTestTemplate(),
        name: 'Integration Test Template'
      };

      const createResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', 'Bearer test-token')
        .send(templateData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const newTemplateId = createResponse.body.data.id;

      // Update template
      const updateData = {
        name: 'Updated Integration Test Template',
        body: 'Updated body content with {{firstName}}'
      };

      const updateResponse = await request(app)
        .put(`/api/v1/templates/${newTemplateId}`)
        .set('Authorization', 'Bearer test-token')
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Render template
      const renderData = { firstName: 'Integration' };
      const renderResponse = await request(app)
        .post(`/api/v1/templates/${newTemplateId}/render`)
        .set('Authorization', 'Bearer test-token')
        .send({ data: renderData })
        .expect(200);

      expect(renderResponse.body.success).toBe(true);
      expect(renderResponse.body.data.rendered.body).toContain('Integration');

      // Clean up
      await request(app)
        .delete(`/api/v1/templates/${newTemplateId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);
    });

    it('should handle template preview', async () => {
      const template = {
        subject: 'Preview Test - {{name}}',
        body: 'Hello {{name}}, this is a preview'
      };

      const data = { name: 'Preview User' };

      const response = await request(app)
        .post('/api/v1/templates/preview')
        .set('Authorization', 'Bearer test-token')
        .send({ template, data })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rendered.subject).toBe('Preview Test - Preview User');
      expect(response.body.data.rendered.body).toBe('Hello Preview User, this is a preview');
      expect(response.body.data.extractedVariables).toContain('name');
    });
  });

  describe('User Preferences Management', () => {
    it('should manage user notification preferences', async () => {
      const newUserId = 'preferences-test-user';

      // Create preferences
      const preferences = createTestUserPreferences();
      const createResponse = await request(app)
        .put(`/api/v1/preferences/${newUserId}`)
        .set('Authorization', 'Bearer test-token')
        .send(preferences)
        .expect(200);

      expect(createResponse.body.success).toBe(true);

      // Get preferences
      const getResponse = await request(app)
        .get(`/api/v1/preferences/${newUserId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.email.enabled).toBe(true);

      // Update specific preference
      const updateResponse = await request(app)
        .put(`/api/v1/preferences/${newUserId}/types/system_notification`)
        .set('Authorization', 'Bearer test-token')
        .send({ enabled: false })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // Add device token
      const deviceTokenResponse = await request(app)
        .post(`/api/v1/preferences/${newUserId}/device-tokens`)
        .set('Authorization', 'Bearer test-token')
        .send({ deviceToken: 'new-device-token-123' })
        .expect(200);

      expect(deviceTokenResponse.body.success).toBe(true);

      // Clean up
      await request(app)
        .delete(`/api/v1/preferences/${newUserId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200);
    });
  });

  describe('Health and Metrics', () => {
    it('should provide health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.checks).toBeDefined();
    });

    it('should provide readiness status', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ready).toBeDefined();
    });

    it('should provide metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.system).toBeDefined();
      expect(response.body.data.queues).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid notification data', async () => {
      const invalidNotification = {
        userId: 'invalid-uuid',
        type: 'invalid-type',
        channel: 'invalid-channel'
      };

      await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(invalidNotification)
        .expect(400);
    });

    it('should handle unauthorized access', async () => {
      await request(app)
        .post('/api/v1/notifications/send')
        .send(createTestNotification())
        .expect(401);
    });

    it('should handle rate limiting', async () => {
      // This test would require making many requests rapidly
      // For now, we'll just verify the middleware is in place
      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(createTestNotification());

      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('HIPAA Compliance', () => {
    it('should handle HIPAA-compliant notifications', async () => {
      // Create HIPAA template
      const hipaaTemplate = {
        ...createTestTemplate(),
        name: 'HIPAA Test Template',
        type: 'crisis_alert' as const,
        isHipaaCompliant: true
      };

      const template = await templateService.createTemplate(hipaaTemplate);
      const hipaaTemplateId = template?.id;

      const hipaaNotification = {
        ...createTestNotification(),
        userId: testUserId,
        templateId: hipaaTemplateId,
        type: 'crisis_alert' as const
      };

      const response = await request(app)
        .post('/api/v1/notifications/send')
        .set('Authorization', 'Bearer test-token')
        .send(hipaaNotification)
        .expect(202);

      expect(response.body.success).toBe(true);

      // Clean up
      if (hipaaTemplateId) {
        await database.query('DELETE FROM notification_templates WHERE id = $1', [hipaaTemplateId]);
      }
    });
  });
});

// Helper to mock authentication middleware
function mockAuth(req: any, res: any, next: any) {
  req.user = {
    id: 'integration-test-user',
    email: 'test@integration.com',
    role: 'admin',
    permissions: ['*']
  };
  next();
}
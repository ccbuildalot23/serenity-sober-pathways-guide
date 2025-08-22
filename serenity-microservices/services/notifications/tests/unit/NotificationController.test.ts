import request from 'supertest';
import express from 'express';
import { notificationController } from '@/controllers/NotificationController';
import { queueService } from '@/services/QueueService';
import { notificationModel } from '@/models/NotificationModel';
import { createTestNotification } from '../setup';
import { NotificationStatus } from '@/types';

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req: any, res, next) => {
  req.user = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'patient',
    permissions: ['notifications:send']
  };
  next();
});

// Set up routes
app.post('/notifications/send', notificationController.sendNotification.bind(notificationController));
app.get('/notifications/status/:id', notificationController.getNotificationStatus.bind(notificationController));
app.get('/notifications/user/:userId', notificationController.getUserNotifications.bind(notificationController));
app.put('/notifications/:id/read', notificationController.markNotificationAsRead.bind(notificationController));

// Mock services
jest.mock('@/services/QueueService');
jest.mock('@/models/NotificationModel');

const mockQueueService = queueService as jest.Mocked<typeof queueService>;
const mockNotificationModel = notificationModel as jest.Mocked<typeof notificationModel>;

describe('NotificationController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /notifications/send', () => {
    it('should queue a notification successfully', async () => {
      const testNotification = createTestNotification();
      mockQueueService.queueNotification.mockResolvedValue(true);

      const response = await request(app)
        .post('/notifications/send')
        .send(testNotification)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Notification queued successfully');
      expect(mockQueueService.queueNotification).toHaveBeenCalledWith(
        expect.objectContaining(testNotification)
      );
    });

    it('should return 503 when queue is unavailable', async () => {
      const testNotification = createTestNotification();
      mockQueueService.queueNotification.mockResolvedValue(false);

      const response = await request(app)
        .post('/notifications/send')
        .send(testNotification)
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUEUE_UNAVAILABLE');
    });

    it('should handle validation errors', async () => {
      const invalidNotification = {
        userId: 'invalid-uuid',
        type: 'invalid-type'
      };

      const response = await request(app)
        .post('/notifications/send')
        .send(invalidNotification)
        .expect(500); // Will be caught by error handler

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /notifications/status/:id', () => {
    it('should return notification status', async () => {
      const notificationId = 'test-notification-123';
      const mockNotification = {
        id: notificationId,
        status: NotificationStatus.SENT,
        type: 'system_notification',
        channel: 'email',
        priority: 'normal',
        createdAt: new Date(),
        sentAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        isHipaaCompliant: false
      };

      mockNotificationModel.findById.mockResolvedValue(mockNotification as any);

      const response = await request(app)
        .get(`/notifications/status/${notificationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(notificationId);
      expect(response.body.data.status).toBe(NotificationStatus.SENT);
    });

    it('should return 404 for non-existent notification', async () => {
      const notificationId = 'non-existent';
      mockNotificationModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/notifications/status/${notificationId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });
  });

  describe('GET /notifications/user/:userId', () => {
    it('should return user notifications', async () => {
      const userId = 'test-user-123';
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'notification-1',
            type: 'system_notification',
            status: NotificationStatus.SENT
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };

      mockNotificationModel.findByUserId.mockResolvedValue(mockResponse as any);

      const response = await request(app)
        .get(`/notifications/user/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should handle pagination parameters', async () => {
      const userId = 'test-user-123';
      mockNotificationModel.findByUserId.mockResolvedValue({
        success: true,
        data: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: true
        }
      } as any);

      await request(app)
        .get(`/notifications/user/${userId}`)
        .query({ page: '2', limit: '10' })
        .expect(200);

      expect(mockNotificationModel.findByUserId).toHaveBeenCalledWith(
        userId,
        2,
        10,
        expect.any(Object)
      );
    });
  });

  describe('PUT /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'test-notification-123';
      mockNotificationModel.markAsRead.mockResolvedValue(true);

      const response = await request(app)
        .put(`/notifications/${notificationId}/read`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Notification marked as read');
      expect(mockNotificationModel.markAsRead).toHaveBeenCalledWith(
        notificationId,
        'test-user-123'
      );
    });

    it('should return 404 for non-existent notification', async () => {
      const notificationId = 'non-existent';
      mockNotificationModel.markAsRead.mockResolvedValue(false);

      const response = await request(app)
        .put(`/notifications/${notificationId}/read`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });
  });
});

describe('Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    mockQueueService.queueNotification.mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .post('/notifications/send')
      .send(createTestNotification())
      .expect(500);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOTIFICATION_SEND_ERROR');
  });

  it('should handle queue service errors', async () => {
    mockQueueService.queueNotification.mockRejectedValue(new Error('Queue connection failed'));

    const response = await request(app)
      .post('/notifications/send')
      .send(createTestNotification())
      .expect(500);

    expect(response.body.success).toBe(false);
  });
});
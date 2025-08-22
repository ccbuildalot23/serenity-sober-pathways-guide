import { config } from '@/config';
import { database } from '@/models/database';
import { logger } from '@/utils/logger';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test setup
beforeAll(async () => {
  // Set up test database connection
  try {
    await database.healthCheck();
    logger.info('Test database connection established');
  } catch (error) {
    logger.error('Failed to connect to test database', { error });
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    await database.close();
    logger.info('Test database connection closed');
  } catch (error) {
    logger.error('Failed to close test database connection', { error });
  }
});

// Helper function to create test data
export const createTestNotification = () => ({
  userId: 'test-user-123',
  type: 'system_notification' as const,
  channel: 'email' as const,
  templateId: 'test-template-123',
  data: {
    firstName: 'Test',
    message: 'Test message'
  },
  priority: 'normal' as const
});

export const createTestTemplate = () => ({
  name: 'Test Template',
  type: 'system_notification' as const,
  channel: 'email' as const,
  subject: 'Test Subject - {{firstName}}',
  body: 'Hello {{firstName}}, this is a test message: {{message}}',
  variables: ['firstName', 'message'],
  isHipaaCompliant: false
});

export const createTestUserPreferences = () => ({
  email: {
    enabled: true,
    address: 'test@example.com',
    verified: true
  },
  sms: {
    enabled: true,
    phoneNumber: '+1234567890',
    verified: true
  },
  push: {
    enabled: true,
    deviceTokens: ['test-device-token']
  },
  inApp: {
    enabled: true
  },
  emergencyOverride: true
});

// Mock external services for testing
jest.mock('@/services/channels/EmailService', () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'test-email-123' }),
    verifyConnection: jest.fn().mockResolvedValue(true),
    sendBulkEmails: jest.fn().mockResolvedValue({ 
      success: true, 
      results: [], 
      totalSent: 0, 
      totalFailed: 0 
    })
  }
}));

jest.mock('@/services/channels/SMSService', () => ({
  smsService: {
    sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: 'test-sms-123' }),
    verifyConnection: jest.fn().mockResolvedValue(true),
    sendBulkSMS: jest.fn().mockResolvedValue({ 
      success: true, 
      results: [], 
      totalSent: 0, 
      totalFailed: 0 
    })
  }
}));

jest.mock('@/services/channels/PushService', () => ({
  pushService: {
    sendPushNotification: jest.fn().mockResolvedValue({ 
      success: true, 
      successCount: 1, 
      failureCount: 0 
    }),
    verifyConnection: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('@/services/channels/InAppService', () => ({
  inAppService: {
    sendInAppNotification: jest.fn().mockResolvedValue({ 
      success: true, 
      delivered: true 
    }),
    verifyConnection: jest.fn().mockResolvedValue(true)
  }
}));

// Mock queue service
jest.mock('@/services/QueueService', () => ({
  queueService: {
    queueNotification: jest.fn().mockResolvedValue(true),
    queueBulkNotifications: jest.fn().mockResolvedValue(true),
    isHealthy: jest.fn().mockResolvedValue(true),
    getQueueStats: jest.fn().mockResolvedValue({
      'notifications.process': { messageCount: 0, consumerCount: 1 }
    })
  }
}));

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
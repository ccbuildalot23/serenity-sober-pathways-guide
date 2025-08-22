import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { redisManager } from '../src/utils/redis';
import { serviceDiscovery } from '../src/services/serviceDiscovery';
import { circuitBreakerManager } from '../src/services/circuitBreaker';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.REDIS_HOST = process.env.REDIS_TEST_HOST || 'localhost';
  process.env.REDIS_PORT = process.env.REDIS_TEST_PORT || '6379';
  process.env.REDIS_DB = '15'; // Use separate DB for tests
  
  // Initialize Redis connection
  try {
    await redisManager.connect();
  } catch (error) {
    console.warn('Redis connection failed in tests, some tests may be skipped');
  }
});

// Global test teardown
afterAll(async () => {
  // Cleanup Redis
  try {
    await redisManager.disconnect();
  } catch (error) {
    console.warn('Redis disconnect failed during cleanup');
  }

  // Shutdown services
  try {
    await serviceDiscovery.stop();
    circuitBreakerManager.shutdown();
  } catch (error) {
    console.warn('Service cleanup failed');
  }
});

// Clean up before each test
beforeEach(async () => {
  // Clear Redis test data
  try {
    const client = redisManager.getClient();
    await client.flushdb();
  } catch (error) {
    // Redis may not be available in all test environments
  }
});

// Mock console methods to reduce test noise
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Global test utilities
export const createMockRequest = (overrides: any = {}): any => {
  return {
    method: 'GET',
    path: '/test',
    headers: {},
    query: {},
    body: {},
    params: {},
    request_id: 'test-request-id',
    start_time: Date.now(),
    user: null,
    api_key: null,
    ip: '127.0.0.1',
    ...overrides
  };
};

export const createMockResponse = (): any => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    statusCode: 200,
    headersSent: false
  };
  return res;
};

export const createMockNext = (): jest.Mock => {
  return jest.fn();
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
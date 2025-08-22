import { config } from '@/config/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_security_db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-32-chars';
process.env.API_KEY_SECRET = 'test-api-key-secret-for-testing-purposes-32-chars';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during testing

// Mock console methods to reduce noise during testing
const originalConsole = { ...console };

beforeAll(() => {
  // Mock console methods
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockConnect = jest.fn();
  const mockEnd = jest.fn();
  const mockRelease = jest.fn();

  return {
    Pool: jest.fn(() => ({
      query: mockQuery,
      connect: jest.fn(() => Promise.resolve({
        query: mockQuery,
        release: mockRelease,
        processID: 12345,
      })),
      end: mockEnd,
      on: jest.fn(),
    })),
  };
});

// Export test utilities
export const createMockRequest = (overrides: any = {}) => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  user: null,
  apiKey: null,
  requestId: 'test-request-id',
  get: jest.fn((header: string) => {
    const headers: Record<string, string> = {
      'user-agent': 'test-agent',
      'x-request-id': 'test-request-id',
      ...overrides.headers,
    };
    return headers[header.toLowerCase()];
  }),
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    send: jest.fn(() => res),
    end: jest.fn(() => res),
    on: jest.fn(),
    headersSent: false,
  };
  return res;
};

export const createMockNext = () => jest.fn();

export const createTestAuditLog = (overrides: any = {}) => ({
  event_type: 'LOGIN',
  event_name: 'User Login',
  event_description: 'User successfully logged in',
  user_id: 'test-user-id',
  username: 'test-user',
  user_role: 'patient',
  source_ip: '127.0.0.1',
  user_agent: 'test-agent',
  risk_level: 'LOW',
  ...overrides,
});

export const createTestUser = (overrides: any = {}) => ({
  id: 'test-user-id',
  username: 'test-user',
  role: 'patient',
  permissions: ['audit:read'],
  ...overrides,
});

export const createTestApiKey = (overrides: any = {}) => ({
  id: 'test-api-key-id',
  hash: 'test-api-key-hash',
  name: 'test-api-key',
  permissions: ['audit:write'],
  ...overrides,
});

// Database mocking utilities
export const mockDatabaseQuery = (mockImplementation?: jest.Mock) => {
  const pg = require('pg');
  const poolInstance = new pg.Pool();
  
  if (mockImplementation) {
    poolInstance.query.mockImplementation(mockImplementation);
  }
  
  return poolInstance.query;
};

export const mockDatabaseTransaction = (mockImplementation?: jest.Mock) => {
  const pg = require('pg');
  const poolInstance = new pg.Pool();
  
  const mockClient = {
    query: mockImplementation || jest.fn(),
    release: jest.fn(),
  };
  
  poolInstance.connect.mockResolvedValue(mockClient);
  
  return { poolInstance, mockClient };
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
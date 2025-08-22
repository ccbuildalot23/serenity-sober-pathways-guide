import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { jwtAuth, apiKeyAuth, requireRole, generateToken } from '../../../src/middleware/auth';
import { redisManager } from '../../../src/utils/redis';
import { createMockRequest, createMockResponse, createMockNext } from '../../setup';

// Mock dependencies
jest.mock('../../../src/utils/redis');
jest.mock('jsonwebtoken');

const mockRedisManager = redisManager as jest.Mocked<typeof redisManager>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Authentication Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('JWT Authentication', () => {
    it('should authenticate valid JWT token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
        permissions: ['read:profile'],
        is_active: true,
        created_at: new Date(),
        last_login_at: new Date()
      };

      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
        permissions: ['read:profile'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'serenity-api-gateway',
        aud: 'serenity-services'
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue(mockPayload);
      mockRedisManager.exists.mockResolvedValue(false); // Not blacklisted
      mockRedisManager.getJSON.mockResolvedValue(mockUser);
      mockRedisManager.expire.mockResolvedValue(true);

      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(mockRedisManager.getJSON).toHaveBeenCalledWith('session:user-123');
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject blacklisted token', async () => {
      mockReq.headers.authorization = 'Bearer blacklisted-token';
      mockRedisManager.exists.mockResolvedValue(true); // Blacklisted

      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Token has been revoked',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired session', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
        permissions: ['read:profile'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'serenity-api-gateway',
        aud: 'serenity-services'
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue(mockPayload);
      mockRedisManager.exists.mockResolvedValue(false);
      mockRedisManager.getJSON.mockResolvedValue(null); // No session

      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired, please login again',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject inactive user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
        permissions: ['read:profile'],
        is_active: false, // Inactive user
        created_at: new Date(),
        last_login_at: new Date()
      };

      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
        permissions: ['read:profile'],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'serenity-api-gateway',
        aud: 'serenity-services'
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      mockJwt.verify.mockReturnValue(mockPayload);
      mockRedisManager.exists.mockResolvedValue(false);
      mockRedisManager.getJSON.mockResolvedValue(mockUser);

      await jwtAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate valid API key', async () => {
      const mockApiKey = {
        id: 'api-key-123',
        key: 'sk_test_123',
        name: 'Test API Key',
        permissions: ['read:users'],
        is_active: true,
        created_at: new Date(),
        usage_count: 10,
        last_used_at: new Date()
      };

      mockReq.headers['x-api-key'] = 'sk_test_123';
      mockRedisManager.getJSON.mockResolvedValue(mockApiKey);
      mockRedisManager.setJSON.mockResolvedValue(true);

      await apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockRedisManager.getJSON).toHaveBeenCalledWith('api_key:sk_test_123');
      expect(mockReq.api_key).toEqual(expect.objectContaining({
        ...mockApiKey,
        usage_count: 11,
        last_used_at: expect.any(Date)
      }));
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without API key', async () => {
      await apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid API key', async () => {
      mockReq.headers['x-api-key'] = 'invalid-key';
      mockRedisManager.getJSON.mockResolvedValue(null);

      await apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject inactive API key', async () => {
      const mockApiKey = {
        id: 'api-key-123',
        key: 'sk_test_123',
        name: 'Test API Key',
        permissions: ['read:users'],
        is_active: false, // Inactive
        created_at: new Date(),
        usage_count: 10
      };

      mockReq.headers['x-api-key'] = 'sk_test_123';
      mockRedisManager.getJSON.mockResolvedValue(mockApiKey);

      await apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'API_KEY_INACTIVE',
          message: 'API key is inactive',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired API key', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const mockApiKey = {
        id: 'api-key-123',
        key: 'sk_test_123',
        name: 'Test API Key',
        permissions: ['read:users'],
        is_active: true,
        created_at: new Date(),
        expires_at: expiredDate,
        usage_count: 10
      };

      mockReq.headers['x-api-key'] = 'sk_test_123';
      mockRedisManager.getJSON.mockResolvedValue(mockApiKey);

      await apiKeyAuth(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'API_KEY_EXPIRED',
          message: 'API key has expired',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Role-based Authorization', () => {
    const roleMiddleware = requireRole(['admin', 'provider']);

    it('should allow access for authorized role', () => {
      mockReq.user = {
        id: 'user-123',
        role: 'admin',
        permissions: []
      };

      roleMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      mockReq.user = {
        id: 'user-123',
        role: 'patient',
        permissions: []
      };

      roleMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Access denied. Required roles: admin, provider',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require authentication', () => {
      roleMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: expect.any(String),
          request_id: mockReq.request_id
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token Generation', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'patient' as const,
        permissions: ['read:profile']
      };

      mockJwt.sign.mockReturnValue('mocked-token');

      const token = generateToken(payload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          ...payload,
          iss: 'serenity-api-gateway',
          aud: 'serenity-services'
        },
        expect.any(String),
        { expiresIn: '1h' }
      );
      expect(token).toBe('mocked-token');
    });
  });
});
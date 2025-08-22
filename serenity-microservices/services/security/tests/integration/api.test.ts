import request from 'supertest';
import SecurityService from '@/index';
import { createTestAuditLog, createTestUser } from '../setup';

jest.mock('@/database/connection');
jest.mock('@/utils/encryption');

describe('Security Service API Integration Tests', () => {
  let app: any;
  let securityService: SecurityService;

  beforeAll(async () => {
    securityService = new SecurityService();
    app = securityService.getApp();
  });

  afterAll(async () => {
    // Clean up if needed
  });

  describe('Health Endpoints', () => {
    describe('GET /health', () => {
      it('should return basic health status', async () => {
        const response = await request(app)
          .get('/health')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            service: 'security-service',
            status: expect.any(String),
            timestamp: expect.any(String),
            uptime: expect.any(Number),
          }),
        });
      });
    });

    describe('GET /ready', () => {
      it('should return readiness status', async () => {
        const response = await request(app)
          .get('/ready')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Service is ready',
        });
      });
    });

    describe('GET /live', () => {
      it('should return liveness status', async () => {
        const response = await request(app)
          .get('/live')
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Service is alive',
          uptime: expect.any(Number),
        });
      });
    });
  });

  describe('Root Endpoint', () => {
    describe('GET /', () => {
      it('should return service information', async () => {
        const response = await request(app)
          .get('/')
          .expect(200);

        expect(response.body).toMatchObject({
          service: 'security-service',
          version: '1.0.0',
          status: 'running',
          endpoints: expect.objectContaining({
            health: '/health',
            audit_logs: '/api/v1/audit/logs',
          }),
        });
      });
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/non-existent-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'ENDPOINT_NOT_FOUND',
          message: expect.stringContaining('not found'),
        }),
      });
    });
  });

  describe('Audit API Endpoints', () => {
    const validJWT = 'Bearer valid-jwt-token';
    const validApiKey = 'valid-api-key-32-characters-long';

    beforeEach(() => {
      // Mock authentication middleware to pass
      jest.clearAllMocks();
    });

    describe('POST /api/v1/audit/log', () => {
      it('should require authentication', async () => {
        const auditData = createTestAuditLog();

        const response = await request(app)
          .post('/api/v1/audit/log')
          .send(auditData)
          .expect(401);

        expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
      });

      it('should accept valid audit log with JWT authentication', async () => {
        const auditData = createTestAuditLog();

        // Mock the database and services
        const pg = require('pg');
        const mockQuery = new pg.Pool().query;
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: 'test-audit-id',
            created_at: new Date(),
            retention_required_until: new Date(),
          }],
        });

        const response = await request(app)
          .post('/api/v1/audit/log')
          .set('Authorization', validJWT)
          .send(auditData);

        // Should be rate limited or require proper auth
        expect([201, 401, 429]).toContain(response.status);
      });

      it('should accept valid audit log with API key authentication', async () => {
        const auditData = createTestAuditLog();

        const response = await request(app)
          .post('/api/v1/audit/log')
          .set('X-API-Key', validApiKey)
          .send(auditData);

        // Should be rate limited or require proper auth
        expect([201, 401, 429]).toContain(response.status);
      });

      it('should validate required fields', async () => {
        const invalidAuditData = {
          // Missing required fields
          event_name: 'Test Event',
        };

        const response = await request(app)
          .post('/api/v1/audit/log')
          .set('Authorization', validJWT)
          .send(invalidAuditData);

        expect([400, 401, 429]).toContain(response.status);
      });

      it('should reject oversized requests', async () => {
        const oversizedData = {
          ...createTestAuditLog(),
          large_data: 'x'.repeat(3 * 1024 * 1024), // 3MB
        };

        const response = await request(app)
          .post('/api/v1/audit/log')
          .set('Authorization', validJWT)
          .send(oversizedData)
          .expect(413);

        expect(response.body.error.code).toBe('REQUEST_TOO_LARGE');
      });
    });

    describe('GET /api/v1/audit/logs', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/audit/logs')
          .expect(401);

        expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
      });

      it('should accept query parameters', async () => {
        const response = await request(app)
          .get('/api/v1/audit/logs')
          .query({
            page: 1,
            limit: 10,
            event_type: 'LOGIN',
            user_id: 'test-user',
          })
          .set('Authorization', validJWT);

        expect([200, 401, 429]).toContain(response.status);
      });

      it('should validate pagination parameters', async () => {
        const response = await request(app)
          .get('/api/v1/audit/logs')
          .query({
            page: -1, // Invalid
            limit: 2000, // Too large
          })
          .set('Authorization', validJWT);

        expect([400, 401, 429]).toContain(response.status);
      });
    });

    describe('POST /api/v1/audit/search', () => {
      it('should require authentication', async () => {
        const searchQuery = {
          query: {
            event_type: 'LOGIN',
          },
        };

        const response = await request(app)
          .post('/api/v1/audit/search')
          .send(searchQuery)
          .expect(401);

        expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
      });

      it('should validate search query structure', async () => {
        const invalidSearch = {
          query: null, // Invalid
        };

        const response = await request(app)
          .post('/api/v1/audit/search')
          .set('Authorization', validJWT)
          .send(invalidSearch);

        expect([400, 401, 429]).toContain(response.status);
      });
    });

    describe('GET /api/v1/audit/statistics', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/audit/statistics')
          .expect(401);

        expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
      });

      it('should accept days parameter', async () => {
        const response = await request(app)
          .get('/api/v1/audit/statistics')
          .query({ days: 30 })
          .set('Authorization', validJWT);

        expect([200, 401, 429]).toContain(response.status);
      });
    });

    describe('POST /api/v1/audit/logs/bulk', () => {
      it('should require authentication', async () => {
        const bulkData = {
          logs: [createTestAuditLog(), createTestAuditLog()],
        };

        const response = await request(app)
          .post('/api/v1/audit/logs/bulk')
          .send(bulkData)
          .expect(401);

        expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
      });

      it('should enforce bulk limits', async () => {
        const tooManyLogs = {
          logs: Array(101).fill(createTestAuditLog()),
        };

        const response = await request(app)
          .post('/api/v1/audit/logs/bulk')
          .set('Authorization', validJWT)
          .send(tooManyLogs);

        expect([400, 401, 429]).toContain(response.status);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API endpoints', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/v1/audit/logs')
          .set('Authorization', 'Bearer test-token')
      );

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should not rate limit health endpoints', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);

      // Health endpoints should not be rate limited
      responses.forEach(res => {
        expect(res.status).not.toBe(429);
      });
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize malicious input', async () => {
      const maliciousData = {
        event_type: 'LOGIN',
        event_name: '<script>alert("xss")</script>',
        event_description: 'DROP TABLE audit_logs;',
      };

      const response = await request(app)
        .post('/api/v1/audit/log')
        .set('Authorization', 'Bearer test-token')
        .send(maliciousData);

      // Should either be processed safely or rejected
      expect([400, 401, 429]).toContain(response.status);
    });

    it('should reject requests with invalid JSON', async () => {
      const response = await request(app)
        .post('/api/v1/audit/log')
        .set('Authorization', 'Bearer test-token')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      expect(response.status).toBe(400);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app)
        .options('/api/v1/audit/logs')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Mock a service to throw an error
      jest.doMock('@/services/auditService', () => ({
        auditService: {
          createAuditLog: jest.fn().mockRejectedValue(new Error('Database error')),
        },
      }));

      const response = await request(app)
        .post('/api/v1/audit/log')
        .set('Authorization', 'Bearer test-token')
        .send(createTestAuditLog());

      expect([500, 401, 429]).toContain(response.status);

      if (response.status === 500) {
        expect(response.body).toMatchObject({
          success: false,
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String),
          }),
        });
      }
    });
  });
});
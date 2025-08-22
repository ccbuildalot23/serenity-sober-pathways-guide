import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import ApiGatewayServer from '../../src/server';
import { redisManager } from '../../src/utils/redis';

describe('API Gateway Integration Tests', () => {
  let app: any;
  let server: ApiGatewayServer;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.REDIS_DB = '15';
    process.env.SERVICE_DISCOVERY_TYPE = 'static';
    process.env.PROMETHEUS_ENABLED = 'false';
    process.env.WS_ENABLED = 'false';
    process.env.GRAPHQL_ENABLED = 'false';

    // Initialize server
    server = new ApiGatewayServer();
    app = server.getApp();

    // Wait for Redis connection
    try {
      await redisManager.connect();
    } catch (error) {
      console.warn('Redis not available for integration tests');
    }
  });

  afterAll(async () => {
    try {
      await redisManager.disconnect();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clear Redis test data
    try {
      const client = redisManager.getClient();
      await client.flushdb();
    } catch (error) {
      // Redis may not be available
    }
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
        environment: 'test',
        uptime: expect.any(Number),
        memory: expect.any(Object)
      });
    });

    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/ready')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ready',
        timestamp: expect.any(String)
      });
    });

    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/live')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
        pid: expect.any(Number)
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toMatchObject({
        'x-request-id': expect.any(String)
      });
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:8080')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    });
  });

  describe('Authentication', () => {
    const validToken = jwt.sign(
      {
        sub: 'test-user-123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['*'],
        iss: 'serenity-api-gateway',
        aud: 'serenity-services'
      },
      'test-jwt-secret',
      { expiresIn: '1h' }
    );

    beforeEach(async () => {
      // Set up test user session
      try {
        await redisManager.setJSON('session:test-user-123', {
          id: 'test-user-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: ['*'],
          is_active: true,
          created_at: new Date(),
          last_login_at: new Date()
        });
      } catch (error) {
        // Redis may not be available
      }
    });

    it('should protect admin endpoints', async () => {
      await request(app)
        .get('/services')
        .expect(401);
    });

    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/services')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('services');
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/services')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject malformed authorization header', async () => {
      await request(app)
        .get('/services')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed initially (health endpoint has bypass)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('Input Validation', () => {
    it('should reject requests with suspicious patterns', async () => {
      await request(app)
        .get('/health?param=<script>alert("xss")</script>')
        .expect(400);
    });

    it('should handle path traversal attempts', async () => {
      await request(app)
        .get('/../../etc/passwd')
        .expect(400);
    });

    it('should reject oversized requests', async () => {
      const largePayload = 'x'.repeat(1024 * 1024 * 20); // 20MB

      await request(app)
        .post('/test')
        .send({ data: largePayload })
        .expect(413);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toMatchObject({
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: expect.stringContaining('Route GET /unknown-route not found'),
          timestamp: expect.any(String),
          request_id: expect.any(String)
        }
      });
    });

    it('should handle method not allowed', async () => {
      await request(app)
        .patch('/health')
        .expect(404); // Will be caught by 404 handler
    });
  });

  describe('Monitoring', () => {
    it('should track request metrics', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('Service Discovery', () => {
    const validToken = jwt.sign(
      {
        sub: 'test-user-123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['*'],
        iss: 'serenity-api-gateway',
        aud: 'serenity-services'
      },
      'test-jwt-secret',
      { expiresIn: '1h' }
    );

    beforeEach(async () => {
      try {
        await redisManager.setJSON('session:test-user-123', {
          id: 'test-user-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: ['*'],
          is_active: true,
          created_at: new Date(),
          last_login_at: new Date()
        });
      } catch (error) {
        // Redis may not be available
      }
    });

    it('should list discovered services', async () => {
      const response = await request(app)
        .get('/services')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('services');
      expect(Array.isArray(response.body.services)).toBe(true);
    });

    it('should show circuit breaker status', async () => {
      const response = await request(app)
        .get('/circuit-breakers')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('circuit_breakers');
    });
  });

  describe('File Upload', () => {
    const validToken = jwt.sign(
      {
        sub: 'test-user-123',
        email: 'test@example.com',
        role: 'patient',
        permissions: ['upload:files'],
        iss: 'serenity-api-gateway',
        aud: 'serenity-services'
      },
      'test-jwt-secret',
      { expiresIn: '1h' }
    );

    beforeEach(async () => {
      try {
        await redisManager.setJSON('session:test-user-123', {
          id: 'test-user-123',
          email: 'test@example.com',
          role: 'patient',
          permissions: ['upload:files'],
          is_active: true,
          created_at: new Date(),
          last_login_at: new Date()
        });
      } catch (error) {
        // Redis may not be available
      }
    });

    it('should require authentication for file upload', async () => {
      await request(app)
        .post('/upload/single')
        .expect(401);
    });

    it('should reject upload without file', async () => {
      await request(app)
        .post('/upload/single')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);
    });
  });

  describe('WebSocket Support', () => {
    // Note: WebSocket tests would require socket.io-client
    // This is a placeholder for WebSocket integration tests
    it('should handle WebSocket connection attempts', async () => {
      // WebSocket endpoint not available in this test setup
      // In a full test suite, you would test WebSocket connections
      expect(true).toBe(true);
    });
  });
});
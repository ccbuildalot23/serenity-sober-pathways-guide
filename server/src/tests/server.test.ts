import request from 'supertest';
import { app } from '../app';

describe('Server Health Check', () => {
  it('should return 200 OK for health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should have CORS enabled', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });

  it('should have security headers', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-xss-protection']).toBe('0');
  });
});

describe('API Routes', () => {
  describe('Authentication Routes', () => {
    it('POST /api/auth/register should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        fullName: 'Test User',
        role: 'patient'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
    });

    it('POST /api/auth/login should authenticate user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });
  });

  describe('Check-in Routes', () => {
    let authToken: string;
    
    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'SecurePass123!' });
      authToken = loginResponse.body.token;
    });

    it('POST /api/checkins should create a daily check-in', async () => {
      const checkinData = {
        moodScore: 7,
        anxietyLevel: 4,
        sleepQuality: 8,
        notes: 'Feeling good today'
      };
      
      const response = await request(app)
        .post('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`)
        .send(checkinData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.moodScore).toBe(checkinData.moodScore);
    });

    it('GET /api/checkins should retrieve user check-ins', async () => {
      const response = await request(app)
        .get('/api/checkins')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Crisis Support Routes', () => {
    let authToken: string;
    
    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'SecurePass123!' });
      authToken = loginResponse.body.token;
    });

    it('POST /api/crisis/alert should trigger crisis alert', async () => {
      const alertData = {
        severity: 'high',
        location: { lat: 40.7128, lng: -74.0060 },
        message: 'Need immediate help'
      };
      
      const response = await request(app)
        .post('/api/crisis/alert')
        .set('Authorization', `Bearer ${authToken}`)
        .send(alertData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alertId');
      expect(response.body).toHaveProperty('supportContacted');
      expect(response.body).toHaveProperty('resources');
    });
  });

  describe('Provider Routes', () => {
    let providerToken: string;
    
    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'provider@example.com', password: 'ProviderPass123!' });
      providerToken = loginResponse.body.token;
    });

    it('GET /api/provider/dashboard should return provider dashboard data', async () => {
      const response = await request(app)
        .get('/api/provider/dashboard')
        .set('Authorization', `Bearer ${providerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('patients');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('metrics');
    });

    it('GET /api/provider/roi should calculate ROI metrics', async () => {
      const response = await request(app)
        .get('/api/provider/roi')
        .set('Authorization', `Bearer ${providerToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('retentionRate');
      expect(response.body).toHaveProperty('monthlyROI');
      expect(response.body).toHaveProperty('referralLossPrevented');
    });
  });
});
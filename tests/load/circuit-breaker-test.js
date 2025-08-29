// K6 Load Test for Circuit Breaker Validation
// Tests resilience patterns and failover mechanisms

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const circuitBreakerTriggered = new Rate('circuit_breaker_triggered');
const responseTime = new Trend('response_time');
const fallbackResponses = new Rate('fallback_responses');

// Test configuration
export const options = {
  stages: [
    // Stage 1: Warm up (2 mins)
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    
    // Stage 2: Normal load (5 mins)
    { duration: '5m', target: 100 },  // Stay at 100 users
    
    // Stage 3: Stress test (3 mins)
    { duration: '3m', target: 300 },  // Spike to 300 users
    
    // Stage 4: Circuit breaker test (5 mins)
    { duration: '5m', target: 500 },  // Push to 500 users
    
    // Stage 5: Recovery test (3 mins)
    { duration: '3m', target: 100 },  // Drop back to 100 users
    
    // Stage 6: Cool down (2 mins)
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],     // 95% of requests under 3s
    http_req_failed: ['rate<0.2'],         // Error rate under 20%
    errors: ['rate<0.1'],                   // Custom error rate under 10%
    circuit_breaker_triggered: ['rate<0.5'], // Circuit breaker triggers less than 50%
  },
};

// Test endpoints
const BASE_URL = (typeof __ENV !== 'undefined' && __ENV.BASE_URL) || 'http://localhost:8080';
const API_GATEWAY = `${BASE_URL}/api`;

// Service endpoints
const endpoints = {
  auth: `${API_GATEWAY}/auth`,
  crisis: `${API_GATEWAY}/crisis`,
  notifications: `${API_GATEWAY}/notifications`,
  checkin: `${API_GATEWAY}/checkin`,
  support: `${API_GATEWAY}/support`,
};

// Test data
const testUser = {
  email: `loadtest-${Date.now()}@serenity.test`,
  password: 'TestPass123!',
};

export function setup() {
  // Create a test user for authenticated requests
  const signupRes = http.post(`${endpoints.auth}/signup`, JSON.stringify({
    email: testUser.email,
    password: testUser.password,
    role: 'patient',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (signupRes.status === 201 || signupRes.status === 200) {
    const data = JSON.parse(signupRes.body);
    return { token: data.token || data.access_token };
  }
  
  console.log('Setup failed, continuing without auth token');
  return {};
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (data.token) {
    headers['Authorization'] = `Bearer ${data.token}`;
  }
  
  // Test 1: Auth Service Health Check
  const authHealthRes = http.get(`${endpoints.auth}/health`, { headers });
  const authHealthOk = check(authHealthRes, {
    'Auth service healthy': (r) => r.status === 200,
    'Auth circuit breaker not triggered': (r) => !r.json('fallback'),
  });
  
  if (authHealthRes.json('fallback')) {
    circuitBreakerTriggered.add(1);
  }
  
  responseTime.add(authHealthRes.timings.duration);
  errorRate.add(!authHealthOk);
  
  // Test 2: Crisis Service (Critical Path)
  const crisisCheckRes = http.post(`${endpoints.crisis}/check`, JSON.stringify({
    severity: 'moderate',
    message: 'Load test crisis check',
  }), { headers });
  
  const crisisOk = check(crisisCheckRes, {
    'Crisis service responding': (r) => r.status === 200 || r.status === 503,
    'Crisis fallback working': (r) => {
      if (r.status === 503) {
        const body = r.json();
        return body.emergency === true && body.contacts && body.contacts.length > 0;
      }
      return true;
    },
  });
  
  if (crisisCheckRes.json('emergency')) {
    fallbackResponses.add(1);
  }
  
  responseTime.add(crisisCheckRes.timings.duration);
  errorRate.add(!crisisOk);
  
  // Test 3: Notification Service
  const notifyRes = http.post(`${endpoints.notifications}/send`, JSON.stringify({
    type: 'test',
    message: 'Load test notification',
    userId: 'test-user-id',
  }), { headers });
  
  const notifyOk = check(notifyRes, {
    'Notification service working': (r) => r.status === 200 || r.status === 202,
    'Notification queued on failure': (r) => {
      if (r.status === 503) {
        return r.json('queued') === true;
      }
      return true;
    },
  });
  
  if (notifyRes.json('queued')) {
    fallbackResponses.add(1);
  }
  
  responseTime.add(notifyRes.timings.duration);
  errorRate.add(!notifyOk);
  
  // Test 4: Check-in Service (High Volume)
  const checkinRes = http.post(`${endpoints.checkin}/submit`, JSON.stringify({
    mood: Math.floor(Math.random() * 10) + 1,
    anxiety: Math.floor(Math.random() * 10) + 1,
    sleep: Math.floor(Math.random() * 12) + 1,
    cravings: Math.floor(Math.random() * 10) + 1,
    notes: 'Load test check-in',
  }), { headers });
  
  const checkinOk = check(checkinRes, {
    'Check-in accepted': (r) => r.status === 201 || r.status === 200 || r.status === 503,
    'Check-in circuit breaker handled': (r) => {
      if (r.status === 503) {
        return r.json('circuitBreaker') !== undefined;
      }
      return true;
    },
  });
  
  responseTime.add(checkinRes.timings.duration);
  errorRate.add(!checkinOk);
  
  // Test 5: Support Network Query
  const supportRes = http.get(`${endpoints.support}/network`, { headers });
  const supportOk = check(supportRes, {
    'Support network accessible': (r) => r.status === 200 || r.status === 503,
  });
  
  responseTime.add(supportRes.timings.duration);
  errorRate.add(!supportOk);
  
  // Test 6: Batch Request (Circuit Breaker Stress)
  const batchRequests = http.batch([
    ['GET', `${endpoints.auth}/profile`, null, { headers }],
    ['GET', `${endpoints.notifications}/unread`, null, { headers }],
    ['GET', `${endpoints.checkin}/history`, null, { headers }],
  ]);
  
  let batchErrors = 0;
  let batchFallbacks = 0;
  
  batchRequests.forEach((res) => {
    if (res.status >= 500) {
      batchErrors++;
    }
    if (res.json('fallback') || res.json('queued')) {
      batchFallbacks++;
    }
    responseTime.add(res.timings.duration);
  });
  
  errorRate.add(batchErrors > 0);
  fallbackResponses.add(batchFallbacks > 0);
  
  // Simulate realistic user behavior
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

export function teardown(data) {
  // Clean up test user if created
  if (data.token) {
    http.del(`${endpoints.auth}/account`, {
      headers: {
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json',
      },
    });
  }
  
  // Print summary
  console.log('Load test completed');
  console.log(`Circuit breaker triggers: ${circuitBreakerTriggered.rate * 100}%`);
  console.log(`Fallback responses: ${fallbackResponses.rate * 100}%`);
  console.log(`Error rate: ${errorRate.rate * 100}%`);
}
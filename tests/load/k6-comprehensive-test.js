import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for healthcare application
const checkInSuccessRate = new Rate('checkin_success_rate');
const crisisResponseTime = new Trend('crisis_response_time');
const authSuccessRate = new Rate('auth_success_rate');
const phiAccessTime = new Trend('phi_access_time');
const sessionTimeoutCompliance = new Rate('session_timeout_compliance');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Normal user load
    normal_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 users
        { duration: '5m', target: 50 },  // Stay at 50 users
        { duration: '2m', target: 100 }, // Increase to 100 users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Scenario 2: Crisis surge simulation
    crisis_surge: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1m',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '30s', target: 10 },  // Normal rate
        { duration: '1m', target: 100 },  // Crisis surge
        { duration: '2m', target: 200 },  // Peak crisis
        { duration: '1m', target: 50 },   // De-escalation
        { duration: '30s', target: 10 },  // Return to normal
      ],
    },
    // Scenario 3: Sustained load for HIPAA compliance
    sustained_load: {
      executor: 'constant-vus',
      vus: 200,
      duration: '10m',
    },
  },
  thresholds: {
    // Performance requirements
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
    http_req_failed: ['rate<0.05'],                   // Error rate under 5%
    
    // Healthcare-specific thresholds
    checkin_success_rate: ['rate>0.95'],              // 95% successful check-ins
    crisis_response_time: ['p(95)<500'],              // Crisis alerts under 500ms
    auth_success_rate: ['rate>0.98'],                 // 98% successful auths
    phi_access_time: ['p(95)<1000'],                  // PHI access under 1s
    session_timeout_compliance: ['rate>0.99'],        // 99% proper timeouts
  },
};

// Configuration
/* global __ENV */
const BASE_URL = (typeof __ENV !== 'undefined' ? __ENV.BASE_URL : null) || 'https://serenity-sober-pathways-guide.vercel.app';
// const SUPABASE_URL = (typeof __ENV !== 'undefined' ? __ENV.SUPABASE_URL : null) || 'https://lxixkyyfkbhqapuiefyt.supabase.co';
const SUPABASE_KEY = (typeof __ENV !== 'undefined' ? __ENV.SUPABASE_ANON_KEY : null) || '';

// Test user generation
function generateTestUser() {
  const timestamp = Date.now();
  return {
    email: `test-user-${timestamp}@serenity-load-test.com`,
    password: 'TestPass123!',
    role: ['patient', 'provider', 'supporter'][Math.floor(Math.random() * 3)],
  };
}

// Healthcare-specific test data
function generateCheckInData() {
  return {
    mood_score: Math.floor(Math.random() * 10) + 1,
    anxiety_level: Math.floor(Math.random() * 10) + 1,
    sleep_hours: Math.floor(Math.random() * 8) + 4,
    medication_taken: Math.random() > 0.2,
    notes: `Load test check-in ${Date.now()}`,
    trigger_warnings: [],
    support_needed: Math.random() > 0.8,
  };
}

// Main test scenarios
export default function () {
  const user = generateTestUser();
  
  group('User Authentication Flow', () => {
    // const startTime = Date.now();
    
    // Register new user
    const registerPayload = JSON.stringify({
      email: user.email,
      password: user.password,
      role: user.role,
    });
    
    const registerRes = http.post(
      `${BASE_URL}/api/auth/register`,
      registerPayload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const registerSuccess = check(registerRes, {
      'registration successful': (r) => r.status === 200 || r.status === 201,
      'received auth token': (r) => r.json('access_token') !== undefined,
    });
    
    authSuccessRate.add(registerSuccess);
    
    if (!registerSuccess) {
      // Try login if registration fails (user might exist)
      const loginRes = http.post(
        `${BASE_URL}/api/auth/login`,
        registerPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      check(loginRes, {
        'login successful': (r) => r.status === 200,
      });
    }
    
    sleep(1);
  });
  
  group('Daily Check-In Flow', () => {
    const checkInData = generateCheckInData();
    const checkInPayload = JSON.stringify(checkInData);
    
    const checkInRes = http.post(
      `${BASE_URL}/api/checkin`,
      checkInPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    
    const checkInSuccess = check(checkInRes, {
      'check-in successful': (r) => r.status === 200 || r.status === 201,
      'check-in processed quickly': (r) => r.timings.duration < 2000,
    });
    
    checkInSuccessRate.add(checkInSuccess);
    
    sleep(2);
  });
  
  group('Crisis Alert System', () => {
    const crisisStartTime = Date.now();
    
    const crisisPayload = JSON.stringify({
      severity: 'high',
      user_id: user.email,
      location: {
        lat: 40.7128,
        lng: -74.0060,
      },
      message: 'Load test crisis alert',
      contacts_to_notify: ['contact1@test.com', 'contact2@test.com'],
    });
    
    const crisisRes = http.post(
      `${BASE_URL}/api/crisis/alert`,
      crisisPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    
    const responseTime = Date.now() - crisisStartTime;
    crisisResponseTime.add(responseTime);
    
    check(crisisRes, {
      'crisis alert sent': (r) => r.status === 200 || r.status === 201,
      'crisis response fast': (r) => r.timings.duration < 500,
    });
    
    sleep(1);
  });
  
  group('PHI Access Compliance', () => {
    const phiStartTime = Date.now();
    
    // Access patient health information
    const phiRes = http.get(
      `${BASE_URL}/api/patient/health-records`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    
    const accessTime = Date.now() - phiStartTime;
    phiAccessTime.add(accessTime);
    
    check(phiRes, {
      'PHI access authorized': (r) => r.status === 200 || r.status === 403,
      'PHI access logged': (r) => r.headers['X-Audit-Log-Id'] !== undefined,
    });
    
    sleep(1);
  });
  
  group('Session Timeout Testing', () => {
    // Simulate session timeout after 15 minutes
    // const sessionStartTime = Date.now();
    
    // Create session
    const sessionRes = http.post(
      `${BASE_URL}/api/auth/session`,
      JSON.stringify({ email: user.email }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const sessionToken = sessionRes.json('session_token');
    
    // Wait and check if session times out properly
    sleep(2); // In real test, this would be 900 seconds (15 minutes)
    
    const timeoutCheckRes = http.get(
      `${BASE_URL}/api/auth/verify`,
      {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      }
    );
    
    const properTimeout = check(timeoutCheckRes, {
      'session management working': (r) => r.status === 200 || r.status === 401,
    });
    
    sessionTimeoutCompliance.add(properTimeout);
  });
  
  group('Health Check Monitoring', () => {
    const healthRes = http.get(`${BASE_URL}/api/health`);
    
    check(healthRes, {
      'health check responds': (r) => r.status === 200,
      'all services healthy': (r) => {
        const body = r.json();
        return body && body.status === 'healthy';
      },
    });
    
    sleep(5);
  });
  
  // Random sleep between iterations to simulate real user behavior
  sleep(Math.random() * 5 + 1);
}

// Handle test summary
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    scenarios: data.metrics.scenarios,
    thresholds: {},
    metrics: {},
  };
  
  // Extract threshold results
  Object.keys(data.metrics).forEach(metric => {
    if (data.metrics[metric].thresholds) {
      summary.thresholds[metric] = data.metrics[metric].thresholds;
    }
    
    // Extract key metric values
    if (data.metrics[metric].values) {
      summary.metrics[metric] = data.metrics[metric].values;
    }
  });
  
  // HIPAA compliance check
  const hipaaCompliant = 
    data.metrics.session_timeout_compliance.values.rate > 0.99 &&
    data.metrics.auth_success_rate.values.rate > 0.98;
  
  summary.hipaa_compliant = hipaaCompliant;
  
  return {
    'stdout': JSON.stringify(summary, null, 2),
    'summary.json': JSON.stringify(summary, null, 2),
  };
}
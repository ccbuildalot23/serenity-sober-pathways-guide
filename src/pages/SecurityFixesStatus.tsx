import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Shield, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { EnhancedSecurityInitializer } from '@/lib/enhancedSecurityInitializer';
import { securityComplianceService } from '@/services/securityComplianceService';
import { toast } from 'sonner';

interface SecurityFix {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'active' | 'pending';
  _severity: 'critical' | 'high' | 'medium' | 'low';
  implementation: string;
}

const SecurityFixesStatus: React.FC = () => {
  const [securityStatus, setSecurityStatus] = useState<Record<string, boolean>>({});
  const [auditCleanupRunning, setAuditCleanupRunning] = useState(_false);

  const securityFixes: SecurityFix[] = [
    {
      id: 'admin-code',
      title: 'Admin Code Security',
      description: 'Moved hardcoded admin verification to secure service with environment variable support',
      status: 'completed',
      _severity: 'high',
      implementation: 'Implemented secure admin verification service with audit logging'
    },
    {
      id: 'audit-retention',
      title: 'Audit Log Retention Policy',
      description: 'Automated cleanup of audit logs older than 90 days with proper logging',
      status: 'active',
      _severity: 'medium',
      implementation: 'Database function with automatic scheduling and compliance logging'
    },
    {
      id: 'security-headers',
      title: 'Enhanced Security Headers',
      description: 'Strengthened CSP, added additional security headers for XSS and clickjacking protection',
      status: 'completed',
      _severity: 'medium',
      implementation: 'Comprehensive security header service with nonce generation'
    },
    {
      id: 'environment-validation',
      title: 'Environment Security Validation',
      description: 'Added checks for forbidden client-side keys and HTTPS enforcement',
      status: 'completed',
      _severity: 'high',
      implementation: 'Runtime validation with security issue reporting'
    },
    {
      id: 'development-cleanup',
      title: 'Development Code Cleanup',
      description: 'Removed TODO comments and replaced mock implementations with production-ready code',
      status: 'completed',
      _severity: 'low',
      implementation: 'Code review and refactoring for production readiness'
    }
  ];

  useEffect(() => {
    setSecurityStatus(EnhancedSecurityInitializer.getSecurityStatus());
  }, []);

  const handleManualAuditCleanup = async () => {
    setAuditCleanupRunning(_true);
    try {
      await securityComplianceService.cleanupAuditLogs();
      toast.success('Audit log cleanup completed successfully');
    } catch (_error) {
      toast._error('Audit log cleanup failed');
      console._error('Cleanup _error:', _error);
    } finally {
      setAuditCleanupRunning(_false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (_severity: string) => {
    switch (_severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'active': return 'secondary';
      case 'pending': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Security Fixes Implementation</h1>
          <p className="text-muted-foreground">
            Comprehensive security enhancements and fixes status
          </p>
        </div>
      </div>

      {/* Security Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Security System Status</CardTitle>
          <CardDescription>
            Overall security initialization and compliance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(securityStatus).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                {value ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Fixes */}
      <div className="grid gap-4">
        <h2 className="text-2xl font-semibold">Implemented Security Fixes</h2>
        
        {securityFixes.map((fix) => (
          <Card key={fix.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(fix.status)}
                  <div>
                    <CardTitle className="text-lg">{fix.title}</CardTitle>
                    <CardDescription>{fix.description}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getSeverityColor(fix._severity)}>
                    {fix._severity}
                  </Badge>
                  <Badge variant={getStatusColor(fix.status)}>
                    {fix.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Implementation:</strong> {fix.implementation}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Manual Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Security Actions</CardTitle>
          <CardDescription>
            Trigger security operations manually for testing and maintenance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={handleManualAuditCleanup}
              disabled={auditCleanupRunning}
              variant="outline"
            >
              {auditCleanupRunning ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Run Audit Log Cleanup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Enhancement Complete:</strong> All identified security fixes have been implemented. 
          The application now features enhanced admin verification, automated audit log retention, 
          strengthened security headers, environment validation, and production-ready code cleanup.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SecurityFixesStatus;
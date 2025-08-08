import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useSecureAuditLogger } from '@/hooks/useSecureAuditLogger';
import { EnhancedSecurityInitializer } from '@/lib/enhancedSecurityInitializer';
import { Shield, AlertTriangle, CheckCircle, Activity, Clock, Eye } from 'lucide-react';

export const SecurityAuditDashboard: React.FC = () => {
  const { _user } = useAuth();
  const { log } = useSecureAuditLogger();
  const [securityStatus, setSecurityStatus] = useState<unknown>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshSecurityStatus();
  }, []);

  const refreshSecurityStatus = async () => {
    setIsRefreshing(true);
    try {
      const status = EnhancedSecurityInitializer.getSecurityStatus();
      const issues = EnhancedSecurityInitializer.getSecurityIssues();
      
      setSecurityStatus({
        ...status,
        issues,
        _lastUpdated: new Date().toISOString()
      });

      await log('SECURITY_AUDIT_DASHBOARD_ACCESSED', {
        timestamp: new Date().toISOString(),
        securityIssueCount: issues.length
      });
    } catch (_error) {
      console._error('Failed to refresh security status:', _error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getSecurityScore = () => {
    if (!securityStatus) return 0;
    
    const totalChecks = 8;
    let passedChecks = 0;
    
    if (securityStatus.initialized) passedChecks++;
    if (securityStatus.secureContext) passedChecks++;
    if (securityStatus.headersApplied) passedChecks++;
    if (securityStatus.auditRetentionActive) passedChecks++;
    if (securityStatus.complianceEnabled) passedChecks++;
    if (securityStatus.environmentValidated) passedChecks++;
    if (securityStatus.issues.length === 0) passedChecks++;
    if (_user) passedChecks++; // Authentication active
    
    return Math.round((passedChecks / totalChecks) * 100);
  };

  const getSecurityLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'text-green-600', icon: CheckCircle };
    if (score >= 75) return { level: 'Good', color: 'text-blue-600', icon: Shield };
    if (score >= 60) return { level: 'Fair', color: 'text-yellow-600', icon: AlertTriangle };
    return { level: 'Poor', color: 'text-red-600', icon: AlertTriangle };
  };

  if (!securityStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Activity className="w-6 h-6 animate-spin mr-2" />
          Loading security status...
        </CardContent>
      </Card>
    );
  }

  const _securityScore = getSecurityScore();
  const securityLevel = getSecurityLevel(_securityScore);
  const SecurityIcon = securityLevel.icon;

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Security Status Overview
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshSecurityStatus}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Activity className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Eye className="w-4 h-4 mr-1" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Security Score */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <SecurityIcon className={`w-8 h-8 ${securityLevel.color}`} />
              </div>
              <div className="text-3xl font-bold mb-1">{_securityScore}%</div>
              <div className={`text-sm font-medium ${securityLevel.color}`}>
                {securityLevel.level}
              </div>
            </div>

            {/* System Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Security Initialized</span>
                <Badge variant={securityStatus.initialized ? 'default' : 'destructive'}>
                  {securityStatus.initialized ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Secure Context</span>
                <Badge variant={securityStatus.secureContext ? 'default' : 'destructive'}>
                  {securityStatus.secureContext ? 'HTTPS' : 'HTTP'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Security Headers</span>
                <Badge variant={securityStatus.headersApplied ? 'default' : 'destructive'}>
                  {securityStatus.headersApplied ? 'Applied' : 'Missing'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Audit Retention</span>
                <Badge variant={securityStatus.auditRetentionActive ? 'default' : 'destructive'}>
                  {securityStatus.auditRetentionActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Last Check */}
            <div className="flex flex-col items-center justify-center">
              <Clock className="w-6 h-6 text-muted-foreground mb-2" />
              <div className="text-sm text-muted-foreground text-center">
                Last Updated
              </div>
              <div className="text-xs font-mono">
                {new Date(securityStatus._lastUpdated).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Issues */}
      {securityStatus.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Security Issues ({securityStatus.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {securityStatus.issues.map((issue: string, index: number) => (
              <Alert key={index}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{issue}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {_securityScore < 90 && (
            <div className="space-y-2">
              <h4 className="font-medium">Improve Security Score:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                {!securityStatus.secureContext && (
                  <li>• Ensure the application is served over HTTPS in production</li>
                )}
                {securityStatus.issues.length > 0 && (
                  <li>• Address the security issues listed above</li>
                )}
                {!securityStatus.environmentValidated && (
                  <li>• Review and fix environment variable configuration</li>
                )}
                <li>• Regularly review audit logs for suspicious activity</li>
                <li>• Keep security policies and procedures up to date</li>
              </ul>
            </div>
          )}
          
          {_securityScore >= 90 && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Excellent security posture! Continue monitoring for optimal protection.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edge Function Security Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Edge Function Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-1">JWT Verification Status</h4>
              <p className="text-sm text-muted-foreground">
                Most edge functions require JWT authentication. The following functions have specific security configurations:
              </p>
            </div>
            
            <div className="border rounded-lg p-3 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">recovery-notification-scheduler</span>
                <Badge variant="secondary">JWT Disabled</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                This function is configured to run as a scheduled job and requires JWT verification to be disabled. 
                It includes internal security checks to prevent unauthorized access.
              </p>
            </div>

            <div className="border rounded-lg p-3 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">send-crisis-sms</span>
                <Badge variant="default">JWT Required</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Crisis SMS function requires proper authentication and includes rate limiting and input validation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
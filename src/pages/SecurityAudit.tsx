import React from 'react';
import { SecurityAuditDashboard } from '@/components/security/SecurityAuditDashboard';
import { SecureAdminPanel } from '@/components/security/SecureAdminPanel';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock } from 'lucide-react';

const SecurityAudit: React.FC = () => {
  const { role, isProvider } = useUserRole();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold flex items-center justify-center">
          <Shield className="w-8 h-8 mr-3 text-blue-600" />
          Security Audit Dashboard
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Monitor your application's security posture, review audit logs, and manage security settings.
        </p>
      </div>

      {/* Security Audit Dashboard - Available to all users */}
      <SecurityAuditDashboard />

      {/* Admin Panel - Only for providers */}
      {isProvider && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Administrative Security Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SecureAdminPanel />
          </CardContent>
        </Card>
      )}

      {/* Role-based Access Notice */}
      {!isProvider && (
        <Card>
          <CardContent className="text-center py-8">
            <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Limited Access</h3>
            <p className="text-sm text-muted-foreground">
              You have {role} access. Administrative security controls are available to healthcare providers only.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SecurityAudit;
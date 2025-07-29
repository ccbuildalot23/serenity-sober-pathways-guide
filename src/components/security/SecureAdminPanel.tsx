import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { useSecureAdminAccess } from '@/hooks/useSecureAdminAccess';

/**
 * SECURITY FIX: Replace hardcoded admin access with role-based verification
 */
export const SecureAdminPanel: React.FC = () => {
  const { isAdmin, verifying, verifyAdminAccess, executeAdminAction } = useSecureAdminAccess();

  const handleVerifyAccess = async () => {
    await verifyAdminAccess();
  };

  const handleSecurityAudit = async () => {
    await executeAdminAction('SECURITY_AUDIT', async () => {
      console.log('Performing security audit...');
      // Security audit logic would go here
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Secure Admin Access
        </CardTitle>
        <CardDescription>
          Role-based admin verification system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Admin Status:</span>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-600">Verified</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-600">Not Verified</span>
              </>
            )}
          </div>
        </div>

        <Alert>
          <AlertDescription>
            Admin access is now secured through role-based authentication. 
            Hardcoded verification has been removed for security.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button 
            onClick={handleVerifyAccess}
            disabled={verifying}
            variant="outline"
            className="w-full"
          >
            {verifying ? 'Verifying...' : 'Verify Admin Access'}
          </Button>

          {isAdmin && (
            <Button 
              onClick={handleSecurityAudit}
              className="w-full"
            >
              Run Security Audit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
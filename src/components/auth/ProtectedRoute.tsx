
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { UserRole } from '@/types/userRoles';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, canAccess } = useUserRole();
  const location = useLocation();
  const [bypassAuth, setBypassAuth] = React.useState(false);

  // Check if we're in development mode and should bypass auth
  const isDev = import.meta.env.DEV;
  // Effective bypass: honor localStorage flag in any environment (used by E2E/dev),
  // and also allow in-session bypass via the dev button.
  const storageBypass = React.useMemo(() => {
    try {
      return localStorage.getItem('dev_bypass_auth') === 'true';
    } catch {
      return false;
    }
  }, []);
  const shouldBypass = storageBypass || (isDev && bypassAuth);

  // Show loading state while checking auth
  if (!shouldBypass && (authLoading || roleLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // In development mode, show bypass option if not authenticated
  if (!user && isDev && !shouldBypass) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <strong>Authentication Required</strong>
              <p className="mt-2">You need to be signed in to access this page.</p>
              {isDev && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm">Development mode detected. You can:</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/auth'}
                      className="flex-1"
                    >
                      Go to Sign In
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        localStorage.setItem('dev_bypass_auth', 'true');
                        setBypassAuth(true);
                      }}
                      className="flex-1"
                    >
                      Bypass Auth (Dev)
                    </Button>
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Redirect to auth page if not authenticated (production mode)
  if (!user && !shouldBypass) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Enforce role-based access if a role is required
  if (!shouldBypass && requiredRole && !canAccess(requiredRole)) {
    return <Navigate to="/auth" state={{ from: location, reason: 'forbidden' }} replace />;
  }

  return <>{children}</>;
};

import React from 'react';
import { useUnifiedSecurity } from '@/hooks/useUnifiedSecurity';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';

interface SessionTimeoutManagerProps {
  children: React.ReactNode;
}

export const SessionTimeoutManager: React.FC<SessionTimeoutManagerProps> = ({
  children
}) => {
  const {
    sessionWarning,
    extendSession,
    forceSignOut,
    isSessionValid,
    securityScore
  } = useUnifiedSecurity();

  const handleContinue = async () => {
    await extendSession();
  };

  const handleSignOut = async () => {
    await forceSignOut();
  };

  // Don't render warning if session is not valid or security score is too low
  if (!isSessionValid || securityScore < 50) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      <AlertDialog open={sessionWarning} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Your session will expire soon due to inactivity.
              </p>
              <p className="text-sm">
                For security and HIPAA compliance, sessions automatically expire 
                after periods of inactivity. Would you like to continue your session?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSignOut}>
              Sign Out Now
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleContinue}>
              Continue Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SessionTimeoutManager;
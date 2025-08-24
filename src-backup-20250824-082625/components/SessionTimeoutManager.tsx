import React from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import SessionWarningDialog from '@/components/security/SessionWarningDialog';

interface SessionTimeoutManagerProps {
  children: React.ReactNode;
}

/**
 * HIPAA-compliant Session Timeout Manager
 * 
 * Features:
 * - 15-minute session timeout as required by HIPAA
 * - 2-minute warning before timeout
 * - Activity monitoring (mouse, keyboard, touch)
 * - PHI data clearing on timeout
 * - Comprehensive audit logging
 * - Session extension capability
 */
export const SessionTimeoutManager: React.FC<SessionTimeoutManagerProps> = ({
  children
}) => {
  const { 
    showWarning, 
    timeRemaining, 
    extendSession, 
    signOutNow 
  } = useSessionTimeout();

  // Format time remaining for display
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {children}
      <SessionWarningDialog
        open={showWarning}
        timeRemaining={formatTimeRemaining(timeRemaining)}
        onExtendSession={extendSession}
        onSignOut={signOutNow}
      />
    </>
  );
};

export default SessionTimeoutManager;
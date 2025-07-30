import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SessionTimeoutManagerProps {
  children: React.ReactNode;
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export const SessionTimeoutManager: React.FC<SessionTimeoutManagerProps> = ({
  children,
  timeoutMinutes = 30,
  warningMinutes = 5
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningIdRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (warningIdRef.current) clearTimeout(warningIdRef.current);
    if (countdownIdRef.current) clearInterval(countdownIdRef.current);
    
    if (showWarning) {
      setShowWarning(false);
      setSecondsRemaining(0);
    }

    warningIdRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsRemaining(warningMinutes * 60);
      
      countdownIdRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, (timeoutMinutes - warningMinutes) * 60 * 1000);

    timeoutIdRef.current = setTimeout(() => {
      handleTimeout();
    }, timeoutMinutes * 60 * 1000);
  }, [showWarning, timeoutMinutes, warningMinutes]);

  const handleTimeout = async () => {
    if (countdownIdRef.current) clearInterval(countdownIdRef.current);
    
    try {
      await supabase.from('audit_logs').insert({
        action: 'session_timeout',
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        details_encrypted: JSON.stringify({
          timeout_minutes: timeoutMinutes,
          last_activity: new Date(lastActivityRef.current).toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to log timeout:', error);
    }

    await signOut();
    navigate('/auth');
    toast.error('Your session has expired for security reasons. Please sign in again.');
  };

  const handleContinue = () => {
    resetTimeout();
    
    supabase.from('audit_logs').insert({
      action: 'session_extended',
      user_id: user?.id,
      details_encrypted: JSON.stringify({
        extended_at: new Date().toISOString()
      })
    }).then(({ error }) => {
      if (error) console.error('Failed to log session extension:', error);
    });
  };

  useEffect(() => {
    if (!user) return;

    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) {
        resetTimeout();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    resetTimeout();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (warningIdRef.current) clearTimeout(warningIdRef.current);
      if (countdownIdRef.current) clearInterval(countdownIdRef.current);
    };
  }, [user, resetTimeout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {children}
      
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Session Expiring</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Your session will expire in{' '}
                <span className="font-bold text-red-600">
                  {formatTime(secondsRemaining)}
                </span>{' '}
                due to inactivity.
              </p>
              <p className="text-sm">
                For security and HIPAA compliance, sessions automatically expire after{' '}
                {timeoutMinutes} minutes of inactivity.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleTimeout()}>
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
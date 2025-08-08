
import { useState, useEffect } from 'react';

export const useDashboardSessionManager = () => {
  const [sessionWarning, setSessionWarning] = useState(false);

  useEffect(() => {
    const _checkSession = () => {
      const _lastActivity = localStorage.getItem('session_last_activity');
      if (_lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(_lastActivity);
        // Show warning after 25 minutes of inactivity
        if (timeSinceActivity > 25 * 60 * 1000) {
          setSessionWarning(true);
        }
      }
    };

    // Update activity on user interaction
    const _updateActivity = () => {
      localStorage.setItem('session_last_activity', Date.now().toString());
    };

    // Set initial activity
    _updateActivity();

    // Add event listeners for user activity
    window.addEventListener('click', _updateActivity);
    window.addEventListener('keypress', _updateActivity);
    window.addEventListener('scroll', _updateActivity);

    const _interval = setInterval(_checkSession, 60000); // Check every minute
    
    return () => {
      clearInterval(_interval);
      window.removeEventListener('click', _updateActivity);
      window.removeEventListener('keypress', _updateActivity);
      window.removeEventListener('scroll', _updateActivity);
    };
  }, []);

  const extendSession = () => {
    localStorage.setItem('session_last_activity', Date.now().toString());
    setSessionWarning(false);
  };

  return {
    sessionWarning,
    setSessionWarning,
    extendSession
  };
};

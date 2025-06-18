
import { useState, useEffect } from 'react';

export const useDashboardSessionManager = () => {
  const [sessionWarning, setSessionWarning] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const lastActivity = localStorage.getItem('session_last_activity');
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        // Show warning after 25 minutes of inactivity
        if (timeSinceActivity > 25 * 60 * 1000) {
          setSessionWarning(true);
        }
      }
    };

    // Update activity on user interaction
    const updateActivity = () => {
      localStorage.setItem('session_last_activity', Date.now().toString());
    };

    // Set initial activity
    updateActivity();

    // Add event listeners for user activity
    window.addEventListener('click', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('scroll', updateActivity);

    const interval = setInterval(checkSession, 60000); // Check every minute
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('scroll', updateActivity);
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

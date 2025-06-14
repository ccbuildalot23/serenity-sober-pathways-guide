
import { useState, useEffect } from 'react';

export const useDashboardSessionManager = () => {
  const [sessionWarning, setSessionWarning] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        // Show warning after 25 minutes of inactivity
        if (timeSinceActivity > 25 * 60 * 1000) {
          setSessionWarning(true);
        }
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const extendSession = () => {
    localStorage.setItem('lastActivity', Date.now().toString());
    setSessionWarning(false);
  };

  return {
    sessionWarning,
    setSessionWarning,
    extendSession
  };
};

import React from 'react';
import { useSessionTimeout, SESSION_CONFIG } from '@/hooks/useSessionTimeout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Shield, Activity, AlertTriangle } from 'lucide-react';

/**
 * Debug component for monitoring session timeout state
 * Only visible in development mode for troubleshooting
 */
export const SessionTimeoutDebug: React.FC = () => {
  const { user } = useAuth();
  const { showWarning, timeRemaining, isActive, clearPHIData } = useSessionTimeout();
  
  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  // Format time remaining for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="border-2 border-blue-200 bg-blue-50/95 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-blue-600" />
            Session Timeout Debug
          </CardTitle>
          <CardDescription className="text-xs">
            HIPAA Compliance Monitor (Dev Only)
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* User Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">User:</span>
            <Badge variant={user ? 'default' : 'secondary'}>
              {user ? 'Authenticated' : 'Not Logged In'}
            </Badge>
          </div>
          
          {/* Session Active Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Active:
            </span>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Yes' : 'No'}
            </Badge>
          </div>
          
          {/* Configuration */}
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Timeout:</span>
              <span className="font-mono">{SESSION_CONFIG.TIMEOUT_MINUTES}min</span>
            </div>
            <div className="flex justify-between">
              <span>Warning:</span>
              <span className="font-mono">{SESSION_CONFIG.WARNING_MINUTES}min</span>
            </div>
          </div>
          
          {/* Warning Status */}
          {showWarning && (
            <div className="p-2 rounded bg-amber-100 border border-amber-300">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">
                  Warning Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-700">Time left:</span>
                <span className="font-mono text-sm font-bold text-amber-900">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          )}
          
          {/* Test Controls */}
          <div className="pt-2 border-t border-blue-200">
            <Button
              size="sm"
              variant="outline"
              onClick={clearPHIData}
              className="w-full text-xs"
            >
              Test PHI Clear
            </Button>
          </div>
          
          {/* Compliance Note */}
          <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
            <div className="flex items-start gap-1">
              <Clock className="w-3 h-3 mt-0.5" />
              <div>
                <div className="font-medium">HIPAA Compliant</div>
                <div>Automatic logout after 15min of inactivity</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
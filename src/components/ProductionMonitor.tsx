import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { debugService } from '@/services/debugService';
import { emergencyProceduresService } from '@/services/emergencyProceduresService';
import { recoveryService } from '@/services/recoveryService';
import SystemHealthDashboard from './admin/SystemHealthDashboard';

interface ProductionMonitorProps {
  children: React.ReactNode;
}

const ProductionMonitor: React.FC<ProductionMonitorProps> = ({ children }) => {
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);
  const [activeProcedures, setActiveProcedures] = useState(emergencyProceduresService.getActiveProcedures());
  const [criticalErrors, setCriticalErrors] = useState(0);
  const [recoveryStatus, setRecoveryStatus] = useState(recoveryService.getStatus());

  // Secret key combination to show admin panel
  useEffect(() => {
    let keySequence = '';
    const secretCode = 'admin123';
    
    const handleKeyDown = (event: KeyboardEvent) => {
      keySequence += event.key.toLowerCase();
      
      if (keySequence.length > secretCode.length) {
        keySequence = keySequence.slice(-secretCode.length);
      }
      
      if (keySequence === secretCode) {
        setShowHealthDashboard(true);
        keySequence = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Monitor recovery service status
  useEffect(() => {
    const checkRecoveryStatus = () => {
      setRecoveryStatus(recoveryService.getStatus());
    };

    checkRecoveryStatus();
    const interval = setInterval(checkRecoveryStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Monitor for critical errors and emergency procedures
  useEffect(() => {
    const checkForIssues = () => {
      const recentErrors = debugService.getLogs('critical');
      setCriticalErrors(recentErrors.length);
      setActiveProcedures(emergencyProceduresService.getActiveProcedures());
    };

    checkForIssues();
    const interval = setInterval(checkForIssues, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Listen for connection issues with reduced frequency
  useEffect(() => {
    let lastLogTime = 0;
    const handleConnectionIssue = (event: CustomEvent) => {
      const now = Date.now();
      // Only log once per 10 seconds to prevent spam
      if (now - lastLogTime > 10000) {
        debugService.log('critical', 'Connection issue detected by monitor', {
          attempts: event.detail.reconnectAttempts,
          maxAttempts: event.detail.maxAttempts
        });
        lastLogTime = now;
      }
    };

    window.addEventListener('connection-issue', handleConnectionIssue as EventListener);
    return () => window.removeEventListener('connection-issue', handleConnectionIssue as EventListener);
  }, []);

  const handleToggleDebugMode = () => {
    if (debugService.enabled) {
      debugService.disableDebugMode();
    } else {
      debugService.enableDebugMode();
    }
  };

  const handleManualRecovery = () => {
    recoveryService.manualRecovery();
  };

  const handleEmergencyTrigger = async (type: string) => {
    try {
      let responseId: string;
      switch (type) {
        case 'system_failure':
          responseId = await emergencyProceduresService.triggerSystemFailure();
          break;
        case 'mass_alert':
          responseId = await emergencyProceduresService.triggerMassAlert();
          break;
        case 'data_breach':
          responseId = await emergencyProceduresService.triggerDataBreach();
          break;
        case 'service_degradation':
          responseId = await emergencyProceduresService.triggerServiceDegradation();
          break;
        default:
          throw new Error('Unknown emergency type');
      }
      
      debugService.log('critical', 'Emergency procedure triggered manually', {
        type,
        responseId
      });
    } catch (error) {
      debugService.log('error', 'Failed to trigger emergency procedure', {
        type,
        error: error.message
      });
    }
  };

  return (
    <>
      {children}
      
      {/* Production Monitor Overlay */}
      {(import.meta.env.DEV || criticalErrors > 0 || activeProcedures.length > 0 || recoveryStatus.needsRecovery) && (
        <div className="fixed bottom-4 right-4 z-40 space-y-2">
          {/* Recovery Status Alert */}
          {recoveryStatus.needsRecovery && (
            <Card className="bg-orange-50 border-orange-200 max-w-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-orange-800 flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recovery Needed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs">
                  <Badge className="bg-orange-100 text-orange-800">
                    {recoveryStatus.failureCount}/{recoveryStatus.maxFailures} failures
                  </Badge>
                </div>
                {recoveryStatus.recoveryInProgress && (
                  <div className="text-xs text-orange-600">
                    Recovery in progress...
                  </div>
                )}
                <Button 
                  onClick={handleManualRecovery}
                  size="sm"
                  className="w-full"
                  disabled={recoveryStatus.recoveryInProgress}
                >
                  Manual Recovery
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Critical Issues Alert */}
          {(criticalErrors > 0 || activeProcedures.length > 0) && (
            <Card className="bg-red-50 border-red-200 max-w-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Production Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {criticalErrors > 0 && (
                  <div className="text-xs">
                    <Badge className="bg-red-100 text-red-800">
                      {criticalErrors} critical errors
                    </Badge>
                  </div>
                )}
                {activeProcedures.length > 0 && (
                  <div className="text-xs">
                    <Badge className="bg-orange-100 text-orange-800">
                      {activeProcedures.length} active procedures
                    </Badge>
                  </div>
                )}
                <Button 
                  onClick={() => setShowHealthDashboard(true)}
                  size="sm"
                  className="w-full"
                >
                  View Dashboard
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Dev Tools (only in development) */}
          {import.meta.env.DEV && (
            <Card className="bg-blue-50 border-blue-200 max-w-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800 flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Dev Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleToggleDebugMode}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  {debugService.enabled ? (
                    <>
                      <EyeOff className="w-3 h-3 mr-1" />
                      Disable Debug
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3 mr-1" />
                      Enable Debug
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => setShowHealthDashboard(true)}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  Health Dashboard
                </Button>

                <Button
                  onClick={handleManualRecovery}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  Test Recovery
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* System Health Dashboard */}
      <SystemHealthDashboard
        isVisible={showHealthDashboard}
        onClose={() => setShowHealthDashboard(false)}
      />

      {/* Emergency Mode Overlay */}
      {localStorage.getItem('emergency_offline_mode') === 'true' && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
          <strong>EMERGENCY MODE:</strong> Limited functionality available. 
          Crisis resources: 988, 911, Text HOME to 741741
        </div>
      )}
    </>
  );
};

export default ProductionMonitor;

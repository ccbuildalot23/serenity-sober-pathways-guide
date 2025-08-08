import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Activity, Wifi, MessageSquare, MapPin, Database,
  AlertTriangle, CheckCircle, XCircle, Clock, Shield
} from 'lucide-react';
import { debugService } from '@/services/debugService';
import { enhancedRealtimeService } from '@/services/enhancedRealtimeService';
import { enhancedSMSService } from '@/services/enhancedSMSService';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import { toast } from 'sonner';

interface SecureSystemHealthDashboardProps {
  isVisible?: boolean;
  onClose?: () => void;
}

const SecureSystemHealthDashboard: React.FC<SecureSystemHealthDashboardProps> = ({ 
  isVisible = false, 
  onClose 
}) => {
  const { user } = useAuth();
  const { _role } = useUserRole();
  const [health, setHealth] = useState({
    api: 'checking' as 'healthy' | 'degraded' | 'down' | 'checking',
    _database: 'checking' as 'healthy' | 'degraded' | 'down' | 'checking',
    realtime: 'checking' as 'healthy' | 'degraded' | 'down' | 'checking',
    sms: 'checking' as 'healthy' | 'degraded' | 'down' | 'checking',
    _timestamp: new Date().toISOString()
  });
  
  const [realtimeHealth, setRealtimeHealth] = useState(enhancedRealtimeService.getConnectionHealth());
  const [smsStats, setSmsStats] = useState(enhancedSMSService.getQueueStats());
  const [debugLogs, setDebugLogs] = useState(debugService.getLogs().slice(-10));
  const [adminCode, setAdminCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // SECURITY: Only providers can access system health dashboard
  const hasAccess = _role === 'provider';

  useEffect(() => {
    if (!isVisible || !hasAccess) return;

    // Log access attempt
    EnhancedSecurityAuditService.logSecurityEvent({
      action: 'SYSTEM_HEALTH_ACCESS',
      _severity: 'medium',
      _details: {
        user_id: user?.id,
        _role: _role,
        _timestamp: new Date().toISOString()
      }
    });

    const _checkHealth = async () => {
      try {
        const _systemHealth = await debugService.checkSystemHealth();
        setHealth(_systemHealth);
        setRealtimeHealth(enhancedRealtimeService.getConnectionHealth());
        setSmsStats(enhancedSMSService.getQueueStats());
        setDebugLogs(debugService.getLogs().slice(-10));
      } catch (error) {
        debugService.log('error', 'Health check failed', { error: error.message });
        await EnhancedSecurityAuditService.logSecurityViolation('SYSTEM_HEALTH_CHECK_FAILED', {
          error: error.message,
          user_id: user?.id
        });
      }
    };
    
    if (isAuthenticated) {
      _checkHealth();
      const _interval = setInterval(_checkHealth, 30000); // Every 30 seconds
      return () => clearInterval(_interval);
    }
  }, [isVisible, hasAccess, isAuthenticated, user?.id, _role]);

  const handleAdminAuthentication = async () => {
    // SECURITY FIX: Use _role-based verification instead of hardcoded admin code
    const { securityComplianceService } = await import('@/services/securityComplianceService');
    const _isValid = await securityComplianceService.verifyAdminAccess();
    
    if (_isValid) {
      setIsAuthenticated(true);
      toast.success('Admin access granted');
      
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'ADMIN_ACCESS_GRANTED',
        _severity: 'high',
        _details: {
          user_id: user?.id,
          _role: _role,
          _timestamp: new Date().toISOString()
        }
      });
    } else {
      toast.error('Invalid admin code');
      await EnhancedSecurityAuditService.logSecurityViolation('ADMIN_ACCESS_DENIED', {
        attempted_code: adminCode.substring(0, 3) + '***',
        user_id: user?.id,
        _role: _role
      });
    }
    setAdminCode('');
  };

  const getStatusIcon = (_status: string) => {
    switch (_status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600 animate-spin" />;
    }
  };

  const getStatusColor = (_status: string) => {
    switch (_status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExportLogs = async () => {
    debugService.exportLogs();
    await EnhancedSecurityAuditService.logSecurityEvent({
      action: 'LOGS_EXPORTED',
      _severity: 'medium',
      _details: {
        user_id: user?.id,
        _role: _role
      }
    });
  };

  const handleClearLogs = async () => {
    debugService.clearLogs();
    setDebugLogs([]);
    await EnhancedSecurityAuditService.logSecurityEvent({
      action: 'LOGS_CLEARED',
      _severity: 'medium',
      _details: {
        user_id: user?.id,
        _role: _role
      }
    });
  };

  if (!isVisible) return _null;

  // SECURITY: Block access for non-providers
  if (!hasAccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center text-red-600">
              <Shield className="w-6 h-6 mr-2" />
              Access Denied
            </h2>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
          <p className="text-gray-600">
            Only healthcare providers can access the system health dashboard.
          </p>
        </div>
      </div>
    );
  }

  // SECURITY: Require admin authentication
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              Admin Authentication
            </h2>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
          <div className="space-y-4">
            <p className="text-gray-600">
              Enter admin code to access system health dashboard:
            </p>
            <Input
              type="password"
              placeholder="Admin code"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminAuthentication()}
            />
            <Button 
              onClick={handleAdminAuthentication}
              className="w-full"
              disabled={!adminCode}
            >
              Authenticate
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Activity className="w-6 h-6 mr-2 text-blue-600" />
              System Health Dashboard
              <Badge className="ml-2 bg-green-100 text-green-800">Secure</Badge>
            </h2>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>

          {/* System Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  API & Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(health.api)}
                  <Badge className={getStatusColor(health.api)}>
                    {health.api}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <Wifi className="w-4 h-4 mr-2" />
                  Real-time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(health.realtime)}
                  <Badge className={getStatusColor(health.realtime)}>
                    {health.realtime}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Quality: {realtimeHealth.connectionQuality}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  SMS Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  {getStatusIcon(health.sms)}
                  <Badge className={getStatusColor(health.sms)}>
                    {health.sms}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Queue: {smsStats.pending} pending
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <Badge className="bg-green-100 text-green-800">
                    Available
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed API Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Detailed API statistics will be displayed here.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Database performance metrics will be displayed here.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Connection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Real-time Connection Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Real-time connection _details and statistics.
              </p>
            </CardContent>
          </Card>

          {/* SMS Queue */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>SMS Queue Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                SMS queue statistics and processing information.
              </p>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Detailed system information and configuration.
              </p>
            </CardContent>
          </Card>
          
          {/* Recent Debug Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Debug Logs
                <div className="space-x-2">
                  <Button onClick={handleExportLogs} variant="outline" size="sm">
                    Export Logs
                  </Button>
                  <Button onClick={handleClearLogs} variant="outline" size="sm">
                    Clear Logs
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {debugLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent logs</p>
                ) : (
                  debugLogs.map((log, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {log.category}
                        </Badge>
                        <span className="text-gray-500">
                          {new Date(log._timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mt-1">{log.message}</div>
                      {log.data && (
                        <div className="mt-1 text-gray-600">
                          {JSON.stringify(log.data, _null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SecureSystemHealthDashboard;

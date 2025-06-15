
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, Wifi, MessageSquare, MapPin, Database,
  AlertTriangle, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { debugService } from '@/services/debugService';
import { enhancedRealtimeService } from '@/services/enhancedRealtimeService';
import { enhancedSMSService } from '@/services/enhancedSMSService';

interface SystemHealthDashboardProps {
  isVisible?: boolean;
  onClose?: () => void;
}

const SystemHealthDashboard: React.FC<SystemHealthDashboardProps> = ({ 
  isVisible = false, 
  onClose 
}) => {
  const [health, setHealth] = useState({
    api: 'checking' as 'healthy' | 'degraded' | 'down' | 'checking',
    database: 'checking' as 'healthy' | 'degraded' | 'down' | 'checking',
    realtime: 'checking' as 'healthy' | 'degraded' | 'down' | 'checking',
    sms: 'checking' as 'healthy' | 'degraded' | 'down' | 'checking',
    timestamp: new Date().toISOString()
  });
  
  const [realtimeHealth, setRealtimeHealth] = useState(enhancedRealtimeService.getConnectionHealth());
  const [smsStats, setSmsStats] = useState(enhancedSMSService.getQueueStats());
  const [debugLogs, setDebugLogs] = useState(debugService.getLogs().slice(-10));

  useEffect(() => {
    if (!isVisible) return;

    const checkHealth = async () => {
      try {
        const systemHealth = await debugService.checkSystemHealth();
        setHealth(systemHealth);
        setRealtimeHealth(enhancedRealtimeService.getConnectionHealth());
        setSmsStats(enhancedSMSService.getQueueStats());
        setDebugLogs(debugService.getLogs().slice(-10));
      } catch (error) {
        debugService.log('error', 'Health check failed', { error: error.message });
      }
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [isVisible]);

  const getStatusIcon = (status: string) => {
    switch (status) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const handleExportLogs = () => {
    debugService.exportLogs();
  };

  const handleClearLogs = () => {
    debugService.clearLogs();
    setDebugLogs([]);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Activity className="w-6 h-6 mr-2 text-blue-600" />
              System Health Dashboard
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Real-time Connection Details */}
            <Card>
              <CardHeader>
                <CardTitle>Real-time Connection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={realtimeHealth.isConnected ? 'text-green-600' : 'text-red-600'}>
                      {realtimeHealth.isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Ping:</span>
                    <span className="text-sm text-gray-600">
                      {Math.round((Date.now() - realtimeHealth.lastPing) / 1000)}s ago
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reconnect Attempts:</span>
                    <span>{realtimeHealth.reconnectAttempts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quality:</span>
                    <Badge variant="outline">
                      {realtimeHealth.connectionQuality}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SMS Queue Stats */}
            <Card>
              <CardHeader>
                <CardTitle>SMS Queue Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <Badge variant="outline">{smsStats.pending}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Retrying:</span>
                    <Badge variant="outline">{smsStats.retrying}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <Badge className="bg-red-100 text-red-800">{smsStats.failed}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivered:</span>
                    <Badge className="bg-green-100 text-green-800">{smsStats.delivered}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="mt-1">{log.message}</div>
                      {log.data && (
                        <div className="mt-1 text-gray-600">
                          {JSON.stringify(log.data, null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Last Health Check:</strong>
                  <br />
                  {new Date(health.timestamp).toLocaleString()}
                </div>
                <div>
                  <strong>Debug Mode:</strong>
                  <br />
                  {debugService.enabled ? 'Enabled' : 'Disabled'}
                </div>
                <div>
                  <strong>User Agent:</strong>
                  <br />
                  <span className="text-xs">{navigator.userAgent.substring(0, 50)}...</span>
                </div>
                <div>
                  <strong>Online Status:</strong>
                  <br />
                  {navigator.onLine ? 'Online' : 'Offline'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthDashboard;

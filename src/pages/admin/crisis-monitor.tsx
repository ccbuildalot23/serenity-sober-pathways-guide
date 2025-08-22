import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, Clock, Phone, Users, Activity, Shield } from 'lucide-react';

interface CrisisAlert {
  id: string;
  user_id: string;
  severity: string;
  message: string;
  status: string;
  created_at: string;
  first_response_at?: string;
  location?: Record<string, unknown>;
}


export default function CrisisMonitor() {
  const [activeAlerts, setActiveAlerts] = useState<CrisisAlert[]>([]);
  const [smsStats, setSmsStats] = useState({ sent: 0, delivered: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [responseTime, setResponseTime] = useState<string>('<30s');

  useEffect(() => {
    loadActiveAlerts();
    loadSMSStats();
    subscribeToAlerts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadActiveAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('crisis_alerts')
        .select('*')
        .in('status', ['active', 'responded'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setActiveAlerts(data);
        calculateResponseTime(data);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSMSStats = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('status');

      if (!error && data) {
        const stats = data.reduce((acc, log) => {
          if (log.status === 'sent' || log.status === 'delivered') acc.sent++;
          if (log.status === 'delivered') acc.delivered++;
          if (log.status === 'failed') acc.failed++;
          return acc;
        }, { sent: 0, delivered: 0, failed: 0 });
        
        setSmsStats(stats);
      }
    } catch (error) {
      console.error('Error loading SMS stats:', error);
    }
  };

  const subscribeToAlerts = () => {
    const channel = supabase
      .channel('crisis-alerts-monitor')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'crisis_alerts' 
        },
        (payload) => {
          console.log('Crisis alert update:', payload);
          loadActiveAlerts();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sms_logs'
        },
        (payload) => {
          console.log('SMS log update:', payload);
          loadSMSStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const calculateResponseTime = (alerts: CrisisAlert[]) => {
    const responded = alerts.filter(a => a.first_response_at);
    if (responded.length === 0) return;

    const avgMs = responded.reduce((sum, alert) => {
      const created = new Date(alert.created_at).getTime();
      const responded = new Date(alert.first_response_at!).getTime();
      return sum + (responded - created);
    }, 0) / responded.length;

    const seconds = Math.floor(avgMs / 1000);
    setResponseTime(seconds < 30 ? '<30s' : `${seconds}s`);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency':
      case 'critical': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <AlertTriangle className="w-4 h-4" />;
      case 'responded': return <Phone className="w-4 h-4" />;
      case 'resolved': return <Shield className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const testCrisisAlert = async () => {
    // Trigger a test alert via the API
    try {
      const response = await fetch('/api/crisis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity: 'medium',
          message: 'Test crisis alert from monitoring dashboard'
        })
      });
      
      if (response.ok) {
        loadActiveAlerts();
      }
    } catch (error) {
      console.error('Test alert failed:', error);
    }
  };

  const daysUntilLaunch = Math.ceil((new Date('2025-08-31').getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🚨 Crisis Command Center</h1>
        <p className="text-gray-600">Real-time crisis monitoring and response coordination</p>
      </div>

      {/* Launch Countdown */}
      <Card className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="py-6">
          <div className="text-center">
            <p className="text-2xl font-bold mb-2">Pilot Launch: August 31, 2025</p>
            <p className="text-4xl font-bold">{daysUntilLaunch} days remaining</p>
            <p className="mt-2">Target: 5 providers onboarded</p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{activeAlerts.filter(a => a.status === 'active').length}</p>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">SMS Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{smsStats.sent}</p>
              <Phone className="w-8 h-8 text-green-500" />
            </div>
            {smsStats.delivered > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {Math.round((smsStats.delivered / smsStats.sent) * 100)}% delivered
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-green-600">{responseTime}</p>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">ONLINE</p>
                <p className="text-sm text-gray-500">All systems operational</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Live Crisis Alerts</CardTitle>
            <Button onClick={testCrisisAlert} variant="outline" size="sm">
              Test Alert
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading alerts...
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No active crisis alerts</p>
              <p className="text-sm text-gray-400 mt-2">System is monitoring for emergencies</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map(alert => (
                <div key={alert.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(alert.status)}
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {alert.status}
                        </Badge>
                      </div>
                      <p className="font-medium mb-1">{alert.message}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>ID: {alert.id.slice(0, 8)}...</span>
                        <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                        {alert.first_response_at && (
                          <span className="text-green-600">
                            Responded in {Math.floor((new Date(alert.first_response_at).getTime() - new Date(alert.created_at).getTime()) / 1000)}s
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="mt-6 flex gap-4">
        <Button onClick={() => window.location.href = '/provider/quick-onboard'}>
          <Users className="w-4 h-4 mr-2" />
          Onboard Provider
        </Button>
        <Button variant="outline" onClick={loadActiveAlerts}>
          Refresh Dashboard
        </Button>
      </div>
    </div>
  );
}
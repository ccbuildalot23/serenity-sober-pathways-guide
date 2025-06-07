
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, MapPin, Users, Download, Eye, EyeOff, MessageSquare, Edit3 } from 'lucide-react';
import { getSentAlerts } from '@/services/mockSmsService';
import { getNotificationHistory } from '@/services/mockPushService';
import { useToast } from '@/hooks/use-toast';

interface AlertRecord {
  id: string;
  timestamp: Date;
  message: string;
  recipients: string[];
  location?: string;
  notes?: string;
  type: 'sms' | 'push';
}

const AlertHistory = () => {
  const [groupBy, setGroupBy] = useState<'none' | 'timeOfDay' | 'dayOfWeek'>('none');
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [historyEnabled, setHistoryEnabled] = useState(() => 
    localStorage.getItem('alertHistoryEnabled') !== 'false'
  );
  
  const { toast } = useToast();

  // Combine SMS and push notification history
  const alertHistory = useMemo((): AlertRecord[] => {
    if (!historyEnabled) return [];
    
    const smsAlerts = getSentAlerts().map(alert => ({
      id: alert.id,
      timestamp: alert.timestamp,
      message: alert.message,
      recipients: [alert.contactName],
      location: alert.location,
      notes: localStorage.getItem(`alert_notes_${alert.id}`) || undefined,
      type: 'sms' as const
    }));

    const pushAlerts = getNotificationHistory().map(notif => ({
      id: notif.id,
      timestamp: notif.timestamp,
      message: notif.message,
      recipients: [notif.contactName],
      location: notif.location,
      notes: localStorage.getItem(`alert_notes_${notif.id}`) || undefined,
      type: 'push' as const
    }));

    return [...smsAlerts, ...pushAlerts]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [historyEnabled]);

  // Chart data for weekly/monthly view
  const chartData = useMemo(() => {
    const now = new Date();
    const data: { name: string; alerts: number }[] = [];
    
    if (chartPeriod === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const count = alertHistory.filter(alert => 
          alert.timestamp.toDateString() === date.toDateString()
        ).length;
        data.push({ name: dayName, alerts: count });
      }
    } else {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() + 7 * i));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        
        const weekLabel = `Week ${4 - i}`;
        const count = alertHistory.filter(alert => 
          alert.timestamp >= startOfWeek && alert.timestamp <= endOfWeek
        ).length;
        data.push({ name: weekLabel, alerts: count });
      }
    }
    
    return data;
  }, [alertHistory, chartPeriod]);

  // Grouped alerts
  const groupedAlerts = useMemo(() => {
    if (groupBy === 'none') return { 'All Alerts': alertHistory };
    
    const groups: { [key: string]: AlertRecord[] } = {};
    
    alertHistory.forEach(alert => {
      let groupKey = '';
      
      if (groupBy === 'timeOfDay') {
        const hour = alert.timestamp.getHours();
        if (hour < 6) groupKey = 'Night (12-6 AM)';
        else if (hour < 12) groupKey = 'Morning (6-12 PM)';
        else if (hour < 18) groupKey = 'Afternoon (12-6 PM)';
        else groupKey = 'Evening (6-12 AM)';
      } else if (groupBy === 'dayOfWeek') {
        groupKey = alert.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(alert);
    });
    
    return groups;
  }, [alertHistory, groupBy]);

  const handleToggleHistory = (enabled: boolean) => {
    setHistoryEnabled(enabled);
    localStorage.setItem('alertHistoryEnabled', enabled.toString());
    
    if (!enabled) {
      toast({
        title: "Alert history disabled",
        description: "New alerts will not be tracked. Existing history remains.",
        duration: 3000,
      });
    } else {
      toast({
        title: "Alert history enabled",
        description: "New alerts will be tracked going forward.",
        duration: 3000,
      });
    }
  };

  const handleSaveNotes = (alertId: string) => {
    localStorage.setItem(`alert_notes_${alertId}`, notesText);
    setEditingNotes(null);
    setNotesText('');
    toast({
      title: "Notes saved",
      description: "Your notes have been saved for this alert.",
      duration: 2000,
    });
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Message', 'Recipients', 'Location', 'Type', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...alertHistory.map(alert => [
        alert.timestamp.toISOString(),
        `"${alert.message.replace(/"/g, '""')}"`,
        `"${alert.recipients.join(', ')}"`,
        alert.location ? `"${alert.location.replace(/"/g, '""')}"` : '',
        alert.type,
        alert.notes ? `"${alert.notes.replace(/"/g, '""')}"` : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alert-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export complete",
      description: "Alert history exported as CSV file.",
      duration: 2000,
    });
  };

  const chartConfig = {
    alerts: {
      label: "Alerts",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert History</h1>
          <p className="text-gray-600">Track and analyze your emergency alerts</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="history-toggle" className="text-sm">
              {historyEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Label>
            <Switch
              id="history-toggle"
              checked={historyEnabled}
              onCheckedChange={handleToggleHistory}
            />
            <span className="text-sm text-gray-600">
              {historyEnabled ? 'Tracking enabled' : 'Tracking disabled'}
            </span>
          </div>
          
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {!historyEnabled && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <EyeOff className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Alert history tracking is disabled</p>
                <p className="text-sm text-yellow-700">Enable tracking to see new alerts and analytics.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Dashboard */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{alertHistory.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {alertHistory.filter(alert => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return alert.timestamp >= weekAgo;
                  }).length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg per Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {alertHistory.length > 0 ? 
                    Math.round(alertHistory.length / Math.max(1, Math.ceil((Date.now() - alertHistory[alertHistory.length - 1]?.timestamp.getTime()) / (7 * 24 * 60 * 60 * 1000)))) : 0
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Group by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="timeOfDay">Time of day</SelectItem>
                <SelectItem value="dayOfWeek">Day of week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alert List */}
          <div className="space-y-4">
            {Object.entries(groupedAlerts).map(([groupName, alerts]) => (
              <Card key={groupName}>
                <CardHeader>
                  <CardTitle className="text-lg">{groupName}</CardTitle>
                  <CardDescription>{alerts.length} alert(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {alert.timestamp.toLocaleDateString()} at {alert.timestamp.toLocaleTimeString()}
                            </span>
                            <Badge variant={alert.type === 'sms' ? 'default' : 'secondary'}>
                              {alert.type.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <p className="font-medium">{alert.message}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4" />
                              <span>{alert.recipients.join(', ')}</span>
                            </div>
                            
                            {alert.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate max-w-48">{alert.location}</span>
                              </div>
                            )}
                          </div>
                          
                          {alert.notes && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-2">
                              <div className="flex items-center space-x-1 mb-1">
                                <MessageSquare className="w-3 h-3 text-blue-600" />
                                <span className="text-xs font-medium text-blue-800">Notes</span>
                              </div>
                              <p className="text-sm text-blue-700">{alert.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setEditingNotes(alert.id);
                                setNotesText(alert.notes || '');
                              }}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Notes</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="notes">What helped? What was the outcome?</Label>
                                <Textarea
                                  id="notes"
                                  placeholder="Add your reflections about this alert..."
                                  value={notesText}
                                  onChange={(e) => setNotesText(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setEditingNotes(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={() => handleSaveNotes(alert.id)}>
                                  Save Notes
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                  
                  {alerts.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No alerts in this group</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Alert Frequency</h3>
            <Select value={chartPeriod} onValueChange={(value: any) => setChartPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 4 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Alert Trends</CardTitle>
              <CardDescription>
                Number of alerts sent over {chartPeriod === 'week' ? 'the last 7 days' : 'the last 4 weeks'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="alerts" fill="var(--color-alerts)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlertHistory;

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassCard } from '@/components/ui/GlassCard';
import { getSentAlerts } from '@/services/mockSmsService';
import { getNotificationHistory } from '@/services/mockPushService';
import { useToast } from '@/hooks/use-toast';
import AlertHistoryHeader from '@/components/alert-history/AlertHistoryHeader';
import AlertHistoryStats from '@/components/alert-history/AlertHistoryStats';
import AlertHistoryControls from '@/components/alert-history/AlertHistoryControls';
import AlertHistoryList from '@/components/alert-history/AlertHistoryList';
import AlertHistoryCharts from '@/components/alert-history/AlertHistoryCharts';
import { History } from 'lucide-react';

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
  const [_notesText, setNotesText] = useState('');
  const [historyEnabled, setHistoryEnabled] = useState(() =>
    localStorage.getItem('alertHistoryEnabled') !== 'false'
  );
  const [error, setError] = useState<string | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertRecord[]>([]);
  
  const { toast } = useToast();

  // Load alert history from both SMS and push services
  useEffect(() => {
    const loadAlertHistory = async () => {
      if (!historyEnabled) {
        setAlertHistory([]);
        return;
      }

      try {
        const [smsAlerts, pushAlerts] = await Promise.all([
          getSentAlerts(),
          Promise.resolve(getNotificationHistory())
        ]);

        const _combinedAlerts: AlertRecord[] = [
          ...smsAlerts.map(alert => ({
            id: alert.id,
            timestamp: alert.timestamp instanceof Date ? alert.timestamp : new Date(alert.timestamp),
            message: alert.message,
            recipients: [alert.contactName],
            location: undefined,
            notes: localStorage.getItem(`alert_notes_${alert.id}`) || undefined,
            type: 'sms' as const
          })),
          ...pushAlerts.map(notif => ({
            id: notif.id,
            timestamp: notif.timestamp instanceof Date ? notif.timestamp : new Date(notif.timestamp),
            message: notif.message,
            recipients: [notif.contactName],
            location: notif.location,
            notes: localStorage.getItem(`alert_notes_${notif.id}`) || undefined,
            type: 'push' as const
          }))
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setAlertHistory(_combinedAlerts);
        setError(null);
      } catch (_err) {
        console.error('Failed to load alert history:', _err);
        setError('Failed to load alert history. You may need to clear your browser storage.');
        setAlertHistory([]);
      }
    };

    loadAlertHistory();
  }, [historyEnabled]);

  // Chart data for weekly/monthly view
  const chartData = useMemo(() => {
    const _now = new Date();
    const data: { name: string; alerts: number }[] = [];
    
    if (chartPeriod === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(_now);
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
        const startOfWeek = new Date(_now);
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
        _description: "New alerts will not be tracked. Existing history remains.",
        _duration: 3000,
      });
    } else {
      toast({
        title: "Alert history enabled",
        _description: "New alerts will be tracked going forward.",
        _duration: 3000,
      });
    }
  };

  const handleSaveNotes = (alertId: string) => {
    localStorage.setItem(`alert_notes_${alertId}`, _notesText);
    setEditingNotes(null);
    setNotesText('');
    toast({
      title: "Notes saved",
      _description: "Your notes have been saved for this alert.",
      _duration: 2000,
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

    const _blob = new Blob([csvContent], { type: 'text/csv' });
    const _url = URL.createObjectURL(_blob);
    const a = document.createElement('a');
    a.href = _url;
    a.download = `alert-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(_url);

    toast({
      title: "Export complete",
      _description: "Alert history exported as CSV file.",
      _duration: 2000,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
      {/* Glass morphism header */}
      <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <History className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Alert History
            </h1>
          </motion.div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="overflow-hidden">
            <AlertHistoryHeader
              historyEnabled={historyEnabled}
              onToggleHistory={handleToggleHistory}
              onExportCSV={handleExportCSV}
              error={error}
            />
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/40 backdrop-blur-sm">
                <TabsTrigger value="overview" className="data-[state=active]:bg-white/80">Overview</TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-white/80">Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6 mt-6">
                <AlertHistoryStats alertHistory={alertHistory} />
                
                <AlertHistoryControls 
                  groupBy={groupBy}
                  onGroupByChange={setGroupBy}
                />

                <AlertHistoryList
                  groupedAlerts={groupedAlerts}
                  editingNotes={editingNotes}
                  _notesText={_notesText}
                  onSetEditingNotes={setEditingNotes}
                  onSetNotesText={setNotesText}
                  onSaveNotes={handleSaveNotes}
                  onCancelEdit={() => setEditingNotes(null)}
                />
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-6 mt-6">
                <AlertHistoryCharts
                  chartData={chartData}
                  chartPeriod={chartPeriod}
                  onChartPeriodChange={setChartPeriod}
                />
              </TabsContent>
            </Tabs>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default AlertHistory;

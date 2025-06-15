
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AlertRecord {
  id: string;
  timestamp: Date;
  message: string;
  recipients: string[];
  location?: string;
  notes?: string;
  type: 'sms' | 'push';
}

interface AlertHistoryStatsProps {
  alertHistory: AlertRecord[];
}

const AlertHistoryStats: React.FC<AlertHistoryStatsProps> = ({ alertHistory }) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const thisWeekAlerts = alertHistory.filter(alert => alert.timestamp >= weekAgo).length;
  
  const avgPerWeek = alertHistory.length > 0 ? 
    Math.round(alertHistory.length / Math.max(1, Math.ceil((Date.now() - alertHistory[alertHistory.length - 1]?.timestamp.getTime()) / (7 * 24 * 60 * 60 * 1000)))) : 0;

  return (
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
          <div className="text-2xl font-bold">{thisWeekAlerts}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Avg per Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgPerWeek}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertHistoryStats;

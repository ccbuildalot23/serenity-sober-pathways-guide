
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, MessageSquare, MapPin, Clock, User, Phone } from 'lucide-react';
import { getSentAlerts } from '@/services/mockSmsService';
import { getNotificationHistory } from '@/services/mockPushService';

interface Alert {
  id: string;
  contactName: string;
  message: string;
  location?: string;
  timestamp: Date;
  acknowledged: boolean;
  urgency: 'high' | 'medium' | 'low';
}

const SupporterDashboard = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Load alerts from both SMS and push notification history
    const loadAlerts = () => {
      const smsAlerts = getSentAlerts();
      const pushNotifications = getNotificationHistory();
      
      // Combine and transform alerts
      const combinedAlerts: Alert[] = [
        ...smsAlerts.map(alert => ({
          id: alert.id,
          contactName: 'Recovery Friend', // Simulating the sender's name from recipient perspective
          message: alert.message,
          location: alert.location,
          timestamp: alert.timestamp,
          acknowledged: false,
          urgency: determineUrgency(alert.message)
        })),
        ...pushNotifications.map(notif => ({
          id: notif.id,
          contactName: 'Recovery Friend',
          message: notif.message,
          location: notif.location,
          timestamp: notif.timestamp,
          acknowledged: false,
          urgency: determineUrgency(notif.message)
        }))
      ];

      // Sort by timestamp (newest first) and remove duplicates
      const uniqueAlerts = combinedAlerts
        .filter((alert, index, self) => 
          index === self.findIndex(a => a.message === alert.message && 
            Math.abs(a.timestamp.getTime() - alert.timestamp.getTime()) < 10000)
        )
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setAlerts(uniqueAlerts);
    };

    loadAlerts();
    
    // Refresh alerts every 5 seconds to simulate real-time updates
    const interval = setInterval(loadAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const determineUrgency = (message: string): 'high' | 'medium' | 'low' => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('urgent') || lowerMessage.includes('emergency') || lowerMessage.includes('🚨')) {
      return 'high';
    } else if (lowerMessage.includes('craving') || lowerMessage.includes('triggered')) {
      return 'medium';
    }
    return 'low';
  };

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    console.log('Alert acknowledged:', alertId);
  };

  const handleTextBack = (alertId: string) => {
    console.log('Opening chat for alert:', alertId);
    // This would open a chat interface in a real app
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'low': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Support Dashboard</h1>
          <p className="text-gray-600">You're viewing alerts as a supporter</p>
          <Badge variant="outline" className="mt-2">
            {alerts.filter(a => !a.acknowledged).length} unread alerts
          </Badge>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Phone className="w-5 h-5 mr-2 text-blue-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Phone className="w-4 h-4 mr-2" />
              Call Recovery Friend
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Encouragement
            </Button>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Alerts</h2>
          
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No alerts received yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Alerts sent from the main app will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            alerts.map(alert => (
              <Card 
                key={alert.id} 
                className={`border-l-4 ${
                  alert.urgency === 'high' ? 'border-l-red-500' :
                  alert.urgency === 'medium' ? 'border-l-orange-500' :
                  'border-l-blue-500'
                } ${alert.acknowledged ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="w-5 h-5 text-gray-600" />
                      <span className="font-medium">{alert.contactName}</span>
                      <Badge className={`text-xs ${getUrgencyColor(alert.urgency)}`}>
                        {alert.urgency.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimeAgo(alert.timestamp)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-800">{alert.message}</p>
                  </div>
                  
                  {alert.location && (
                    <div className="flex items-center text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="break-all">{alert.location}</span>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    {!alert.acknowledged ? (
                      <>
                        <Button 
                          onClick={() => handleAcknowledge(alert.id)}
                          className="flex-1"
                          size="sm"
                        >
                          ✓ Acknowledge
                        </Button>
                        <Button 
                          onClick={() => handleTextBack(alert.id)}
                          variant="outline"
                          className="flex-1"
                          size="sm"
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Text Back
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center text-sm text-green-600 bg-green-50 p-2 rounded w-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Acknowledged
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SupporterDashboard;

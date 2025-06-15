
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, MessageSquare, MapPin, Clock, User, Phone, CheckCircle, Heart, Shield, Activity, TrendingUp } from 'lucide-react';

interface Alert {
  id: string;
  contactName: string;
  message: string;
  location?: string;
  timestamp: Date;
  acknowledged: boolean;
  urgency: 'high' | 'medium' | 'low';
  type: 'crisis' | 'check-in' | 'milestone';
  responseTime?: number;
}

interface QuickResponse {
  id: string;
  text: string;
  emoji: string;
}

const quickResponses: QuickResponse[] = [
  { id: '1', text: "I'm here for you", emoji: '💙' },
  { id: '2', text: "You've got this!", emoji: '💪' },
  { id: '3', text: "Calling you now", emoji: '📞' },
  { id: '4', text: "On my way", emoji: '🚗' },
  { id: '5', text: "Stay strong", emoji: '🌟' },
  { id: '6', text: "I believe in you", emoji: '🤗' }
];

const SupporterDashboard = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'crisis'>('all');
  const [responseMessage, setResponseMessage] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAlerts: 0,
    responseRate: 0,
    avgResponseTime: 0,
    supportStreak: 0
  });

  useEffect(() => {
    // Load mock alerts
    loadAlerts();
    calculateStats();
    
    // Simulate real-time updates
    const interval = setInterval(() => {
      loadAlerts();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = () => {
    // Mock data - in production, this would fetch from your backend
    const mockAlerts: Alert[] = [
      {
        id: '1',
        contactName: 'John D.',
        message: '🚨 URGENT: Having strong cravings right now. Really need support.',
        location: 'https://maps.google.com/?q=37.7749,-122.4194',
        timestamp: new Date(Date.now() - 5 * 60000),
        acknowledged: false,
        urgency: 'high',
        type: 'crisis'
      },
      {
        id: '2',
        contactName: 'Sarah M.',
        message: 'Just wanted to check in. Today marks 30 days clean! 🎉',
        timestamp: new Date(Date.now() - 2 * 60 * 60000),
        acknowledged: true,
        urgency: 'low',
        type: 'milestone',
        responseTime: 15
      },
      {
        id: '3',
        contactName: 'Mike R.',
        message: 'Feeling a bit down today. Could use some encouragement.',
        timestamp: new Date(Date.now() - 30 * 60000),
        acknowledged: false,
        urgency: 'medium',
        type: 'check-in'
      }
    ];
    
    setAlerts(mockAlerts);
  };

  const calculateStats = () => {
    setStats({
      totalAlerts: 24,
      responseRate: 92,
      avgResponseTime: 8,
      supportStreak: 15
    });
  };

  const getFilteredAlerts = () => {
    switch (filter) {
      case 'unread':
        return alerts.filter(a => !a.acknowledged);
      case 'crisis':
        return alerts.filter(a => a.type === 'crisis');
      default:
        return alerts;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-400 dark:text-red-300';
      case 'medium': return 'bg-orange-100 border-orange-500 text-orange-800 dark:bg-orange-900/30 dark:border-orange-400 dark:text-orange-300';
      case 'low': return 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-400 dark:text-green-300';
      default: return 'bg-gray-100 border-gray-500 text-gray-800 dark:bg-gray-900/30 dark:border-gray-400 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crisis': return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'milestone': return <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default: return <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
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

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true, responseTime: Math.floor(Math.random() * 10) + 1 }
        : alert
    ));
  };

  const handleQuickResponse = (alertId: string, response: QuickResponse) => {
    setResponseMessage(response.text);
    handleSendResponse(alertId, response.text + ' ' + response.emoji);
  };

  const handleSendResponse = (alertId: string, message: string) => {
    console.log(`Sending response to alert ${alertId}: ${message}`);
    handleAcknowledge(alertId);
    setResponseMessage('');
    setSelectedAlert(null);
    
    // Show success toast (you'd use your toast system here)
    alert(`Response sent: "${message}"`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Supporter Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Help your recovery partners stay strong</p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2 dark:border-gray-600 dark:text-gray-300">
              <Activity className="w-5 h-5 mr-2" />
              {alerts.filter(a => !a.acknowledged).length} Active Alerts
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white animate-slide-up hover-lift">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Total Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalAlerts}</p>
              <p className="text-blue-100 text-sm">This month</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white animate-slide-up hover-lift" style={{ animationDelay: '100ms' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Response Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.responseRate}%</p>
              <p className="text-green-100 text-sm">Keep it up!</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white animate-slide-up hover-lift" style={{ animationDelay: '200ms' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Avg Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.avgResponseTime}m</p>
              <p className="text-purple-100 text-sm">Great timing!</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white animate-slide-up hover-lift" style={{ animationDelay: '300ms' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Heart className="w-5 h-5 mr-2" />
                Support Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.supportStreak}</p>
              <p className="text-orange-100 text-sm">Days active</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 flex space-x-2 animate-fade-in">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'default' : 'ghost'}
            className="flex-1"
          >
            All Alerts
          </Button>
          <Button
            onClick={() => setFilter('unread')}
            variant={filter === 'unread' ? 'default' : 'ghost'}
            className="flex-1"
          >
            Unread ({alerts.filter(a => !a.acknowledged).length})
          </Button>
          <Button
            onClick={() => setFilter('crisis')}
            variant={filter === 'crisis' ? 'default' : 'ghost'}
            className="flex-1"
          >
            Crisis Only
          </Button>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {getFilteredAlerts().length === 0 ? (
            <Card className="text-center py-12 dark:bg-gray-800 animate-fade-in">
              <CardContent>
                <AlertTriangle className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No alerts to show</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {filter === 'unread' ? 'All alerts have been acknowledged!' : 'No alerts in this category yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            getFilteredAlerts().map((alert, index) => (
              <Card 
                key={alert.id} 
                className={`border-l-4 ${
                  alert.urgency === 'high' ? 'border-l-red-500' :
                  alert.urgency === 'medium' ? 'border-l-orange-500' :
                  'border-l-green-500'
                } ${alert.acknowledged ? 'opacity-75' : ''} hover:shadow-lg transition-shadow dark:bg-gray-800 animate-fade-in hover-lift`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(alert.type)}
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{alert.contactName}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`text-xs ${getUrgencyColor(alert.urgency)}`}>
                            {alert.urgency.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTimeAgo(alert.timestamp)}
                          </span>
                          {alert.responseTime && (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Responded in {alert.responseTime}m
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{alert.message}</p>
                  </div>
                  
                  {alert.location && (
                    <Button 
                      variant="outline"
                      className="w-full justify-start text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                      onClick={() => window.open(alert.location, '_blank')}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      View Location on Map
                    </Button>
                  )}
                  
                  {!alert.acknowledged ? (
                    <>
                      {/* Quick Responses */}
                      <div className="grid grid-cols-3 gap-2">
                        {quickResponses.slice(0, 3).map(response => (
                          <Button
                            key={response.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickResponse(alert.id, response)}
                            className="text-xs hover:scale-105 transition-transform"
                          >
                            {response.emoji} {response.text}
                          </Button>
                        ))}
                      </div>
                      
                      {/* Custom Response */}
                      {selectedAlert === alert.id ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Type your message..."
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && responseMessage.trim()) {
                                handleSendResponse(alert.id, responseMessage);
                              }
                            }}
                            className="dark:bg-gray-700 dark:border-gray-600"
                          />
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => handleSendResponse(alert.id, responseMessage)}
                              disabled={!responseMessage.trim()}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              Send Response
                            </Button>
                            <Button 
                              onClick={() => {
                                setSelectedAlert(null);
                                setResponseMessage('');
                              }}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => handleAcknowledge(alert.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Acknowledge
                          </Button>
                          <Button 
                            onClick={() => setSelectedAlert(alert.id)}
                            variant="outline"
                            className="flex-1"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Custom Response
                          </Button>
                          {alert.urgency === 'high' && (
                            <Button 
                              onClick={() => window.open(`tel:${alert.contactName}`)}
                              className="bg-red-600 hover:bg-red-700 animate-gentle-pulse"
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                      <span className="text-green-700 dark:text-green-300 font-medium">Alert Acknowledged</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Heart className="w-5 h-5 mr-2 text-pink-600 dark:text-pink-400 animate-pulse-subtle" />
              Encourage Your Recovery Partners
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Send a supportive message to all your recovery partners:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickResponses.map(response => (
                <Button
                  key={response.id}
                  variant="outline"
                  className="justify-start bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 transition-all"
                  onClick={() => alert(`Sending to all: "${response.text} ${response.emoji}"`)}
                >
                  {response.emoji} {response.text}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupporterDashboard;

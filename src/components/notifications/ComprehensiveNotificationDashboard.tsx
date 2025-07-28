import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  FileText, 
  BarChart3, 
  Bell,
  Users,
  Send,
  Eye,
  MousePointer,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react';
import { NotificationPreferencesManager } from './NotificationPreferencesManager';
import { NotificationTemplateManager } from './NotificationTemplateManager';
import { NotificationAnalyticsDashboard } from './NotificationAnalyticsDashboard';

interface QuickStats {
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  activeTemplates: number;
  queuedNotifications: number;
}

export function ComprehensiveNotificationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock quick stats - in real implementation, this would come from the service
  const quickStats: QuickStats = {
    totalSent: 1247,
    deliveryRate: 94.2,
    openRate: 68.5,
    clickRate: 12.3,
    activeTemplates: 15,
    queuedNotifications: 23
  };

  const recentActivity = [
    {
      id: '1',
      type: 'check_in',
      message: 'Daily check-in reminder sent',
      count: 156,
      time: '2 hours ago',
      status: 'success'
    },
    {
      id: '2',
      type: 'appointment',
      message: 'Appointment reminders for tomorrow',
      count: 42,
      time: '4 hours ago',
      status: 'success'
    },
    {
      id: '3',
      type: 'crisis',
      message: 'Crisis alert template activated',
      count: 3,
      time: '6 hours ago',
      status: 'warning'
    },
    {
      id: '4',
      type: 'community',
      message: 'Community digest notifications',
      count: 89,
      time: '1 day ago',
      status: 'success'
    }
  ];

  const upcomingScheduled = [
    {
      id: '1',
      title: 'Weekly Progress Summary',
      type: 'check_in',
      scheduledFor: 'Tomorrow, 9:00 AM',
      recipients: 234,
      channels: ['email', 'in_app']
    },
    {
      id: '2',
      title: 'Goal Deadline Reminder',
      type: 'goal_deadline',
      scheduledFor: 'Friday, 2:00 PM',
      recipients: 67,
      channels: ['in_app', 'push']
    },
    {
      id: '3',
      title: 'Provider Message Alert',
      type: 'provider',
      scheduledFor: 'Next Monday, 10:00 AM',
      recipients: 156,
      channels: ['email', 'sms']
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      check_in: 'bg-blue-100 text-blue-800',
      appointment: 'bg-green-100 text-green-800',
      crisis: 'bg-red-100 text-red-800',
      community: 'bg-purple-100 text-purple-800',
      goal_deadline: 'bg-orange-100 text-orange-800',
      provider: 'bg-indigo-100 text-indigo-800',
      system: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notification Management
          </CardTitle>
          <CardDescription>
            Comprehensive notification infrastructure with multi-channel delivery, analytics, and smart features
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sent</p>
                    <p className="text-xl font-bold">{quickStats.totalSent.toLocaleString()}</p>
                  </div>
                  <Send className="w-6 h-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
                    <p className="text-xl font-bold">{quickStats.deliveryRate}%</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Open Rate</p>
                    <p className="text-xl font-bold">{quickStats.openRate}%</p>
                  </div>
                  <Eye className="w-6 h-6 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Click Rate</p>
                    <p className="text-xl font-bold">{quickStats.clickRate}%</p>
                  </div>
                  <MousePointer className="w-6 h-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Templates</p>
                    <p className="text-xl font-bold">{quickStats.activeTemplates}</p>
                  </div>
                  <FileText className="w-6 h-6 text-indigo-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Queued</p>
                    <p className="text-xl font-bold">{quickStats.queuedNotifications}</p>
                  </div>
                  <Clock className="w-6 h-6 text-gray-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest notification sending activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(activity.status)}
                        <div>
                          <p className="font-medium">{activity.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className={getTypeColor(activity.type)}>
                              {activity.type.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {activity.count} recipients
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Scheduled */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Scheduled</CardTitle>
                <CardDescription>Notifications scheduled for delivery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingScheduled.map((scheduled) => (
                    <div key={scheduled.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{scheduled.title}</h4>
                        <Badge variant="outline" className={getTypeColor(scheduled.type)}>
                          {scheduled.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {scheduled.scheduledFor}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {scheduled.recipients} recipients
                        </div>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {scheduled.channels.map((channel) => (
                          <Badge key={channel} variant="secondary" className="text-xs">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <NotificationPreferencesManager />
        </TabsContent>

        <TabsContent value="templates">
          <NotificationTemplateManager />
        </TabsContent>

        <TabsContent value="analytics">
          <NotificationAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
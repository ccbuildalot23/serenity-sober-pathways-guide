import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Bell,
  Eye,
  MousePointer,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  comprehensiveNotificationService, 
  type NotificationAnalytics 
} from '@/services/comprehensiveNotificationService';

interface ChannelMetric {
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

interface TimeSeriesData {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
}

interface TypeMetric {
  type: string;
  count: number;
  engagement: number;
  color: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff'];

const channelIcons = {
  in_app: <Bell className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  sms: <MessageSquare className="w-4 h-4" />,
  push: <Smartphone className="w-4 h-4" />
};

export function NotificationAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(null);
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetric[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [typeMetrics, setTypeMetrics] = useState<TypeMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedChannel]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = getStartDate(dateRange);
      const endDate = new Date();

      // Load overall analytics
      const overallAnalytics = await comprehensiveNotificationService.getNotificationAnalytics(
        user.id,
        startDate,
        endDate
      );
      setAnalytics(overallAnalytics);

      // Load detailed analytics from database
      await loadDetailedAnalytics(user.id, startDate, endDate);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedAnalytics = async (userId: string, startDate: Date, endDate: Date) => {
    try {
      let query = supabase
        .from('notification_analytics')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (selectedChannel !== 'all') {
        query = query.eq('channel', selectedChannel);
      }

      const { data: analyticsData } = await query;

      if (analyticsData) {
        // Process channel metrics
        const channelStats = processChannelMetrics(analyticsData);
        setChannelMetrics(channelStats);

        // Process time series data
        const timeStats = processTimeSeriesData(analyticsData);
        setTimeSeriesData(timeStats);

        // Process type metrics
        const typeStats = processTypeMetrics(analyticsData);
        setTypeMetrics(typeStats);
      }
    } catch (error) {
      console.error('Failed to load detailed analytics:', error);
    }
  };

  const processChannelMetrics = (data: any[]): ChannelMetric[] => {
    const channels = ['in_app', 'email', 'sms', 'push'];
    
    return channels.map(channel => {
      const channelData = data.filter(d => d.channel === channel);
      const sent = channelData.filter(d => d.event_type === 'sent').length;
      const delivered = channelData.filter(d => d.event_type === 'delivered').length;
      const opened = channelData.filter(d => d.event_type === 'opened').length;
      const clicked = channelData.filter(d => d.event_type === 'clicked').length;

      return {
        channel,
        sent,
        delivered,
        opened,
        clicked,
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
        openRate: sent > 0 ? (opened / sent) * 100 : 0,
        clickRate: opened > 0 ? (clicked / opened) * 100 : 0
      };
    }).filter(metric => metric.sent > 0);
  };

  const processTimeSeriesData = (data: any[]): TimeSeriesData[] => {
    const dateMap = new Map<string, TimeSeriesData>();
    
    data.forEach(item => {
      const date = new Date(item.timestamp).toISOString().split('T')[0];
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          failed: 0
        });
      }
      
      const dayData = dateMap.get(date)!;
      if (item.event_type === 'sent') dayData.sent++;
      else if (item.event_type === 'delivered') dayData.delivered++;
      else if (item.event_type === 'opened') dayData.opened++;
      else if (item.event_type === 'clicked') dayData.clicked++;
      else if (item.event_type === 'failed') dayData.failed++;
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const processTypeMetrics = (data: any[]): TypeMetric[] => {
    const types = ['check_in', 'goal_deadline', 'appointment', 'crisis', 'community', 'provider', 'system'];
    
    return types.map((type, index) => {
      const typeData = data.filter(d => d.type === type);
      const sent = typeData.filter(d => d.event_type === 'sent').length;
      const engaged = typeData.filter(d => ['opened', 'clicked'].includes(d.event_type)).length;

      return {
        type,
        count: sent,
        engagement: sent > 0 ? (engaged / sent) * 100 : 0,
        color: COLORS[index % COLORS.length]
      };
    }).filter(metric => metric.count > 0);
  };

  const getStartDate = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notification Analytics</CardTitle>
              <CardDescription>
                Track delivery performance and user engagement across all notification channels
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last Day</SelectItem>
                  <SelectItem value="7d">Last Week</SelectItem>
                  <SelectItem value="30d">Last Month</SelectItem>
                  <SelectItem value="90d">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="in_app">In-App</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadAnalytics}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sent</p>
                  <p className="text-2xl font-bold">{formatNumber(analytics.sent_count)}</p>
                </div>
                <Send className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Rate</p>
                  <p className="text-2xl font-bold">{formatPercentage(analytics.delivery_rate)}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                  <p className="text-2xl font-bold">{formatPercentage(analytics.open_rate)}</p>
                </div>
                <Eye className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Engagement Score</p>
                  <p className="text-2xl font-bold">{formatPercentage(analytics.engagement_score)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
                <CardDescription>Notification volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="sent" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="opened" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                    <Area type="monotone" dataKey="clicked" stackId="1" stroke="#ffc658" fill="#ffc658" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Types</CardTitle>
                <CardDescription>Distribution by notification type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={typeMetrics}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {typeMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4">
                  {typeMetrics.map((metric, index) => (
                    <div key={metric.type} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: metric.color }}
                      />
                      <span className="text-sm">{metric.type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance</CardTitle>
              <CardDescription>Delivery and engagement metrics by channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channelMetrics.map((metric) => (
                  <div key={metric.channel} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {channelIcons[metric.channel as keyof typeof channelIcons]}
                        <h4 className="font-medium capitalize">{metric.channel}</h4>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {metric.sent} sent
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Delivery Rate</div>
                        <div className="text-lg font-semibold text-green-600">
                          {formatPercentage(metric.deliveryRate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Open Rate</div>
                        <div className="text-lg font-semibold text-blue-600">
                          {formatPercentage(metric.openRate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Click Rate</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {formatPercentage(metric.clickRate)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Type Engagement</CardTitle>
              <CardDescription>User engagement by notification type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={typeMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="engagement" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Trends</CardTitle>
              <CardDescription>Track performance changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sent" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="opened" stroke="#82ca9d" strokeWidth={2} />
                  <Line type="monotone" dataKey="clicked" stroke="#ffc658" strokeWidth={2} />
                  <Line type="monotone" dataKey="failed" stroke="#ff7300" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
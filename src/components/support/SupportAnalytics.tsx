
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, TrendingUp, Users, Clock, Heart, 
  Shield, AlertTriangle, MessageSquare, Phone,
  Calendar, BarChart3, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAnalytics } from '@/services/analyticsService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SupportAnalyticsProps {
  onBack?: () => void;
}

const SupportAnalytics: React.FC<SupportAnalyticsProps> = ({ onBack }) => {
  const [timeRange, setTimeRange] = useState(30); // days
  const { metrics, engagement, insights, loading, reload } = useAnalytics();

  React.useEffect(() => {
    reload(timeRange);
  }, [timeRange, reload]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Analyzing your support network...</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { color: 'bg-green-100 text-green-800', text: 'Excellent' };
    if (score >= 60) return { color: 'bg-yellow-100 text-yellow-800', text: 'Good' };
    if (score >= 40) return { color: 'bg-orange-100 text-orange-800', text: 'Fair' };
    return { color: 'bg-red-100 text-red-800', text: 'Needs Attention' };
  };

  const formatResponseTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${Math.round(minutes / 60)}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Support Network Analytics</h2>
            <p className="text-purple-100">
              Insights to strengthen your recovery support system
            </p>
          </div>
          {onBack && (
            <Button onClick={onBack} variant="secondary" size="sm">
              ← Back
            </Button>
          )}
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-center space-x-2">
        <Button
          onClick={() => setTimeRange(7)}
          variant={timeRange === 7 ? 'default' : 'outline'}
          size="sm"
        >
          7 Days
        </Button>
        <Button
          onClick={() => setTimeRange(30)}
          variant={timeRange === 30 ? 'default' : 'outline'}
          size="sm"
        >
          30 Days
        </Button>
        <Button
          onClick={() => setTimeRange(90)}
          variant={timeRange === 90 ? 'default' : 'outline'}
          size="sm"
        >
          90 Days
        </Button>
      </div>

      {/* Network Health Score */}
      {metrics && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                Network Health Score
              </span>
              <Badge className={getScoreBadge(metrics.supportNetworkHealth).color}>
                {getScoreBadge(metrics.supportNetworkHealth).text}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-end justify-between mb-2">
                  <span className={`text-5xl font-bold ${getScoreColor(metrics.supportNetworkHealth)}`}>
                    {metrics.supportNetworkHealth}
                  </span>
                  <span className="text-gray-500 text-lg">/100</span>
                </div>
                <Progress value={metrics.supportNetworkHealth} className="h-4" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-gray-800">{metrics.totalContacts}</p>
                  <p className="text-sm text-gray-600">Total Contacts</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{metrics.activeContacts}</p>
                  <p className="text-sm text-gray-600">Active Contacts</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-blue-600" />
                Crisis Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metrics.alertsSent}</p>
              <p className="text-xs text-gray-600">Last {timeRange} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Heart className="w-4 h-4 mr-2 text-green-600" />
                Resolution Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {metrics.alertsSent > 0 
                  ? Math.round((metrics.alertsAcknowledged / metrics.alertsSent) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-gray-600">
                {metrics.alertsAcknowledged} of {metrics.alertsSent}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Clock className="w-4 h-4 mr-2 text-purple-600" />
                Avg Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatResponseTime(metrics.averageResponseTime)}
              </p>
              <p className="text-xs text-gray-600">Response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
                Crisis Resolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metrics.crisisEventsResolved}</p>
              <p className="text-xs text-gray-600">Successfully managed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contact Engagement */}
      {engagement && engagement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-600" />
              Contact Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {engagement
                .sort((a, b) => b.supportScore - a.supportScore)
                .map((contact, index) => (
                  <div key={contact.contactId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                        index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                        'bg-gradient-to-br from-blue-400 to-purple-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{contact.contactName}</p>
                        <div className="flex items-center space-x-3 text-xs text-gray-600">
                          <span className="flex items-center">
                            <Activity className="w-3 h-3 mr-1" />
                            {contact.interactionCount} interactions
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatResponseTime(contact.averageResponseTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${getScoreColor(contact.supportScore)}`}>
                        {contact.supportScore}
                      </p>
                      <p className="text-xs text-gray-600">Support Score</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Insights */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Usage Patterns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Most Active Time</p>
                <p className="text-xl font-semibold">{insights.mostActiveTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Preferred Contact Method</p>
                <div className="flex items-center">
                  {insights.preferredContactMethod === 'sms' && <MessageSquare className="w-5 h-5 mr-2" />}
                  {insights.preferredContactMethod === 'call' && <Phone className="w-5 h-5 mr-2" />}
                  <p className="text-xl font-semibold capitalize">{insights.preferredContactMethod}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Recovery Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.recoveryProgress && insights.recoveryProgress.length > 0 ? (
                <div className="space-y-2">
                  {insights.recoveryProgress.slice(-3).map((progress, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{progress.date}</span>
                      <div className="flex items-center">
                        <span className={`font-semibold ${getScoreColor(progress.score)}`}>
                          {progress.score}%
                        </span>
                        {index > 0 && (
                          insights.recoveryProgress[index].score > insights.recoveryProgress[index - 1].score
                            ? <ArrowUp className="w-4 h-4 ml-1 text-green-600" />
                            : <ArrowDown className="w-4 h-4 ml-1 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No progress data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Crisis Patterns */}
      {insights && insights.crisisPatterns && insights.crisisPatterns.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Crisis Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.crisisPatterns.map((pattern, index) => (
                <div key={index} className="p-3 bg-white rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{pattern.time}</span>
                    <Badge variant="outline" className="bg-orange-100">
                      {pattern.frequency} events
                    </Badge>
                  </div>
                  {pattern.triggers && pattern.triggers.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Common triggers: {pattern.triggers.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {metrics && metrics.totalContacts < 3 && (
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Add more support contacts (aim for at least 3-5)</span>
              </li>
            )}
            {metrics && metrics.alertsSent > 0 && (metrics.alertsAcknowledged / metrics.alertsSent) < 0.5 && (
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Consider reaching out to contacts who haven't been responsive</span>
              </li>
            )}
            {engagement && engagement.some(e => e.supportScore < 50) && (
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Re-engage with contacts who have low support scores</span>
              </li>
            )}
            {insights && insights.crisisPatterns && insights.crisisPatterns.length > 0 && (
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span>Plan extra support during your vulnerable times</span>
              </li>
            )}
            {(!metrics || metrics.supportNetworkHealth >= 80) && (
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>Your support network is functioning well! Keep up the great work.</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Generate Report Button */}
      <div className="text-center">
        <Button 
          onClick={async () => {
            const { analyticsService } = await import('@/services/analyticsService');
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const report = await analyticsService.generateInsightsReport(user.id);
              console.log(report);
              toast.success("Report Generated", {
                description: "Your insights report has been created",
              });
            }
          }}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <BarChart3 className="w-5 h-5 mr-2" />
          Generate Full Report
        </Button>
      </div>
    </div>
  );
};

export default SupportAnalytics;

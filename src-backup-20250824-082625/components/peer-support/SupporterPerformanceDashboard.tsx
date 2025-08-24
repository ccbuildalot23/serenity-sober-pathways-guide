import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  TrendingUp, Star, Clock, AlertTriangle, 
  Flag, MessageSquare, Users, BarChart3,
  CheckCircle, XCircle, Calendar, Award
} from 'lucide-react';
import { enhancedPeerSupportService } from '@/services/enhancedPeerSupportService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SessionData {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  user_rating?: number;
  escalated_to_crisis: boolean;
  _status: string;
}

const SupporterPerformanceDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<unknown>(null);
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [flagType, setFlagType] = useState<string>('');
  const [_flagDescription, setFlagDescription] = useState('');
  const [sessionSummary, setSessionSummary] = useState('');
  const [_dateRange, setDateRange] = useState('7'); // days
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadMetrics();
      loadRecentSessions();
    }
  }, [user, _dateRange]);

  const loadMetrics = async () => {
    if (!user) return;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(_dateRange));

      const metricsData = await enhancedPeerSupportService.getSupporterMetrics(user.id, {
        start: startDate,
        end: endDate
      });
      
      setMetrics(metricsData[0] || {});
    } catch (_error) {
      console._error('Failed to load metrics:', _error);
    }
  };

  const loadRecentSessions = async () => {
    if (!user) return;

    try {
      // Load recent sessions from supabase directly
      const sessions = await enhancedPeerSupportService.getSupporterMetrics(user.id, {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      });
      
      // Simulate some session data
      const _mockSessions: SessionData[] = [
        {
          id: '1',
          user_id: 'user1',
          started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 45,
          user_rating: 5,
          escalated_to_crisis: false,
          _status: 'ended'
        },
        {
          id: '2',
          user_id: 'user2',
          started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 30,
          user_rating: 4,
          escalated_to_crisis: false,
          _status: 'ended'
        },
        {
          id: '3',
          user_id: 'user3',
          started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          ended_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60,
          user_rating: 3,
          escalated_to_crisis: true,
          _status: 'escalated'
        }
      ];
      
      setRecentSessions(_mockSessions);
    } catch (_error) {
      console._error('Failed to load recent sessions:', _error);
    }
  };

  const generateSessionSummary = async (_sessionId: string) => {
    setLoading(true);
    try {
      const summary = await enhancedPeerSupportService.generateSessionSummary(_sessionId);
      setSessionSummary(summary);
      await enhancedPeerSupportService.saveSesssionSummary(_sessionId, summary);
      toast.success('Session summary generated');
    } catch (_error) {
      console._error('Failed to generate summary:', _error);
      toast._error('Failed to generate session summary');
    }
    setLoading(false);
  };

  const flagSession = async () => {
    if (!selectedSession || !flagType || !_flagDescription || !user) return;

    setLoading(true);
    try {
      await enhancedPeerSupportService.flagSession(
        selectedSession.id,
        flagType as any,
        'medium',
        _flagDescription,
        user.id
      );
      
      toast.success('Session flagged for review');
      setFlagType('');
      setFlagDescription('');
      setSelectedSession(null);
    } catch (_error) {
      console._error('Failed to flag session:', _error);
      toast._error('Failed to flag session');
    }
    setLoading(false);
  };

  const updateMetrics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await enhancedPeerSupportService.updateSupporterMetrics(user.id);
      await loadMetrics();
      toast.success('Metrics updated');
    } catch (_error) {
      console._error('Failed to update metrics:', _error);
      toast._error('Failed to update metrics');
    }
    setLoading(false);
  };

  const getStatusColor = (_status: string) => {
    switch (_status) {
      case 'ended': return 'bg-green-500';
      case 'escalated': return 'bg-red-500';
      case 'active': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-800">Performance Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select onValueChange={setDateRange} defaultValue="7">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={updateMetrics} disabled={loading}>
            Refresh Metrics
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{metrics?.total_sessions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold">
                  {metrics?.average_rating ? metrics.average_rating.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Escalation Rate</p>
                <p className="text-2xl font-bold">
                  {metrics?.escalation_rate ? `${(metrics.escalation_rate * 100).toFixed(1)}%` : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Performance Score</p>
                <p className="text-2xl font-bold">
                  {metrics?.average_rating ? Math.round(metrics.average_rating * 20) : 0}/100
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSessions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No recent sessions</p>
            ) : (
              recentSessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSession?.id === session.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(session._status)} text-white`}>
                        {session._status}
                      </Badge>
                      {session.escalated_to_crisis && (
                        <Badge variant="destructive">Crisis</Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {session.duration_minutes}min
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {new Date(session.started_at).toLocaleString()}
                    </span>
                    {session.user_rating && (
                      <div className="flex items-center gap-1">
                        {getRatingStars(session.user_rating)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Session Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Session Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSession ? (
              <>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Selected Session</p>
                  <p className="text-xs text-blue-600">
                    {new Date(selectedSession.started_at).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => generateSessionSummary(selectedSession.id)}
                    disabled={loading}
                    className="w-full"
                  >
                    Generate Summary
                  </Button>

                  {sessionSummary && (
                    <div className="p-3 bg-gray-50 rounded-lg text-sm">
                      {sessionSummary}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Select onValueChange={setFlagType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Flag type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safety_concern">Safety Concern</SelectItem>
                        <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                        <SelectItem value="crisis_indicator">Crisis Indicator</SelectItem>
                        <SelectItem value="quality_issue">Quality Issue</SelectItem>
                      </SelectContent>
                    </Select>

                    <Textarea
                      placeholder="Describe the issue..."
                      value={_flagDescription}
                      onChange={(e) => setFlagDescription(e.target.value)}
                      rows={3}
                    />

                    <Button
                      onClick={flagSession}
                      disabled={!flagType || !_flagDescription || loading}
                      variant="destructive"
                      className="w-full"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Flag Session
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500 py-8">
                Select a session to access tools
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">Strengths</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  High user satisfaction ratings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Consistent session quality
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Good response time
                </li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-orange-700">Areas for Improvement</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Consider additional crisis training
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Practice active listening techniques
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupporterPerformanceDashboard;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Heart, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Settings
} from 'lucide-react';
import FollowUpSystem from './FollowUpSystem';

interface CrisisResolution {
  id: string;
  userId: string;
  crisisStartTime: Date;
  resolutionTime: Date;
  interventionsUsed: string[];
  effectivenessRating: number;
  additionalNotes: string;
  safetyConfirmed: boolean;
}

interface CheckInResponse {
  id: string;
  taskId: string;
  timestamp: Date;
  moodRating: number;
  notes: string;
  needsSupport: boolean;
}

const FollowUpDashboard = () => {
  const [crisisHistory, setCrisisHistory] = useState<CrisisResolution[]>([]);
  const [checkInHistory, setCheckInHistory] = useState<CheckInResponse[]>([]);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [activeView, setActiveView] = useState<'overview' | 'pending' | 'history'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load crisis resolutions
    const resolutions = JSON.parse(localStorage.getItem('crisisResolutions') || '[]');
    setCrisisHistory(resolutions);

    // Load check-in responses
    const responses = JSON.parse(localStorage.getItem('checkInResponses') || '[]');
    setCheckInHistory(responses);

    // Count pending tasks
    const tasks = JSON.parse(localStorage.getItem('followUpTasks') || '[]');
    const now = new Date();
    const pending = tasks.filter((task: any) => {
      const scheduledTime = new Date(task.scheduled);
      return !task.completed && scheduledTime <= now;
    });
    setPendingTasksCount(pending.length);
  };

  const getAverageMood = () => {
    if (checkInHistory.length === 0) return 0;
    const total = checkInHistory.reduce((sum, response) => sum + response.moodRating, 0);
    return Math.round((total / checkInHistory.length) * 10) / 10;
  };

  const getRecentTrend = () => {
    if (checkInHistory.length < 2) return 'stable';
    
    const recent = checkInHistory.slice(-3);
    const older = checkInHistory.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, r) => sum + r.moodRating, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.moodRating, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.5) return 'improving';
    if (recentAvg < olderAvg - 0.5) return 'declining';
    return 'stable';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'declining':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  if (activeView === 'pending') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setActiveView('overview')}
            variant="outline"
            size="sm"
          >
            ← Back to Overview
          </Button>
        </div>
        <FollowUpSystem />
      </div>
    );
  }

  if (activeView === 'history') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => setActiveView('overview')}
            variant="outline"
            size="sm"
          >
            ← Back to Overview
          </Button>
          <h3 className="text-lg font-semibold">Crisis & Check-in History</h3>
        </div>

        <div className="space-y-4">
          {crisisHistory.length === 0 && checkInHistory.length === 0 ? (
            <Card className="p-6 text-center">
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-600 mb-2">No history yet</h4>
              <p className="text-sm text-gray-500">
                Your crisis resolutions and check-in responses will appear here
              </p>
            </Card>
          ) : (
            <>
              {/* Crisis Resolutions */}
              {crisisHistory.map((resolution) => (
                <Card key={resolution.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-green-600">Crisis Resolved</span>
                          <Badge variant="outline" className="text-xs">
                            {resolution.effectivenessRating}/10 effectiveness
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(resolution.resolutionTime).toLocaleString()}
                        </p>
                        {resolution.interventionsUsed.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {resolution.interventionsUsed.map((intervention, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {intervention}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {resolution.additionalNotes && (
                          <p className="text-sm text-gray-700 italic">
                            "{resolution.additionalNotes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Check-in Responses */}
              {checkInHistory.map((response) => (
                <Card key={response.id} className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Heart className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-blue-600">Check-in</span>
                          <Badge variant="outline" className="text-xs">
                            Mood: {response.moodRating}/10
                          </Badge>
                          {response.needsSupport && (
                            <Badge className="bg-orange-500 text-xs">
                              Needed Support
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(response.timestamp).toLocaleString()}
                        </p>
                        {response.notes && (
                          <p className="text-sm text-gray-700 italic">
                            "{response.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Follow-up Dashboard</h3>
        <Button
          onClick={() => setActiveView('history')}
          variant="outline"
          size="sm"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View History
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Tasks */}
        <Card className={pendingTasksCount > 0 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Check-ins</p>
                <p className={`text-2xl font-bold ${pendingTasksCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {pendingTasksCount}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                pendingTasksCount > 0 ? 'bg-orange-100' : 'bg-green-100'
              }`}>
                {pendingTasksCount > 0 ? (
                  <Clock className="w-6 h-6 text-orange-600" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                )}
              </div>
            </div>
            {pendingTasksCount > 0 && (
              <Button
                onClick={() => setActiveView('pending')}
                size="sm"
                className="w-full mt-3 bg-orange-600 hover:bg-orange-700"
              >
                Complete Check-ins
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Average Mood */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Mood</p>
                <p className="text-2xl font-bold text-blue-600">
                  {getAverageMood()}/10
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card className={`border ${getTrendColor(getRecentTrend())}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Trend</p>
                <p className={`text-lg font-semibold capitalize ${getRecentTrend() === 'improving' ? 'text-green-600' : getRecentTrend() === 'declining' ? 'text-red-600' : 'text-blue-600'}`}>
                  {getRecentTrend()}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                getRecentTrend() === 'improving' ? 'bg-green-100' : 
                getRecentTrend() === 'declining' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {getTrendIcon(getRecentTrend())}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingTasksCount > 0 && (
            <Button
              onClick={() => setActiveView('pending')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Clock className="w-4 h-4 mr-2" />
              Complete {pendingTasksCount} Pending Check-in{pendingTasksCount > 1 ? 's' : ''}
            </Button>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setActiveView('history')}
              variant="outline"
              className="w-full"
            >
              <Calendar className="w-4 h-4 mr-2" />
              View History
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {(crisisHistory.length > 0 || checkInHistory.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                ...crisisHistory.map(item => ({ ...item, type: 'crisis' as const })),
                ...checkInHistory.map(item => ({ ...item, type: 'checkin' as const }))
              ]
                .sort((a, b) => {
                  const aTime = a.type === 'crisis' ? new Date(a.resolutionTime).getTime() : new Date(a.timestamp).getTime();
                  const bTime = b.type === 'crisis' ? new Date(b.resolutionTime).getTime() : new Date(b.timestamp).getTime();
                  return bTime - aTime;
                })
                .slice(0, 3)
                .map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                    {item.type === 'crisis' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Crisis resolved</p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.resolutionTime).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.effectivenessRating}/10
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Check-in completed</p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.moodRating}/10
                        </Badge>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FollowUpDashboard;

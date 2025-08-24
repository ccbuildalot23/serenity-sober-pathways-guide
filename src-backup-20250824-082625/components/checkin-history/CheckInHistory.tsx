import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Download, TrendingUp, Brain, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { enhancedCheckinService } from '@/services/enhancedCheckinService';
import { MoodTrendsChart } from './MoodTrendsChart';
import { CheckInHeatMap } from './CheckInHeatMap';
import { CorrelationAnalysis } from './CorrelationAnalysis';
import { InsightsPanel } from './InsightsPanel';
import { DateRangeFilter } from './DateRangeFilter';
import { AssessmentTypeFilter } from './AssessmentTypeFilter';
import { exportCheckinData } from '@/utils/checkinExport';
import { analyzeCheckinData } from '@/utils/checkinAnalysis';
import { toast } from 'sonner';

export interface CheckinHistoryData {
  id: string;
  checkin_date: string;
  mood_rating: number | null;
  energy_rating: number | null;
  hope_rating: number | null;
  sleep_quality: number | null;
  medication_taken: boolean | null;
  phq2_score: number | null;
  gad2_score: number | null;
  triggers: string[] | null;
  coping_strategies: string[] | null;
  is_complete: boolean;
  created_at: string;
  checkin_assessments?: Array<{
    assessment_type: string;
    scores: Record<string, number>;
    responses: Record<string, any>;
  }>;
}

export interface FilterOptions {
  dateRange: {
    start: Date;
    end: Date;
    preset: '7d' | '30d' | '90d' | 'custom';
  };
  assessmentTypes: string[];
  compareMode: boolean;
  comparePeriod?: {
    start: Date;
    end: Date;
  };
}

const CheckInHistory = () => {
  const { user } = useAuth();
  const [data, setData] = useState<CheckinHistoryData[]>([]);
  const [_loading, setLoading] = useState(true);
  const [_filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      preset: '30d'
    },
    assessmentTypes: ['mood', 'phq2', 'gad2'],
    compareMode: false
  });
  const [insights, setInsights] = useState<unknown>(null);

  useEffect(() => {
    if (user) {
      loadCheckinData();
    }
  }, [user, _filters.dateRange, _filters.assessmentTypes]);

  useEffect(() => {
    if (data.length > 0) {
      const _analysisResults = analyzeCheckinData(data, _filters);
      setInsights(_analysisResults);
    }
  }, [data, _filters]);

  const loadCheckinData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const days = Math.ceil((_filters.dateRange.end.getTime() - _filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      const checkinHistory = await enhancedCheckinService.loadCheckinHistory(user.id, days + 7); // Extra buffer
      
      // Filter data to exact date range
      const _filteredData = checkinHistory.filter(item => {
        const itemDate = new Date(item.checkin_date);
        return itemDate >= _filters.dateRange.start && itemDate <= _filters.dateRange.end;
      });
      
      setData(_filteredData);
    } catch (error) {
      console.error('Error _loading check-in history:', error);
      toast.error('Failed to load check-in history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportCheckinData(data, _filters);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  if (_loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Check-In History</h2>
          <p className="text-muted-foreground">
            Analyze your progress and patterns over time
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filters & Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DateRangeFilter
              value={_filters.dateRange}
              onChange={(dateRange) => handleFilterChange({ dateRange })}
            />
            <AssessmentTypeFilter
              value={_filters.assessmentTypes}
              onChange={(assessmentTypes) => handleFilterChange({ assessmentTypes })}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="compare-mode"
                checked={_filters.compareMode}
                onChange={(e) => handleFilterChange({ compareMode: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="compare-mode" className="text-sm font-medium">
                Compare Periods
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Check-ins</p>
                <p className="text-2xl font-bold">{data.filter(d => d.is_complete).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Avg Mood</p>
                <p className="text-2xl font-bold">
                  {data.length > 0 
                    ? (data.reduce((sum, d) => sum + (d.mood_rating || 0), 0) / data.length).toFixed(1)
                    : '0.0'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {data.length > 0 
                    ? Math.round((data.filter(d => d.is_complete).length / data.length) * 100)
                    : 0
                  }%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Days Tracked</p>
                <p className="text-2xl font-bold">
                  {Math.ceil((_filters.dateRange.end.getTime() - _filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Visualization Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Mood Trends</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="correlation">Correlations</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <MoodTrendsChart 
            data={data} 
            _filters={_filters}
            compareMode={_filters.compareMode}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <CheckInHeatMap 
            data={data} 
            _filters={_filters}
          />
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <CorrelationAnalysis 
            data={data} 
            _filters={_filters}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <InsightsPanel 
            data={data} 
            insights={insights}
            _filters={_filters}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CheckInHistory;
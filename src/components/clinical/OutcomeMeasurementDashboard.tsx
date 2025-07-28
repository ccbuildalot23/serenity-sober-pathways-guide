import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Users,
  Target,
  Download,
  Filter
} from 'lucide-react';

const OutcomeMeasurementDashboard = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [selectedCohort, setSelectedCohort] = useState('all');

  // Mock data - in production this would come from assessment results
  const outcomeData = {
    depression: {
      baseline: 15.2,
      current: 8.4,
      improvement: 44.7,
      trend: 'improving',
      patients: 24
    },
    anxiety: {
      baseline: 12.8,
      current: 6.1,
      improvement: 52.3,
      trend: 'improving',
      patients: 22
    },
    substance: {
      baseline: 22.5,
      current: 7.2,
      improvement: 68.0,
      trend: 'improving',
      patients: 18
    },
    quality: {
      baseline: 4.2,
      current: 7.1,
      improvement: 69.0,
      trend: 'improving',
      patients: 26
    }
  };

  const patientProgress = [
    {
      id: 'P001',
      initials: 'J.D.',
      diagnosis: 'Major Depression + AUD',
      phq9: { baseline: 18, current: 9, change: -9 },
      audit: { baseline: 24, current: 8, change: -16 },
      engagement: 'High',
      weeksInTreatment: 12
    },
    {
      id: 'P002',
      initials: 'S.M.',
      diagnosis: 'GAD + Cannabis Use',
      gad7: { baseline: 15, current: 6, change: -9 },
      audit: { baseline: 12, current: 3, change: -9 },
      engagement: 'Medium',
      weeksInTreatment: 8
    },
    {
      id: 'P003',
      initials: 'M.R.',
      diagnosis: 'PTSD + AUD',
      phq9: { baseline: 16, current: 7, change: -9 },
      audit: { baseline: 28, current: 6, change: -22 },
      engagement: 'High',
      weeksInTreatment: 16
    }
  ];

  const getTrendIcon = (trend: string) => {
    return trend === 'improving' ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    );
  };

  const getEngagementColor = (engagement: string) => {
    switch (engagement) {
      case 'High': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Low': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Outcome Measurement Dashboard</h2>
          <p className="text-muted-foreground">
            Patient progress tracking and clinical outcomes analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Outcome Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Depression (PHQ-9)</CardTitle>
              {getTrendIcon(outcomeData.depression.trend)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {outcomeData.depression.current}
              </div>
              <div className="text-xs text-muted-foreground">
                Baseline: {outcomeData.depression.baseline}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-green-700">
                  {outcomeData.depression.improvement}% improvement
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {outcomeData.depression.patients} patients
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Anxiety (GAD-7)</CardTitle>
              {getTrendIcon(outcomeData.anxiety.trend)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {outcomeData.anxiety.current}
              </div>
              <div className="text-xs text-muted-foreground">
                Baseline: {outcomeData.anxiety.baseline}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-green-700">
                  {outcomeData.anxiety.improvement}% improvement
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {outcomeData.anxiety.patients} patients
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Substance Use (AUDIT)</CardTitle>
              {getTrendIcon(outcomeData.substance.trend)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {outcomeData.substance.current}
              </div>
              <div className="text-xs text-muted-foreground">
                Baseline: {outcomeData.substance.baseline}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-green-700">
                  {outcomeData.substance.improvement}% improvement
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {outcomeData.substance.patients} patients
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Quality of Life</CardTitle>
              {getTrendIcon(outcomeData.quality.trend)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {outcomeData.quality.current}
              </div>
              <div className="text-xs text-muted-foreground">
                Baseline: {outcomeData.quality.baseline}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-green-700">
                  {outcomeData.quality.improvement}% improvement
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {outcomeData.quality.patients} patients
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual">Individual Progress</TabsTrigger>
          <TabsTrigger value="cohort">Cohort Analysis</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Patient Progress</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track assessment scores and treatment engagement over time
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patientProgress.map((patient) => (
                  <div key={patient.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">{patient.initials}</span>
                        </div>
                        <div>
                          <p className="font-medium">Patient {patient.initials}</p>
                          <p className="text-sm text-muted-foreground">{patient.diagnosis}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getEngagementColor(patient.engagement)}>
                          {patient.engagement} Engagement
                        </Badge>
                        <div className="text-right">
                          <p className="text-sm font-medium">{patient.weeksInTreatment} weeks</p>
                          <p className="text-xs text-muted-foreground">in treatment</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      {patient.phq9 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">PHQ-9</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {patient.phq9.baseline} → {patient.phq9.current}
                            </span>
                            <Badge variant="secondary" className="text-green-700">
                              {patient.phq9.change}
                            </Badge>
                          </div>
                        </div>
                      )}
                      {patient.gad7 && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">GAD-7</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {patient.gad7.baseline} → {patient.gad7.current}
                            </span>
                            <Badge variant="secondary" className="text-green-700">
                              {patient.gad7.change}
                            </Badge>
                          </div>
                        </div>
                      )}
                      {patient.audit && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">AUDIT</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {patient.audit.baseline} → {patient.audit.current}
                            </span>
                            <Badge variant="secondary" className="text-green-700">
                              {patient.audit.change}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohort">
          <Card>
            <CardHeader>
              <CardTitle>Cohort Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare outcomes across different patient groups and treatment modalities
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                <p>Cohort analysis charts would be displayed here</p>
                <p className="text-sm">Showing treatment effectiveness by diagnosis, duration, and demographics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictive">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Analytics</CardTitle>
              <p className="text-sm text-muted-foreground">
                AI-powered insights for treatment optimization and risk prediction
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4" />
                <p>Predictive models would be displayed here</p>
                <p className="text-sm">Including dropout risk, treatment response probability, and optimal intervention timing</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OutcomeMeasurementDashboard;
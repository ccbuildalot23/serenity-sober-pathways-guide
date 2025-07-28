import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Calendar, Target } from 'lucide-react';
import CheckInHistory from '@/components/checkin-history/CheckInHistory';
import OutcomeMeasurementDashboard from '@/components/clinical/OutcomeMeasurementDashboard';
import { useAuth } from '@/contexts/AuthContext';

const Progress: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Please sign in to view your progress.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Recovery Progress</h1>
        <p className="text-muted-foreground">
          Track your journey with detailed analytics and insights
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Check-in History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <OutcomeMeasurementDashboard />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <CheckInHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Progress;

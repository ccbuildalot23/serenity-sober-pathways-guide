import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { RecoveryPlanTemplates } from '@/components/recovery/RecoveryPlanTemplates';
import { RecoveryPlanBuilder } from '@/components/recovery/RecoveryPlanBuilder';
import { RecoveryPlanDashboard } from '@/components/recovery/RecoveryPlanDashboard';
import { ProviderIntegration } from '@/components/recovery/ProviderIntegration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Users, BarChart3, Stethoscope } from 'lucide-react';

const RecoveryPlanning: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Layout activeTab="planning" onTabChange={setActiveTab}>
      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Serenity Planning</h1>
          <p className="text-muted-foreground">
            Create and track your personalized recovery journey with evidence-based tools
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Plan Builder
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Providers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <RecoveryPlanDashboard />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <RecoveryPlanTemplates />
          </TabsContent>

          <TabsContent value="builder" className="space-y-6">
            <RecoveryPlanBuilder />
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <ProviderIntegration />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default RecoveryPlanning;
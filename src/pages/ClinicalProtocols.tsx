import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Target, Users, Settings } from 'lucide-react';
import TreatmentPlanTemplates from '@/components/clinical/TreatmentPlanTemplates';
import OutcomeMeasurementDashboard from '@/components/clinical/OutcomeMeasurementDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const ClinicalProtocols: React.FC = () => {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const [activeTab, setActiveTab] = useState('templates');

  // Check if user has provider access
  const hasProviderAccess = userRole === 'provider' || userRole === 'support_member';

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Please sign in to access clinical protocols.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasProviderAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              You don't have permission to access clinical protocols. 
              Contact your administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Clinical Protocols</h1>
        <p className="text-muted-foreground">
          Evidence-based treatment planning and outcome measurement tools
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Treatment Plans
          </TabsTrigger>
          <TabsTrigger value="outcomes" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Outcome Measures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <TreatmentPlanTemplates />
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-6">
          <OutcomeMeasurementDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClinicalProtocols;
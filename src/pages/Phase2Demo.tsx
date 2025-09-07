import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DualAIChat } from '@/components/ai/DualAIChat';
import { PrivacyPreservingAlert } from '@/components/alerts/PrivacyPreservingAlert';
import { ROICalculator } from '@/components/roi/ROICalculator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Sparkles } from 'lucide-react';

export default function Phase2Demo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-600" />
            Serenity Phase 2 Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Experience the new AI-powered features, privacy-preserving alerts, and ROI calculator
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Badge variant="secondary">AWS Cognito Auth</Badge>
            <Badge variant="secondary">HIPAA Compliant</Badge>
            <Badge variant="secondary">Enterprise Ready</Badge>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="max-w-4xl mx-auto mb-8 border-blue-200 bg-blue-50 dark:bg-blue-950">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> All features are using mock data for demonstration. 
            In production, these will connect to AWS Lambda functions and real AI services.
          </AlertDescription>
        </Alert>

        {/* Main Content */}
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle>Phase 2 Features</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ai-chat" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ai-chat">Dual AI Support</TabsTrigger>
                <TabsTrigger value="alerts">Privacy Alerts</TabsTrigger>
                <TabsTrigger value="roi">ROI Calculator</TabsTrigger>
              </TabsList>

              <TabsContent value="ai-chat" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Dual AI Support System</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose between peer support (emotional, empathetic) or clinical guidance (evidence-based) AI assistants.
                    </p>
                  </div>
                  <DualAIChat />
                </div>
              </TabsContent>

              <TabsContent value="alerts" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Privacy-Preserving Alert System</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      "John needs a call" style notifications that protect PHI while activating support networks.
                    </p>
                  </div>
                  <PrivacyPreservingAlert />
                </div>
              </TabsContent>

              <TabsContent value="roi" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">ROI Calculator</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Calculate the financial impact of implementing Serenity in your practice.
                    </p>
                  </div>
                  <ROICalculator />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
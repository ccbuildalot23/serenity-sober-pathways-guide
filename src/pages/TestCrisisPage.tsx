import React, { useState } from 'react';
import { TestCrisisSystem } from '@/components/crisis/TestCrisisSystem';
import { CrisisSystemVerification } from '@/components/crisis/CrisisSystemVerification';
import { EnvironmentSetupGuide } from '@/components/crisis/EnvironmentSetupGuide';
import FunctionalCrisisButton from '@/components/crisis/FunctionalCrisisButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TestTube, AlertTriangle, Settings, CheckSquare, Zap } from 'lucide-react';

export const TestCrisisPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('verification');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Crisis System Command Center</h1>
          <p className="text-muted-foreground">
            Complete testing, verification, and setup for your life-saving crisis support system
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline">
              <a href="/comprehensive-support">Live Support System</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/">Back to Dashboard</a>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="verification" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Verification
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Testing
            </TabsTrigger>
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Live System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="verification" className="space-y-6">
            <CrisisSystemVerification />
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Test Crisis System */}
              <div>
                <TestCrisisSystem />
              </div>

              {/* Real Crisis Button */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Real Crisis Alert
                  </CardTitle>
                  <CardDescription>
                    Use this for actual emergencies only
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800 text-sm font-medium">
                        ⚠️ This sends a real emergency alert to your contacts
                      </p>
                    </div>
                    <FunctionalCrisisButton />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Testing Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">✅ Test Messages</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Clearly marked as "TEST ALERT"</li>
                      <li>• Include "This is not an emergency"</li>
                      <li>• Don't count against rate limits</li>
                      <li>• Not logged as real crisis events</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">⚠️ Real Alerts</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Sent immediately without "TEST" label</li>
                      <li>• Rate limited (max 3 per 5 minutes)</li>
                      <li>• Logged as actual crisis events</li>
                      <li>• Triggers emergency protocols</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <EnvironmentSetupGuide />
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Live Crisis System
                </CardTitle>
                <CardDescription>
                  Production-ready crisis support button
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-semibold text-red-800">Emergency Crisis Support</h3>
                    <p className="text-red-700">If you're in crisis and need immediate help, use this button</p>
                    <FunctionalCrisisButton />
                    <p className="text-sm text-red-600">
                      This will immediately alert your emergency contacts and support network
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <CheckSquare className="h-8 w-8 mx-auto text-green-500" />
                        <h4 className="font-medium">Verified System</h4>
                        <p className="text-sm text-muted-foreground">
                          All components tested and working
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <AlertTriangle className="h-8 w-8 mx-auto text-orange-500" />
                        <h4 className="font-medium">24/7 Ready</h4>
                        <p className="text-sm text-muted-foreground">
                          Crisis support available anytime
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <TestTube className="h-8 w-8 mx-auto text-blue-500" />
                        <h4 className="font-medium">Continuously Tested</h4>
                        <p className="text-sm text-muted-foreground">
                          Regular testing ensures reliability
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
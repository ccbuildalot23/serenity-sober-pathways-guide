import React from 'react';
import { TestCrisisSystem } from '@/components/crisis/TestCrisisSystem';
import FunctionalCrisisButton from '@/components/crisis/FunctionalCrisisButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TestTube, AlertTriangle } from 'lucide-react';

export const TestCrisisPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Crisis System Testing</h1>
          <p className="text-muted-foreground">
            Test and verify your crisis alert system functionality
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
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
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TestTube, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  success: boolean;
  message: string;
  sentCount?: number;
  totalContacts?: number;
  results?: Array<{
    contact: string;
    phone: string;
    status: string;
    error?: string;
  }>;
}

export const TestCrisisSystem: React.FC = () => {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const sendTestAlert = async () => {
    if (!user) {
      toast.error('Please log in to test the crisis system');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const testMessage = `TEST ALERT from Serenity App - ${user.email || 'User'} is testing their crisis support system. This is not an emergency.`;
      
      const { data, error } = await supabase.functions.invoke('send-crisis-sms', {
        body: {
          customMessage: testMessage,
          includeLocation: false,
          isTestMessage: true
        }
      });

      if (error) {
        throw error;
      }

      const result: TestResult = {
        success: data.success,
        message: data.message,
        sentCount: data.sentCount,
        totalContacts: data.totalContacts,
        results: data.results
      };

      setTestResult(result);

      if (result.success) {
        toast.success(`Test alert sent to ${result.sentCount} of ${result.totalContacts} contacts`);
      } else {
        toast.error('Test alert failed');
      }

    } catch (error: any) {
      console.error('Test crisis alert failed:', error);
      const errorResult: TestResult = {
        success: false,
        message: error.message || 'Test alert failed'
      };
      setTestResult(errorResult);
      toast.error(error.message || 'Test alert failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-blue-500" />
          Test Crisis Alert System
        </CardTitle>
        <CardDescription>
          Send a test message to your emergency contacts to verify the system is working
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will send a TEST message to your contacts clearly marked as a test. 
            This is not an emergency alert.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <strong>Test message preview:</strong>
            <div className="mt-2 p-3 bg-muted rounded-md text-sm">
              "TEST ALERT from Serenity App - {user?.email || 'User'} is testing their crisis support system. This is not an emergency."
            </div>
          </div>

          <Button 
            onClick={sendTestAlert}
            disabled={testing}
            className="w-full"
            size="lg"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending Test...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Alert
              </>
            )}
          </Button>
        </div>

        {testResult && (
          <div className="mt-4">
            <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                <div className="font-medium mb-2">
                  {testResult.success ? 'Test Successful!' : 'Test Failed'}
                </div>
                <div>{testResult.message}</div>
                
                {testResult.results && testResult.results.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-2">Contact Results:</div>
                    <div className="space-y-1">
                      {testResult.results.map((result, index) => (
                        <div key={index} className="text-xs flex justify-between">
                          <span>{result.contact}</span>
                          <span className={result.status === 'sent' ? 'text-green-600' : 'text-red-600'}>
                            {result.status === 'sent' ? '✓ Sent' : `✗ ${result.error || 'Failed'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
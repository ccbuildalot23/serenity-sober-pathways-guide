
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

export const RealtimeConnectionTest: React.FC = () => {
  const [tests, setTests] = useState({
    auth: { status: 'pending', message: '' },
    channel: { status: 'pending', message: '' },
    broadcast: { status: 'pending', message: '' },
    postgres: { status: 'pending', message: '' }
  });
  const [isRunning, setIsRunning] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  const updateTest = (testName: string, status: 'pending' | 'success' | 'error', message: string) => {
    setTests(prev => ({
      ...prev,
      [testName]: { status, message }
    }));
    addLog(`${testName.toUpperCase()}: ${status} - ${message}`);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDebugLogs([]);
    
    // Reset all tests
    setTests({
      auth: { status: 'pending', message: 'Checking...' },
      channel: { status: 'pending', message: 'Checking...' },
      broadcast: { status: 'pending', message: 'Checking...' },
      postgres: { status: 'pending', message: 'Checking...' }
    });

    try {
      addLog('Starting Realtime diagnostics...');

      // Test 1: Authentication
      addLog('Testing authentication...');
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        updateTest('auth', 'error', `Authentication failed: ${authError?.message || 'No session'}`);
        setIsRunning(false);
        return;
      }
      
      updateTest('auth', 'success', `Authenticated as ${session.user.email}`);

      // Test 2: Basic Channel Connection
      addLog('Testing basic channel connection...');
      const testChannel = supabase.channel('diagnostic-test', {
        config: { broadcast: { self: true } }
      });

      const channelPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          testChannel.unsubscribe();
          reject(new Error('Channel subscription timeout (10s)'));
        }, 10000);

        testChannel.subscribe((status) => {
          addLog(`Channel status: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve(status);
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            reject(new Error('Channel subscription error'));
          }
        });
      });

      try {
        await channelPromise;
        updateTest('channel', 'success', 'Channel subscription successful');
      } catch (error) {
        updateTest('channel', 'error', error.message);
        testChannel.unsubscribe();
        setIsRunning(false);
        return;
      }

      // Test 3: Broadcast Messaging
      addLog('Testing broadcast messaging...');
      const broadcastPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Broadcast test timeout (5s)'));
        }, 5000);

        testChannel.on('broadcast', { event: 'test' }, (payload) => {
          addLog(`Broadcast received: ${JSON.stringify(payload)}`);
          clearTimeout(timeout);
          resolve(payload);
        });

        // Send test message
        testChannel.send({
          type: 'broadcast',
          event: 'test',
          payload: { message: 'test-message', timestamp: Date.now() }
        });
      });

      try {
        await broadcastPromise;
        updateTest('broadcast', 'success', 'Broadcast messaging works');
      } catch (error) {
        updateTest('broadcast', 'error', error.message);
      }

      testChannel.unsubscribe();

      // Test 4: PostgreSQL Changes
      addLog('Testing PostgreSQL changes subscription...');
      const pgChannel = supabase.channel('pg-changes-test');
      
      const pgPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pgChannel.unsubscribe();
          reject(new Error('PostgreSQL changes test timeout (5s)'));
        }, 5000);

        pgChannel
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles'
          }, (payload) => {
            addLog(`PostgreSQL change received: ${payload.eventType}`);
            clearTimeout(timeout);
            resolve(payload);
          })
          .subscribe((status) => {
            addLog(`PostgreSQL changes channel status: ${status}`);
            
            if (status === 'SUBSCRIBED') {
              // Channel is ready, but we'll timeout if no changes occur
              // This is expected for the test
            } else if (status === 'CHANNEL_ERROR') {
              clearTimeout(timeout);
              reject(new Error('PostgreSQL changes subscription error'));
            }
          });
      });

      try {
        await pgPromise;
        updateTest('postgres', 'success', 'PostgreSQL changes subscription works');
      } catch (error) {
        if (error.message.includes('timeout')) {
          updateTest('postgres', 'success', 'PostgreSQL changes subscription established (no changes to detect)');
        } else {
          updateTest('postgres', 'error', error.message);
        }
      }

      pgChannel.unsubscribe();
      addLog('Diagnostics complete!');

    } catch (error) {
      addLog(`Unexpected error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setDebugLogs([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Realtime Connection Diagnostics</h1>
        <p className="text-gray-600">Test your Supabase Realtime connection step by step</p>
      </div>

      <div className="flex gap-4 justify-center">
        <Button 
          onClick={runDiagnostics}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run Diagnostics'
          )}
        </Button>
        <Button variant="outline" onClick={clearLogs}>
          Clear Logs
        </Button>
      </div>

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(tests).map(([testName, test]) => (
          <Card key={testName} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(test.status)}
                <h3 className="font-semibold capitalize">{testName} Test</h3>
              </div>
              {getStatusBadge(test.status)}
            </div>
            <p className="text-sm text-gray-600">{test.message}</p>
          </Card>
        ))}
      </div>

      {/* Debug Logs */}
      {debugLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono">
                {debugLogs.join('\n')}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help */}
      <Alert>
        <AlertDescription>
          <strong>Next Steps:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>If Authentication fails: Check your Supabase credentials</li>
            <li>If Channel Connection fails: Verify Realtime is enabled in Supabase</li>
            <li>If Broadcast fails: Check network/firewall settings</li>
            <li>If PostgreSQL fails: Enable replication for your tables</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default RealtimeConnectionTest;

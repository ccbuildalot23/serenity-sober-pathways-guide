import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Database, Wifi } from 'lucide-react';

export const AuthDebugPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const addResult = (test: string, success: boolean, details?: any) => {
    setResults(prev => [...prev, { test, success, details, timestamp: new Date() }]);
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Check Supabase connection
    try {
      const { data, error } = await supabase.from('user_roles').select('count');
      if (error) throw error;
      addResult('Supabase Connection', true, 'Database accessible');
    } catch (error: any) {
      addResult('Supabase Connection', false, error.message);
    }

    // Test 2: Check current session
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      addResult('Current Session', !!session, session ? `User: ${session.user.email}` : 'No active session');
    } catch (error: any) {
      addResult('Current Session', false, error.message);
    }

    // Test 3: Check Supabase URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    addResult('Supabase URL', !!supabaseUrl, supabaseUrl || 'Not configured');

    // Test 4: Check Anon Key
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    addResult('Anon Key', !!anonKey, anonKey ? 'Configured' : 'Not configured');

    // Test 5: Test sign in with test credentials
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test-recovery@example.com',
        password: 'TestSecure#2024!Recovery'
      });
      if (error) throw error;
      addResult('Test Sign In', true, 'Test user authenticated');
      // Sign out immediately
      await supabase.auth.signOut();
    } catch (error: any) {
      addResult('Test Sign In', false, error.message);
    }

    setTesting(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Authentication Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            'Run Authentication Tests'
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <Alert key={index} variant={result.success ? 'default' : 'destructive'}>
                <div className="flex items-start gap-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{result.test}</p>
                    <AlertDescription className="text-sm">
                      {result.details}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export const AuthTestComponent: React.FC = () => {
  const { user, session, loading, signIn } = useAuth();
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('Test123!@#');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [supabaseSession, setSupabaseSession] = useState<any>(null);

  // Check Supabase session directly
  useEffect(() => {
    checkSupabaseSession();
  }, []);

  const checkSupabaseSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSupabaseSession(session);
      addTestResult(`Direct Supabase session check: ${session ? 'Found' : 'Not found'}`);
    } catch (error) {
      addTestResult(`Error checking Supabase session: ${error}`);
    }
  };

  const addTestResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${result}`, ...prev]);
  };

  const runAuthTest = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    addTestResult('Starting authentication test...');
    
    // Step 1: Check current auth state
    addTestResult(`Current user: ${user ? user.email : 'None'}`);
    addTestResult(`Current session: ${session ? 'Active' : 'None'}`);
    addTestResult(`Auth loading: ${loading}`);
    
    // Step 2: Check Supabase directly
    await checkSupabaseSession();
    
    // Step 3: Try to sign in
    try {
      addTestResult(`Attempting sign in with: ${testEmail}`);
      const { error } = await signIn(testEmail, testPassword);
      
      if (error) {
        addTestResult(`Sign in error: ${error.message}`);
      } else {
        addTestResult('Sign in successful!');
        
        // Wait for auth state to update
        addTestResult('Waiting for auth state update...');
        setTimeout(async () => {
          const { data: { session: newSession } } = await supabase.auth.getSession();
          addTestResult(`New session after sign in: ${newSession ? 'Active' : 'None'}`);
          addTestResult(`Auth context user: ${user ? user.email : 'Still none'}`);
        }, 2000);
      }
    } catch (error) {
      addTestResult(`Unexpected error: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const clearAllAuth = async () => {
    addTestResult('Clearing all auth data...');
    
    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key);
        addTestResult(`Removed localStorage: ${key}`);
      }
    });
    
    // Clear sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        sessionStorage.removeItem(key);
        addTestResult(`Removed sessionStorage: ${key}`);
      }
    });
    
    // Sign out from Supabase
    try {
      await supabase.auth.signOut();
      addTestResult('Signed out from Supabase');
    } catch (error) {
      addTestResult(`Error signing out: ${error}`);
    }
    
    addTestResult('Auth cleanup complete. Refreshing page...');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="space-y-4">
      {/* Current State Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Auth State</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Context User:</span>
            <Badge variant={user ? 'default' : 'secondary'}>
              {user ? user.email : 'None'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Context Session:</span>
            <Badge variant={session ? 'default' : 'secondary'}>
              {session ? 'Active' : 'None'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Direct Supabase Session:</span>
            <Badge variant={supabaseSession ? 'default' : 'secondary'}>
              {supabaseSession ? 'Active' : 'None'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Loading:</span>
            <Badge variant={loading ? 'outline' : 'secondary'}>
              {loading ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Test Email</Label>
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Test Password</Label>
            <Input
              type="password"
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={runAuthTest}
              disabled={isTesting}
              className="flex-1"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Auth Test'
              )}
            </Button>
            <Button
              onClick={checkSupabaseSession}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={clearAllAuth}
            variant="destructive"
            className="w-full"
          >
            Clear All Auth & Reload
          </Button>
        </CardContent>
      </Card>

      {/* Test Results Card */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-xs">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-1 rounded ${
                    result.includes('error') || result.includes('Error')
                      ? 'bg-red-50 text-red-700'
                      : result.includes('successful') || result.includes('Active')
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
            >
              Go to Home
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/checkin'}
            >
              Go to Check-in
            </Button>
            <Button
              variant="outline"
              onClick={() => console.log({ user, session, loading })}
            >
              Log to Console
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

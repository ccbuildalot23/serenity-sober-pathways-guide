import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function PatientDashboardTest() {
  const { user } = useAuth();
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (user) {
      runTests();
    }
  }, [user]);

  async function runTests() {
    setTesting(true);
    const results: any = {};

    try {
      // Test 1: User authentication
      results.auth = {
        status: 'success',
        user: {
          id: user?.id,
          email: user?.email,
          metadata: user?.user_metadata
        }
      };
      console.log('Test 1 - User auth:', results.auth);

      // Test 2: Check user role
      try {
        const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
        results.role = {
          status: roleError ? 'error' : 'success',
          data: roleData,
          error: roleError
        };
        console.log('Test 2 - User role:', results.role);
      } catch (err) {
        results.role = {
          status: 'error',
          error: err
        };
      }

      // Test 3: Check user_roles table directly
      try {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user?.id);
        
        results.userRolesTable = {
          status: rolesError ? 'error' : 'success',
          data: rolesData,
          error: rolesError
        };
        console.log('Test 3 - User roles table:', results.userRolesTable);
      } catch (err) {
        results.userRolesTable = {
          status: 'error',
          error: err
        };
      }

      // Test 4: Check profiles table
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single();
        
        results.profile = {
          status: profileError ? 'error' : 'success',
          data: profileData,
          error: profileError
        };
        console.log('Test 4 - Profile:', results.profile);
      } catch (err) {
        results.profile = {
          status: 'error',
          error: err
        };
      }

      // Test 5: Check patients table
      try {
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('user_id', user?.id);
        
        results.patients = {
          status: patientError ? 'error' : 'success',
          data: patientData,
          error: patientError
        };
        console.log('Test 5 - Patients table:', results.patients);
      } catch (err) {
        results.patients = {
          status: 'error',
          error: err
        };
      }

      // Test 6: Dashboard data access
      try {
        const { data: checkinsData, error: checkinsError } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', user?.id)
          .limit(1);
        
        results.dashboardAccess = {
          status: checkinsError ? 'error' : 'success',
          data: checkinsData,
          error: checkinsError
        };
        console.log('Test 6 - Dashboard access:', results.dashboardAccess);
      } catch (err) {
        results.dashboardAccess = {
          status: 'error',
          error: err
        };
      }

      setTestResults(results);
      setData(results);
    } catch (err) {
      setError(err);
      console.error('Test suite failed:', err);
    } finally {
      setTesting(false);
    }
  }

  async function assignPatientRole() {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user?.id,
          role: 'patient'
        });

      if (error) {
        console.error('Error assigning role:', error);
        alert(`Error: ${error.message}`);
      } else {
        alert('Patient role assigned successfully! Please refresh the page.');
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to assign role:', err);
      alert(`Failed: ${err.message}`);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No user logged in. Please log in first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Patient Dashboard Debug Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Results Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            {Object.entries(testResults).map(([test, result]: [string, any]) => (
              <div key={test} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <p className="font-medium capitalize">{test.replace(/([A-Z])/g, ' $1').trim()}</p>
                  {result.status === 'error' && (
                    <p className="text-sm text-red-600 mt-1">
                      Error: {result.error?.message || JSON.stringify(result.error)}
                    </p>
                  )}
                  {result.data && (
                    <pre className="text-xs text-gray-600 mt-1 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Fix Button */}
          {testResults.role?.status === 'error' || 
           testResults.userRolesTable?.data?.length === 0 ? (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Missing Role Assignment</h4>
              <p className="text-sm text-yellow-700 mb-3">
                It appears you don't have a role assigned. Click below to assign the patient role.
              </p>
              <Button 
                onClick={assignPatientRole} 
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Assign Patient Role
              </Button>
            </div>
          ) : null}

          {/* Raw Data */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong>
                <pre className="mt-2 text-xs">{JSON.stringify(error, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          )}

          {/* Refresh Button */}
          <Button 
            onClick={runTests} 
            disabled={testing}
            className="w-full"
          >
            {testing ? 'Running Tests...' : 'Re-run Tests'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
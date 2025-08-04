import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComprehensiveSupportDashboard } from '@/components/support/ComprehensiveSupportDashboard';
import SupportNetwork from '@/components/SupportNetwork';
import SupportDashboard from './SupportDashboard';
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TestResult {
  component: string;
  test: string;
  status: 'pending' | 'pass' | 'fail' | 'error';
  notes?: string;
}

const TestSupportDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<TestResult[]>([
    // ComprehensiveSupportDashboard Tests
    { component: 'ComprehensiveSupportDashboard', test: 'Support Request - Connection', status: 'pending' },
    { component: 'ComprehensiveSupportDashboard', test: 'Support Request - Tough Day', status: 'pending' },
    { component: 'ComprehensiveSupportDashboard', test: 'Support Request - Crisis', status: 'pending' },
    { component: 'ComprehensiveSupportDashboard', test: 'Positive Reinforcements Display', status: 'pending' },
    { component: 'ComprehensiveSupportDashboard', test: 'Reinforcement Acknowledgment', status: 'pending' },
    { component: 'ComprehensiveSupportDashboard', test: 'Daily Check-in Button', status: 'pending' },
    { component: 'ComprehensiveSupportDashboard', test: 'Schedule Wellness Check', status: 'pending' },
    { component: 'ComprehensiveSupportDashboard', test: 'Community Stats Display', status: 'pending' },
    
    // SupportNetwork Tests
    { component: 'SupportNetwork', test: 'Add Contact Button', status: 'pending' },
    { component: 'SupportNetwork', test: 'Contact Form Submission', status: 'pending' },
    { component: 'SupportNetwork', test: 'Contact Card Display', status: 'pending' },
    { component: 'SupportNetwork', test: 'Call/Message Actions', status: 'pending' },
    { component: 'SupportNetwork', test: 'Delete Contact', status: 'pending' },
    { component: 'SupportNetwork', test: 'Crisis Contacts Navigation', status: 'pending' },
    { component: 'SupportNetwork', test: 'Settings Navigation', status: 'pending' },
    
    // SupportDashboard Tests
    { component: 'SupportDashboard', test: 'Card Components Render', status: 'pending' },
    { component: 'SupportDashboard', test: 'Alert List Display', status: 'pending' },
    { component: 'SupportDashboard', test: 'Action Buttons', status: 'pending' },
    { component: 'SupportDashboard', test: 'Privacy Notices', status: 'pending' },
  ]);

  const updateTestResult = (component: string, test: string, status: TestResult['status'], notes?: string) => {
    setTestResults(prev => prev.map(result => 
      result.component === component && result.test === test
        ? { ...result, status, notes }
        : result
    ));
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-500">Pass</Badge>;
      case 'fail':
        return <Badge className="bg-red-500">Fail</Badge>;
      case 'error':
        return <Badge className="bg-yellow-500">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Button>
          <h1 className="text-3xl font-bold">Support Network Dashboard Testing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive testing of all support network components
          </p>
        </div>

        {/* Test Status Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {testResults.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {testResults.filter(r => r.status === 'pass').length}
                </div>
                <div className="text-sm text-gray-500">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {testResults.filter(r => r.status === 'fail').length}
                </div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {testResults.filter(r => r.status === 'error').length}
                </div>
                <div className="text-sm text-gray-500">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Component</th>
                    <th className="text-left p-2">Test</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{result.component}</td>
                      <td className="p-2">{result.test}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          {getStatusBadge(result.status)}
                        </div>
                      </td>
                      <td className="p-2 text-sm text-gray-600">{result.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Testing Instructions */}
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Testing Instructions:</strong> Navigate through each tab below and test the components manually. 
            Update the test results table as you complete each test. Click on buttons, fill forms, and verify 
            that all functionality works as expected.
          </AlertDescription>
        </Alert>

        {/* Component Tabs */}
        <Tabs defaultValue="comprehensive" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="comprehensive">Comprehensive</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="support">Support View</TabsTrigger>
          </TabsList>

          <TabsContent value="comprehensive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ComprehensiveSupportDashboard (Patient View)</CardTitle>
                <p className="text-sm text-gray-600">Route: /comprehensive-support</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Test all support request buttons, verify SMS sending, check reinforcement messages,
                      and test practice/wellness features.
                    </AlertDescription>
                  </Alert>
                  <div className="border rounded-lg p-4">
                    <ComprehensiveSupportDashboard />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SupportNetwork Component</CardTitle>
                <p className="text-sm text-gray-600">Used in Patient Dashboard</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Test adding/deleting contacts, navigation to crisis contacts and settings,
                      and verify all contact actions work properly.
                    </AlertDescription>
                  </Alert>
                  <div className="border rounded-lg p-4">
                    <SupportNetwork />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SupportDashboard (Family/Friend View)</CardTitle>
                <p className="text-sm text-gray-600">Route: /support</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      This is a read-only dashboard for support members. Test that all display components
                      render correctly and action buttons show appropriate responses.
                    </AlertDescription>
                  </Alert>
                  <div className="border rounded-lg p-4">
                    <SupportDashboard />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Manual Test Checklist */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Manual Test Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">ComprehensiveSupportDashboard Tests:</h3>
                <ul className="space-y-1 text-sm">
                  <li>□ Click "Just Need Connection" - verify toast message appears</li>
                  <li>□ Click "Having a Tough Day" - verify toast message appears</li>
                  <li>□ Click "Need Help Now" - verify crisis message handling</li>
                  <li>□ Check if positive reinforcements appear after sending requests</li>
                  <li>□ Click acknowledgment button on reinforcements</li>
                  <li>□ Click "Daily Check-in" button</li>
                  <li>□ Click "Schedule Wellness Check" button</li>
                  <li>□ Verify community stats display (if data exists)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">SupportNetwork Tests:</h3>
                <ul className="space-y-1 text-sm">
                  <li>□ Click "Add Contact" button - form should appear</li>
                  <li>□ Fill and submit contact form</li>
                  <li>□ Verify contact card displays with correct info</li>
                  <li>□ Test call/message buttons on contact cards</li>
                  <li>□ Delete a contact (with confirmation)</li>
                  <li>□ Click "Crisis Contacts" - verify navigation</li>
                  <li>□ Click "Settings" - verify navigation</li>
                  <li>□ Test back navigation from sub-views</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">SupportDashboard Tests:</h3>
                <ul className="space-y-1 text-sm">
                  <li>□ Verify all cards render properly</li>
                  <li>□ Check alert list displays mock data</li>
                  <li>□ Click "Send Encouragement" button</li>
                  <li>□ Click "Schedule Check-in" button</li>
                  <li>□ Click "View Milestones" button</li>
                  <li>□ Click "Recovery Resources" button</li>
                  <li>□ Verify privacy notices display</li>
                  <li>□ Check responsive layout</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestSupportDashboard;
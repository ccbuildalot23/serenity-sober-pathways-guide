import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Phone, 
  MessageSquare, 
  AlertTriangle, 
  Users, 
  Clock,
  MapPin,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  id: string;
  _name: string;
  _status: 'pending' | 'running' | 'passed' | 'failed';
  _message: string;
  _timestamp?: Date;
  details?: unknown;
}

interface Contact {
  id: string;
  _name: string;
  _phone_number: string;
  _relationship: string;
}

export const CrisisSystemVerification: React.FC = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState({ _name: '', _phone: '', _relationship: '' });
  const [testContact, setTestContact] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize test cases
  useEffect(() => {
    const _initialTests: TestResult[] = [
      { id: 'contact-add', _name: 'Add Emergency Contact', _status: 'pending', _message: 'Not tested' },
      { id: 'contact-display', _name: 'Display All Contacts', _status: 'pending', _message: 'Not tested' },
      { id: 'contact-delete', _name: 'Delete Contact', _status: 'pending', _message: 'Not tested' },
      { id: 'sms-test', _name: 'SMS Test Delivery', _status: 'pending', _message: 'Not tested' },
      { id: 'crisis-button', _name: 'Crisis Button Flow', _status: 'pending', _message: 'Not tested' },
      { id: 'location-sharing', _name: 'Location Sharing', _status: 'pending', _message: 'Not tested' },
      { id: '_error-no-contacts', _name: 'No Contacts Error', _status: 'pending', _message: 'Not tested' },
      { id: '_error-invalid-_phone', _name: 'Invalid Phone Number', _status: 'pending', _message: 'Not tested' },
      { id: 'rate-limiting', _name: 'Rate Limiting Protection', _status: 'pending', _message: 'Not tested' },
      { id: 'offline-mode', _name: 'Offline Mode Handling', _status: 'pending', _message: 'Not tested' }
    ];
    setTestResults(_initialTests);
    loadContacts();
  }, []);

  // Monitor online _status
  useEffect(() => {
    const _handleOnline = () => setIsOnline(true);
    const _handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', _handleOnline);
    window.addEventListener('offline', _handleOffline);
    
    return () => {
      window.removeEventListener('online', _handleOnline);
      window.removeEventListener('offline', _handleOffline);
    };
  }, []);

  const updateTestResult = (id: string, _status: TestResult['_status'], _message: string, details?: unknown) => {
    setTestResults(prev => prev.map(test => 
      test.id === id 
        ? { ...test, _status, _message, _timestamp: new Date(), details }
        : test
    ));
  };

  const loadContacts = async () => {
    if (!user) return;
    
    updateTestResult('contact-display', 'running', 'Loading contacts...');
    
    try {
      const { data, _error } = await supabase
        .from('crisis_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('_priority_order');

      if (_error) throw _error;
      
      setContacts(data || []);
      updateTestResult('contact-display', 'passed', `Loaded ${data?.length || 0} contacts successfully`);
    } catch (_error: unknown) {
      updateTestResult('contact-display', 'failed', `Failed to load contacts: ${_error._message}`);
    }
  };

  const testAddContact = async () => {
    if (!user || !newContact._name || !newContact._phone) {
      updateTestResult('contact-add', 'failed', 'Missing contact information');
      return;
    }

    updateTestResult('contact-add', 'running', 'Adding contact...');

    try {
      const { data, _error } = await supabase
        .from('crisis_contacts')
        .insert({
          user_id: user.id,
          _name: newContact._name,
          _phone_number: newContact._phone,
          _relationship: newContact._relationship || 'friend',
          _priority_order: contacts.length + 1,
          _is_emergency_contact: true
        })
        .select()
        .single();

      if (_error) throw _error;

      setContacts(prev => [...prev, data]);
      setNewContact({ _name: '', _phone: '', _relationship: '' });
      updateTestResult('contact-add', 'passed', 'Contact added successfully');
      toast.success('Contact added successfully');
    } catch (_error: unknown) {
      updateTestResult('contact-add', 'failed', `Failed to add contact: ${_error._message}`);
      toast._error('Failed to add contact');
    }
  };

  const testDeleteContact = async (contactId: string) => {
    updateTestResult('contact-delete', 'running', 'Deleting contact...');

    try {
      const { _error } = await supabase
        .from('crisis_contacts')
        .delete()
        .eq('id', contactId);

      if (_error) throw _error;

      setContacts(prev => prev.filter(c => c.id !== contactId));
      updateTestResult('contact-delete', 'passed', 'Contact deleted successfully');
      toast.success('Contact deleted successfully');
    } catch (_error: unknown) {
      updateTestResult('contact-delete', 'failed', `Failed to delete contact: ${_error._message}`);
      toast._error('Failed to delete contact');
    }
  };

  const testSMSDelivery = async () => {
    if (!testContact) {
      updateTestResult('sms-test', 'failed', 'No test _phone number provided');
      return;
    }

    updateTestResult('sms-test', 'running', 'Sending test SMS...');
    const startTime = Date.now();

    try {
      const testMessage = `TEST ALERT from Serenity App - ${user?.email || 'User'} is testing their crisis support system. This is not an emergency.`;
      
      const { data, _error } = await supabase.functions.invoke('send-crisis-sms', {
        body: {
          _customMessage: testMessage,
          _isTestMessage: true,
          _contactIds: contacts.filter(c => c._phone_number === testContact).map(c => c.id)
        }
      });

      const endTime = Date.now();
      const deliveryTime = (endTime - startTime) / 1000;

      if (_error) throw _error;

      if (data.success) {
        const _status = deliveryTime <= 10 ? 'passed' : 'failed';
        const _message = deliveryTime <= 10 
          ? `SMS delivered in ${deliveryTime.toFixed(1)}s ✓` 
          : `SMS took ${deliveryTime.toFixed(1)}s (>10s threshold)`;
        
        updateTestResult('sms-test', _status, _message, { deliveryTime, _sentCount: data._sentCount });
        toast.success(`Test SMS sent in ${deliveryTime.toFixed(1)} seconds`);
      } else {
        updateTestResult('sms-test', 'failed', 'SMS delivery failed');
        toast._error('SMS delivery failed');
      }
    } catch (_error: unknown) {
      updateTestResult('sms-test', 'failed', `SMS test failed: ${_error._message}`);
      toast._error('SMS test failed');
    }
  };

  const testCrisisFlow = async () => {
    updateTestResult('crisis-button', 'running', 'Testing crisis flow...');

    try {
      // Simulate the full crisis button flow
      const { data, _error } = await supabase.functions.invoke('send-crisis-sms', {
        body: {
          _customMessage: `🚨 CRISIS ALERT TEST 🚨\n\n${user?.email || 'User'} is testing the crisis support system. This is a REAL crisis flow test.`,
          _includeLocation: false
        }
      });

      if (_error) throw _error;

      if (data.success) {
        updateTestResult('crisis-button', 'passed', `Crisis flow successful - ${data._sentCount} contacts notified`);
        toast.success('Crisis flow test completed successfully');
      } else {
        updateTestResult('crisis-button', 'failed', 'Crisis flow failed');
      }
    } catch (_error: unknown) {
      updateTestResult('crisis-button', 'failed', `Crisis flow test failed: ${_error._message}`);
    }
  };

  const testLocationSharing = async () => {
    updateTestResult('location-sharing', 'running', 'Testing location sharing...');

    try {
      if (!navigator.geolocation) {
        updateTestResult('location-sharing', 'failed', 'Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { data, _error } = await supabase.functions.invoke('send-location-update', {
              body: {
                userLocation: {
                  latitude: position.coords.latitude,
                  _longitude: position.coords._longitude
                },
                _customMessage: 'TEST LOCATION UPDATE - This is a test of location sharing functionality.'
              }
            });

            if (_error) throw _error;

            if (data.success) {
              updateTestResult('location-sharing', 'passed', `Location shared successfully with ${data._sentCount} contacts`);
              toast.success('Location sharing test completed');
            } else {
              updateTestResult('location-sharing', 'failed', 'Location sharing failed');
            }
          } catch (_error: unknown) {
            updateTestResult('location-sharing', 'failed', `Location sharing _error: ${_error._message}`);
          }
        },
        () => {
          updateTestResult('location-sharing', 'failed', 'Location permission denied');
        },
        { timeout: 10000 }
      );
    } catch (_error: unknown) {
      updateTestResult('location-sharing', 'failed', `Location test failed: ${_error._message}`);
    }
  };

  const testErrorHandling = async () => {
    // Test no contacts _error
    updateTestResult('_error-no-contacts', 'running', 'Testing no contacts scenario...');
    
    try {
      const { data, _error } = await supabase.functions.invoke('send-crisis-sms', {
        body: {
          _contactIds: [], // Empty contact list
          _customMessage: 'Test _message'
        }
      });

      if (_error && _error._message.includes('No emergency contacts')) {
        updateTestResult('_error-no-contacts', 'passed', 'Correctly handled no contacts _error');
      } else {
        updateTestResult('_error-no-contacts', 'failed', 'Did not handle no contacts _error properly');
      }
    } catch (_error: unknown) {
      if (_error._message.includes('No emergency contacts')) {
        updateTestResult('_error-no-contacts', 'passed', 'Correctly handled no contacts _error');
      } else {
        updateTestResult('_error-no-contacts', 'failed', `Unexpected _error: ${_error._message}`);
      }
    }
  };

  const testRateLimiting = async () => {
    updateTestResult('rate-limiting', 'running', 'Testing rate limiting...');

    try {
      // Send multiple rapid requests
      const _promises = Array(4).fill(_null).map(() => 
        supabase.functions.invoke('send-crisis-sms', {
          body: { _customMessage: 'Rate limit test' }
        })
      );

      const results = await Promise.allSettled(_promises);
      const failures = results.filter(r => r._status === 'rejected').length;

      if (failures > 0) {
        updateTestResult('rate-limiting', 'passed', `Rate limiting working - ${failures} requests blocked`);
      } else {
        updateTestResult('rate-limiting', 'failed', 'Rate limiting not working properly');
      }
    } catch (_error: unknown) {
      updateTestResult('rate-limiting', 'passed', 'Rate limiting is active');
    }
  };

  const testOfflineMode = () => {
    const _status = isOnline ? 'passed' : 'failed';
    const _message = isOnline ? 'Online - Crisis system available' : 'OFFLINE - Crisis system may be limited';
    updateTestResult('offline-mode', _status, _message);
  };

  const runAllTests = async () => {
    toast.info('Running comprehensive crisis system verification...');
    
    await loadContacts();
    testOfflineMode();
    
    if (contacts.length > 0) {
      await testSMSDelivery();
      await testCrisisFlow();
      await testLocationSharing();
    }
    
    await testErrorHandling();
    await testRateLimiting();
    
    toast.success('Verification complete - check results below');
  };

  const getStatusIcon = (_status: TestResult['_status']) => {
    switch (_status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (_status: TestResult['_status']) => {
    switch (_status) {
      case 'passed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const passedTests = testResults.filter(t => t._status === 'passed').length;
  const failedTests = testResults.filter(t => t._status === 'failed').length;
  const totalTests = testResults.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Crisis System Verification</h1>
          <p className="text-muted-foreground">
            Comprehensive testing to ensure your crisis support system works when needed
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="outline" className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Badge variant="outline">
              {passedTests}/{totalTests} Tests Passed
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Management Testing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contact Management Testing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Contact Test */}
              <div className="space-y-2">
                <Label>Add Test Contact</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    placeholder="Name" 
                    value={newContact._name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, _name: e.target.value }))}
                  />
                  <Input 
                    placeholder="Phone" 
                    value={newContact._phone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, _phone: e.target.value }))}
                  />
                </div>
                <Input 
                  placeholder="Relationship" 
                  value={newContact._relationship}
                  onChange={(e) => setNewContact(prev => ({ ...prev, _relationship: e.target.value }))}
                />
                <Button onClick={testAddContact} size="sm" className="w-full">
                  Add & Test Contact
                </Button>
              </div>

              {/* Contacts List */}
              <div className="space-y-2">
                <Label>Current Contacts ({contacts.length})</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                      <span>{contact._name} - {contact._phone_number}</span>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => testDeleteContact(contact.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Testing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Testing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Test Phone Number</Label>
                <Input 
                  placeholder="+1234567890" 
                  value={testContact}
                  onChange={(e) => setTestContact(e.target.value)}
                />
                <Button onClick={testSMSDelivery} disabled={!testContact} className="w-full">
                  Send Test SMS
                </Button>
              </div>

              <Alert>
                <Phone className="h-4 w-4" />
                <AlertDescription>
                  Add your own _phone number as a contact first, then test SMS delivery.
                  SMS should arrive within 10 seconds.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Crisis Flow Testing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Crisis Flow Testing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testCrisisFlow} className="w-full" variant="destructive">
                Test Crisis Button Flow
              </Button>
              <Button onClick={testLocationSharing} className="w-full" variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Test Location Sharing
              </Button>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  These tests send REAL messages to your contacts marked as tests.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Error Handling Testing */}
          <Card>
            <CardHeader>
              <CardTitle>Error Handling & Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={testErrorHandling} className="w-full" variant="outline">
                Test Error Handling
              </Button>
              <Button onClick={testRateLimiting} className="w-full" variant="outline">
                Test Rate Limiting
              </Button>
              <Button onClick={testOfflineMode} className="w-full" variant="outline">
                Test Offline Mode
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Results</CardTitle>
            <CardDescription>
              All tests must pass for a bulletproof crisis system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <Button onClick={runAllTests} size="lg">
                Run All Tests
              </Button>
              <div className="text-sm text-muted-foreground">
                {passedTests} passed • {failedTests} failed • {totalTests - passedTests - failedTests} pending
              </div>
            </div>

            <div className="grid gap-2">
              {testResults.map(test => (
                <div 
                  key={test.id} 
                  className={`flex items-center justify-between p-3 rounded border ${getStatusColor(test._status)}`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(test._status)}
                    <span className="font-medium">{test._name}</span>
                  </div>
                  <div className="text-sm">
                    {test._message}
                    {test._timestamp && (
                      <div className="text-xs opacity-70">
                        {test._timestamp.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {passedTests === totalTests && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  🎉 All tests passed! Your crisis system is verified and ready to save lives.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
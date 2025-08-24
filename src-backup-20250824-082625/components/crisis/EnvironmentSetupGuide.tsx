import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Settings, MessageSquare, Database, Key } from 'lucide-react';

export const EnvironmentSetupGuide: React.FC = () => {
  const setupSteps = [
    {
      id: 'twilio-signup',
      title: 'Sign up for Twilio SMS Service',
      description: 'Create account and get SMS capabilities',
      status: 'required',
      details: [
        'Visit twilio.com and create account',
        'Verify your email and phone number',
        'Navigate to Console Dashboard',
        'Note down Account SID and Auth Token'
      ]
    },
    {
      id: 'phone-number',
      title: 'Get Twilio Phone Number',
      description: 'Acquire a phone number for sending SMS',
      status: 'required',
      details: [
        'Go to Phone Numbers → Manage → Buy a number',
        'Choose a number with SMS capabilities',
        'Configure the number for your region',
        'Note down the phone number (+1234567890 format)'
      ]
    },
    {
      id: 'credentials',
      title: 'Configure Environment Variables',
      description: 'Add Twilio credentials to Supabase secrets',
      status: 'required',
      details: [
        'TWILIO_ACCOUNT_SID=your_account_sid_here',
        'TWILIO_AUTH_TOKEN=your_auth_token_here',
        'TWILIO_PHONE_NUMBER=+1234567890'
      ]
    },
    {
      id: 'database',
      title: 'Database Tables Created',
      description: 'Required tables for crisis system',
      status: 'completed',
      details: [
        'crisis_contacts table ✓',
        'crisis_alerts table ✓',
        'audit_logs table ✓',
        'RLS policies configured ✓'
      ]
    },
    {
      id: 'edge-functions',
      title: 'Edge Functions Deployed',
      description: 'SMS sending functionality',
      status: 'completed',
      details: [
        'send-crisis-sms function ✓',
        'send-location-update function ✓',
        'Input validation and security ✓',
        'Rate limiting implemented ✓'
      ]
    },
    {
      id: 'testing',
      title: 'Personal Phone Test',
      description: 'Verify system with your own number',
      status: 'pending',
      details: [
        'Add your phone as emergency contact',
        'Send test SMS using verification dashboard',
        'Confirm SMS delivery within 30 seconds',
        'Test both crisis and location alerts'
      ]
    }
  ];

  const monitoringFeatures = [
    'Every crisis alert logged for safety/audit',
    'SMS delivery status tracking',
    'Failure monitoring and alerts',
    'Rate limiting protection',
    'Location sharing verification',
    'Contact management audit trail'
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'required': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'pending': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Settings className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'required': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Environment Setup Guide</h1>
          <p className="text-muted-foreground">
            Complete setup checklist for a production-ready crisis support system
          </p>
        </div>

        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Critical:</strong> This system saves lives. Every step must be completed and verified before deployment.
          </AlertDescription>
        </Alert>

        {/* Setup Steps */}
        <div className="space-y-4">
          {setupSteps.map((step, index) => (
            <Card key={step.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span>{step.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(step.status)}
                    <Badge variant="outline" className={getStatusColor(step.status)}>
                      {step.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {step.details.map((detail, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                      <span className={detail.includes('✓') ? 'text-green-600' : ''}>{detail}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Monitoring & Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Monitoring & Audit Logging
            </CardTitle>
            <CardDescription>
              Built-in safety features and monitoring capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {monitoringFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Final Verification Checklist */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Final Verification Requirements
            </CardTitle>
            <CardDescription>
              Complete these steps before considering the system ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>BEFORE DEPLOYMENT:</strong> You must successfully send a test crisis alert to your own phone 
                and receive the SMS within 30 seconds. This feature saves lives - make it bulletproof.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Successfully send test crisis alert to your own phone</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Receive SMS within 30 seconds</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Successfully share location (if accepted)</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Verify all emergency contacts receive messages</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Test error handling (no contacts, invalid numbers)</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Verify rate limiting protection works</span>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Confirm audit logging is working</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Variables Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Supabase Secrets Configuration
            </CardTitle>
            <CardDescription>
              Add these secrets in your Supabase dashboard under Settings → Edge Functions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md font-mono text-sm space-y-1">
              <div>TWILIO_ACCOUNT_SID=your_account_sid_here</div>
              <div>TWILIO_AUTH_TOKEN=your_auth_token_here</div>
              <div>TWILIO_PHONE_NUMBER=+1234567890</div>
            </div>
            <Alert className="mt-4">
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                Never store these credentials in your code. They must be configured as Supabase secrets.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
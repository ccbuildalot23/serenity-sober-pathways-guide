import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  DollarSign, 
  Shield, 
  Users, 
  Zap,
  CheckCircle,
  Play,
  FileText,
  Bell,
  TrendingUp,
  Heart,
  AlertTriangle
} from 'lucide-react';

export default function ProviderDemo() {
  const [currentDemo, setCurrentDemo] = useState<string>('crisis');
  const [showVideo, setShowVideo] = useState(false);

  const triggerCrisisDemo = () => {
    // Simulate crisis alert
    alert('🚨 DEMO: Crisis alert triggered! Check your phone for SMS in 3... 2... 1...');
    // In production, this would actually trigger an alert
  };

  const generateCPTDemo = () => {
    // Simulate CPT code generation
    const codes = ['90834', '99490', '90785'];
    alert(`✅ Generated CPT codes: ${codes.join(', ')}\nEstimated reimbursement: $225.52`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Serenity Provider Platform
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Save 10+ hours/week. Capture $2,800/month in missed billing. Never miss a crisis.
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary" className="text-lg px-4 py-1">
              <Shield className="w-4 h-4 mr-1" />
              HIPAA Compliant
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              <Zap className="w-4 h-4 mr-1" />
              15-Min Setup
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              <Heart className="w-4 h-4 mr-1" />
              Built by Someone in Recovery
            </Badge>
          </div>
        </div>

        {/* Value Proposition Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <DollarSign className="w-6 h-6 mr-2" />
                +$2,800/Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Automatically capture care coordination billing (CPT 99490) you're currently missing
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-700">
                <Clock className="w-6 h-6 mr-2" />
                10+ Hours/Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Voice-to-note documentation in 60 seconds. No more typing after hours.
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-700">
                <Users className="w-6 h-6 mr-2" />
                24/7 Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Your patients get crisis support anytime. You sleep soundly.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Demo Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">🎬 Live Interactive Demo</CardTitle>
            <p className="text-gray-600">Click to see each feature in action</p>
          </CardHeader>
          <CardContent>
            {/* Demo Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <Button 
                variant={currentDemo === 'crisis' ? 'default' : 'outline'}
                onClick={() => setCurrentDemo('crisis')}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Crisis Response
              </Button>
              <Button 
                variant={currentDemo === 'billing' ? 'default' : 'outline'}
                onClick={() => setCurrentDemo('billing')}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Billing Automation
              </Button>
              <Button 
                variant={currentDemo === 'documentation' ? 'default' : 'outline'}
                onClick={() => setCurrentDemo('documentation')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Voice Documentation
              </Button>
              <Button 
                variant={currentDemo === 'dashboard' ? 'default' : 'outline'}
                onClick={() => setCurrentDemo('dashboard')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </div>

            {/* Demo Content */}
            <div className="bg-gray-50 rounded-lg p-6">
              {currentDemo === 'crisis' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">24/7 Crisis Response System</h3>
                  <p className="mb-4">When a patient triggers a crisis alert:</p>
                  <ol className="list-decimal list-inside space-y-2 mb-6">
                    <li>SMS sent to support network in 3-tier cascade</li>
                    <li>Average response time: 30 seconds</li>
                    <li>You're notified but not required to respond</li>
                    <li>Full audit trail for compliance</li>
                  </ol>
                  <Button onClick={triggerCrisisDemo} size="lg" className="w-full">
                    <Bell className="w-4 h-4 mr-2" />
                    Trigger Demo Crisis Alert
                  </Button>
                </div>
              )}

              {currentDemo === 'billing' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">Automated CPT Code Generation</h3>
                  <p className="mb-4">From session notes to billing in seconds:</p>
                  <div className="bg-white p-4 rounded mb-4">
                    <p className="font-mono text-sm mb-2">
                      "45-minute individual therapy session focusing on CBT for anxiety..."
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-600">Generated Codes:</p>
                      <p className="font-semibold">90834, 99490, 90785</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Reimbursement:</p>
                      <p className="font-semibold text-green-600">$225.52</p>
                    </div>
                  </div>
                  <Button onClick={generateCPTDemo} size="lg" className="w-full">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Generate CPT Codes
                  </Button>
                </div>
              )}

              {currentDemo === 'documentation' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">Voice-to-Note in 60 Seconds</h3>
                  <div className="bg-white p-4 rounded mb-4">
                    <p className="text-sm text-gray-600 mb-2">Just speak naturally:</p>
                    <p className="italic">
                      "Patient presented with improved mood. Discussed coping strategies for work stress. 
                      Practiced mindfulness exercises. Plan to continue weekly sessions."
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded mb-4">
                    <p className="text-sm text-gray-600 mb-2">Instant clinical note:</p>
                    <p className="text-sm">
                      <strong>S:</strong> Patient reports improved mood and ongoing work-related stress.<br/>
                      <strong>O:</strong> Alert, engaged, appropriate affect. Participated in mindfulness exercises.<br/>
                      <strong>A:</strong> Making progress toward treatment goals. Coping skills improving.<br/>
                      <strong>P:</strong> Continue weekly individual therapy. Practice mindfulness daily.
                    </p>
                  </div>
                  <Button size="lg" className="w-full">
                    <Play className="w-4 h-4 mr-2" />
                    Try Voice Recording
                  </Button>
                </div>
              )}

              {currentDemo === 'dashboard' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">Real-Time Analytics Dashboard</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded">
                      <p className="text-sm text-gray-600">This Week</p>
                      <p className="text-2xl font-bold">42 Patients</p>
                      <p className="text-sm text-green-600">↑ 12% engagement</p>
                    </div>
                    <div className="bg-white p-4 rounded">
                      <p className="text-sm text-gray-600">Revenue</p>
                      <p className="text-2xl font-bold">$8,450</p>
                      <p className="text-sm text-green-600">↑ $2,800 from CCM</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded">
                    <p className="text-sm text-gray-600 mb-2">Crisis Response Metrics</p>
                    <div className="flex justify-between">
                      <span>Avg Response Time:</span>
                      <span className="font-bold text-green-600">28 seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prevented Escalations:</span>
                      <span className="font-bold">7 this month</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ROI Calculator */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">💰 Your ROI Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Time Savings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Documentation (2 hrs/day saved)</span>
                    <span className="font-semibold">10 hrs/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span>At $150/hour rate</span>
                    <span className="font-semibold text-green-600">+$1,500/week</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Additional Revenue</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Care Coordination (99490)</span>
                    <span className="font-semibold">$2,600/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reduced patient churn</span>
                    <span className="font-semibold text-green-600">+$800/month</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg">Total Monthly Value:</span>
                <span className="text-2xl font-bold text-green-600">$9,400</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Platform cost after pilot: $299/month = <strong>31x ROI</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="py-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Join 5 Virginia Practices in Our Pilot
            </h2>
            <p className="text-xl mb-6 opacity-90">
              Free access through December. 15-minute setup. White-glove onboarding.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                <CheckCircle className="w-5 h-5 mr-2" />
                Start Free Pilot Now
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 text-white border-white">
                Schedule Demo Call
              </Button>
            </div>
            <p className="mt-6 text-sm opacity-75">
              Built with ❤️ by Christopher Caldwell<br/>
              34 days clean, paying it forward to the recovery community
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRecoveryPlan } from '@/hooks/useRecoveryPlan';
import { RecoveryPlanService } from '@/services/recoveryPlanService';
import { Stethoscope, Share2, Users, CheckCircle, Clock, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const ProviderIntegration: React.FC = () => {
  const { plans } = useRecoveryPlan();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [providerEmail, setProviderEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');
  const [isSharing, setIsSharing] = useState(false);

  const handleSharePlan = async () => {
    if (!selectedPlan || !providerEmail) {
      toast.error('Please select a plan and enter provider email');
      return;
    }

    setIsSharing(true);
    try {
      await RecoveryPlanService.shareWithProvider(selectedPlan, providerEmail, accessLevel);
      setProviderEmail('');
      setSelectedPlan('');
    } catch (error) {
      console.error('Error sharing plan:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const activePlans = plans.filter(p => p.status === 'active');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Provider Integration</h2>
        <p className="text-muted-foreground">
          Share your recovery plans with healthcare providers and treatment teams
        </p>
      </div>

      {/* Share Plan Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share Recovery Plan</span>
          </CardTitle>
          <CardDescription>
            Grant your healthcare providers access to your recovery progress and goals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-select">Select Plan to Share</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a recovery plan" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="provider-email">Provider Email</Label>
              <Input
                id="provider-email"
                type="email"
                value={providerEmail}
                onChange={(e) => setProviderEmail(e.target.value)}
                placeholder="provider@clinic.com"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="access-level">Access Level</Label>
            <Select value={accessLevel} onValueChange={(value) => setAccessLevel(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View Only - Can see plans and progress</SelectItem>
                <SelectItem value="edit">Edit Access - Can modify plans and add notes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={handleSharePlan}
            disabled={isSharing || !selectedPlan || !providerEmail}
            className="w-full"
          >
            {isSharing ? 'Sharing...' : 'Share Plan with Provider'}
          </Button>
        </CardContent>
      </Card>

      {/* Integration Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5" />
              <span>Clinical Integration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">SMART Goals Format</p>
                  <p className="text-sm text-muted-foreground">Goals follow clinical best practices</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Progress Tracking</p>
                  <p className="text-sm text-muted-foreground">Detailed metrics for clinical review</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Evidence-Based Templates</p>
                  <p className="text-sm text-muted-foreground">Proven recovery methodologies</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">API Integration</p>
                  <p className="text-sm text-muted-foreground">Connect with EHR systems (coming soon)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Team Collaboration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Progress Reports</p>
                  <p className="text-sm text-muted-foreground">Automated updates to your care team</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Share2 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">Plan Sharing</p>
                  <p className="text-sm text-muted-foreground">Secure access for multiple providers</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Milestone Notifications</p>
                  <p className="text-sm text-muted-foreground">Alert providers of achievements</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Treatment Plan Integration</p>
                  <p className="text-sm text-muted-foreground">Sync with clinical treatment plans</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Access History */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Access History</CardTitle>
          <CardDescription>
            Track who has access to your recovery plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <p>No providers have been granted access yet.</p>
            <p className="text-sm">Share a plan above to get started with provider collaboration.</p>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Features */}
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Advanced integration features in development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <Badge variant="outline">API</Badge>
                <span>EHR Integration</span>
              </h4>
              <p className="text-sm text-muted-foreground">
                Direct integration with Epic, Cerner, and other electronic health record systems
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <Badge variant="outline">HL7</Badge>
                <span>Clinical Data Exchange</span>
              </h4>
              <p className="text-sm text-muted-foreground">
                Standardized data sharing using HL7 FHIR protocols
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <Badge variant="outline">AI</Badge>
                <span>Treatment Recommendations</span>
              </h4>
              <p className="text-sm text-muted-foreground">
                AI-powered insights and treatment suggestions for providers
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center space-x-2">
                <Badge variant="outline">Telehealth</Badge>
                <span>Video Integration</span>
              </h4>
              <p className="text-sm text-muted-foreground">
                Built-in telehealth capabilities for remote consultations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
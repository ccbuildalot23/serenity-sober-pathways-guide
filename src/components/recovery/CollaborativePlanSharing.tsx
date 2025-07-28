import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCollaborativeRecoveryPlan, usePlanCollaborators } from '@/hooks/useCollaborativeRecoveryPlan';
import { Share2, Users, Mail, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export const CollaborativePlanSharing: React.FC = () => {
  const { plans, shareWithProvider } = useCollaborativeRecoveryPlan();
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [providerEmail, setProviderEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState<'read' | 'write'>('read');
  const [isSharing, setIsSharing] = useState(false);

  const { collaborators } = usePlanCollaborators(selectedPlan || null);

  const handleSharePlan = async () => {
    if (!selectedPlan || !providerEmail) return;

    setIsSharing(true);
    try {
      await shareWithProvider(selectedPlan, providerEmail, accessLevel);
      setProviderEmail('');
    } finally {
      setIsSharing(false);
    }
  };

  const activePlans = plans.filter(p => p.status === 'active' || p.status === 'draft');

  return (
    <div className="space-y-6">
      {/* Share Plan Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share Recovery Plan</span>
          </CardTitle>
          <CardDescription>
            Collaborate with healthcare providers by sharing your recovery plans
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
            <Select value={accessLevel} onValueChange={(value) => setAccessLevel(value as 'read' | 'write')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">View Only - Can see plans and progress</SelectItem>
                <SelectItem value="write">Edit Access - Can modify plans and add notes</SelectItem>
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

      {/* Current Collaborators */}
      {selectedPlan && collaborators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Current Collaborators</span>
            </CardTitle>
            <CardDescription>
              People who have access to this recovery plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Collaborator ID: {collaborator.collaborator_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {collaborator.role} • Invited {format(new Date(collaborator.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={
                        collaborator.status === 'accepted' ? 'default' :
                        collaborator.status === 'pending' ? 'secondary' : 'destructive'
                      }
                    >
                      {collaborator.status === 'accepted' && <Check className="h-3 w-3 mr-1" />}
                      {collaborator.status === 'declined' && <X className="h-3 w-3 mr-1" />}
                      {collaborator.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Plans Message */}
      {activePlans.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Share2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Plans to Share</h3>
            <p className="text-muted-foreground">
              Create a recovery plan first to start collaborating with providers
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
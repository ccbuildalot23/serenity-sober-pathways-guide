import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Settings, UserPlus, Users, Clock, MessageCircle, Shield, Bell, BellOff } from 'lucide-react';
import { useSupportNetwork } from '@/hooks/useSupportNetwork';
import { SupportMember } from '@/services/supportNetworkService';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface SupportNetworkWidgetProps {
  className?: string;
  showAddButton?: boolean;
}

export const SupportNetworkWidget: React.FC<SupportNetworkWidgetProps> = ({ 
  className = "", 
  showAddButton = true 
}) => {
  const { supportMembers, loading, stats, addSupportMember, updateMemberPermissions, sendAlert } = useSupportNetwork();
  const [selectedMember, setSelectedMember] = useState<SupportMember | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({
    email: '',
    relationshipType: ''
  });

  const getPresenceColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPresenceText = (member: SupportMember) => {
    if (member.do_not_disturb) return 'Do not disturb';
    if (member.presence_status === 'offline' && member.last_seen) {
      return `Last seen ${formatDistanceToNow(new Date(member.last_seen), { addSuffix: true })}`;
    }
    return member.presence_status?.charAt(0).toUpperCase() + member.presence_status?.slice(1);
  };

  const handleAddMember = async () => {
    if (!addMemberForm.email || !addMemberForm.relationshipType) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // In a real app, you'd search for the user by email first
      // For now, we'll use a placeholder user ID
      await addSupportMember('placeholder-user-id', addMemberForm.relationshipType);
      setShowAddDialog(false);
      setAddMemberForm({ email: '', relationshipType: '' });
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleSendAlert = async (member: SupportMember, alertType: string) => {
    try {
      await sendAlert(member.support_member_id, alertType, `Support requested from ${member.member_name}`);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleUpdatePermissions = async (permissions: Partial<SupportMember['permissions']>) => {
    if (!selectedMember) return;

    try {
      await updateMemberPermissions(selectedMember.id, permissions);
      setShowPermissionsDialog(false);
      setSelectedMember(null);
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Support Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Support Network
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {stats.activeMembers}/{stats.totalMembers} online
            </Badge>
            {showAddButton && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Support Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={addMemberForm.email}
                        onChange={(e) => setAddMemberForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="relationship">Relationship Type</Label>
                      <Select value={addMemberForm.relationshipType} onValueChange={(value) => setAddMemberForm(prev => ({ ...prev, relationshipType: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="family">Family Member</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="sponsor">Sponsor</SelectItem>
                          <SelectItem value="therapist">Therapist</SelectItem>
                          <SelectItem value="peer_supporter">Peer Supporter</SelectItem>
                          <SelectItem value="emergency_contact">Emergency Contact</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddMember}>
                        Add Member
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {supportMembers.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No support members added yet</p>
            {showAddButton && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setShowAddDialog(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Member
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {supportMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${getPresenceColor(member.presence_status || 'offline')}`}></div>
                    {member.do_not_disturb && (
                      <BellOff className="w-2 h-2 absolute -top-1 -right-1 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{member.member_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {member.relationship_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {getPresenceText(member)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendAlert(member, 'support_request')}
                    disabled={member.do_not_disturb}
                    className="px-2"
                  >
                    <MessageCircle className="w-3 h-3" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendAlert(member, 'crisis_alert')}
                    disabled={member.do_not_disturb}
                    className="px-2"
                  >
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                  </Button>
                  
                  <Dialog open={showPermissionsDialog && selectedMember?.id === member.id} onOpenChange={(open) => {
                    setShowPermissionsDialog(open);
                    if (!open) setSelectedMember(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedMember(member)}
                        className="px-2"
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Manage Permissions - {member.member_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>View Mood Ratings</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Allow viewing daily mood check-ins</p>
                          </div>
                          <Switch
                            checked={selectedMember?.permissions.view_mood}
                            onCheckedChange={(checked) => 
                              selectedMember && handleUpdatePermissions({ ...selectedMember.permissions, view_mood: checked })
                            }
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>View Check-ins</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Allow viewing detailed check-in responses</p>
                          </div>
                          <Switch
                            checked={selectedMember?.permissions.view_checkins}
                            onCheckedChange={(checked) => 
                              selectedMember && handleUpdatePermissions({ ...selectedMember.permissions, view_checkins: checked })
                            }
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Crisis Alerts</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Receive immediate crisis notifications</p>
                          </div>
                          <Switch
                            checked={selectedMember?.permissions.crisis_alerts}
                            onCheckedChange={(checked) => 
                              selectedMember && handleUpdatePermissions({ ...selectedMember.permissions, crisis_alerts: checked })
                            }
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Milestone Alerts</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Receive recovery milestone celebrations</p>
                          </div>
                          <Switch
                            checked={selectedMember?.permissions.milestone_alerts}
                            onCheckedChange={(checked) => 
                              selectedMember && handleUpdatePermissions({ ...selectedMember.permissions, milestone_alerts: checked })
                            }
                          />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {stats.totalMembers > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
              <Shield className="w-4 h-4" />
              <span>
                {stats.availableMembers} of {stats.totalMembers} members available • 
                {stats.emergencyContacts} emergency contacts
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
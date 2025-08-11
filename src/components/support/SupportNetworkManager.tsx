import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  UserPlus, 
  Users, 
  Phone, 
  Mail, 
  Edit2, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  MessageCircle,
  Heart,
  Star
} from 'lucide-react';
import { useSupportNetwork } from '@/hooks/useSupportNetwork';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { SupportMember } from '@/services/supportNetworkService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SupportNetworkManagerProps {
  className?: string;
  showAddButton?: boolean;
  showCrisisIntegration?: boolean;
}

export const SupportNetworkManager: React.FC<SupportNetworkManagerProps> = ({
  className = "",
  showAddButton = true,
  showCrisisIntegration = true
}) => {
  const { supportMembers, loading, stats, addSupportMember, updateMemberPermissions, sendAlert, refetch } = useSupportNetwork();
  const { contacts: emergencyContacts, addContact, deleteContact } = useEmergencyContacts();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SupportMember | null>(null);
  const [testingContact, setTestingContact] = useState<string | null>(null);
  
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: '',
    isEmergencyContact: false,
    permissions: {
      view_mood: true,
      view_checkins: true,
      crisis_alerts: true,
      milestone_alerts: true
    }
  });

  const relationshipTypes = [
    { value: 'family', label: 'Family Member' },
    { value: 'friend', label: 'Friend' },
    { value: 'sponsor', label: 'Sponsor' },
    { value: 'therapist', label: 'Therapist' },
    { value: 'peer_supporter', label: 'Peer Supporter' },
    { value: 'emergency_contact', label: 'Emergency Contact' }
  ];

  const getPresenceColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPresenceText = (member: SupportMember) => {
    if (member._do_not_disturb) return 'Do not disturb';
    if (member.presence_status === 'offline' && member.last_seen) {
      return `Last seen ${new Date(member.last_seen).toLocaleDateString()}`;
    }
    return member.presence_status?.charAt(0).toUpperCase() + member.presence_status?.slice(1);
  };

  const handleAddMember = async () => {
    if (!addForm.name.trim() || (!addForm.email.trim() && !addForm.phone.trim())) {
      toast.error('Please provide a name and either email or phone number');
      return;
    }

    try {
      // First, create or find the user profile
      let supporterId = null;
      
      if (addForm.email) {
        // Try to find existing user by email
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', addForm.email.trim())
          .single();

        if (existingUser) {
          supporterId = existingUser.id;
        } else {
          // Create new profile for external contact
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              full_name: addForm.name.trim(),
              email: addForm.email.trim(),
              phone: addForm.phone.trim() || null
            })
            .select('id')
            .single();

          if (profileError) throw profileError;
          supporterId = newProfile.id;
        }
      }

      // Add to support network
      await addSupportMember(supporterId || 'external', addForm.relationship);

      // If marked as emergency contact, also add to crisis contacts
      if (addForm.isEmergencyContact) {
        await addContact({
          name: addForm.name.trim(),
          phone_number: addForm.phone.trim(),
          relationship: addForm.relationship,
          priority_order: emergencyContacts.length + 1
        });
      }

      setAddForm({
        name: '',
        email: '',
        phone: '',
        relationship: '',
        isEmergencyContact: false,
        permissions: {
          view_mood: true,
          view_checkins: true,
          crisis_alerts: true,
          milestone_alerts: true
        }
      });
      setShowAddDialog(false);
      toast.success(`${addForm.name} added to your support network`);
    } catch (error) {
      console.error('Error adding support member:', error);
      toast.error('Failed to add support member');
    }
  };

  const handleEditMember = async (member: SupportMember) => {
    setSelectedMember(member);
    setShowEditDialog(true);
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this person from your support network?')) {
      return;
    }

    try {
      // Remove from support network
      const { error } = await supabase
        .from('support_network')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Support member removed');
      refetch();
    } catch (error) {
      console.error('Error removing support member:', error);
      toast.error('Failed to remove support member');
    }
  };

  const handleTestContact = async (member: SupportMember) => {
    setTestingContact(member.id);
    
    try {
      await sendAlert(member.id, {
        type: 'test_contact',
        title: 'Test Message',
        message: 'This is a test message to verify contact availability.',
        severity: 'low'
      });
      
      toast.success(`Test message sent to ${member.member_name}`);
    } catch (error) {
      console.error('Error testing contact:', error);
      toast.error('Failed to send test message');
    } finally {
      setTestingContact(null);
    }
  };

  const handleCrisisAlert = async () => {
    if (supportMembers.length === 0) {
      toast.error('No support network members available for crisis alert');
      return;
    }

    try {
      // Send crisis alert to all active members
      const crisisMembers = supportMembers.filter(m => 
        m.permissions.crisis_alerts && m._status === 'active'
      );

      if (crisisMembers.length === 0) {
        toast.error('No crisis-alert-enabled contacts available');
        return;
      }

      for (const member of crisisMembers) {
        await sendAlert(member.id, {
          type: 'crisis_alert',
          title: 'Crisis Alert',
          message: 'I need immediate support. Please contact me as soon as possible.',
          severity: 'crisis'
        });
      }

      toast.success(`Crisis alert sent to ${crisisMembers.length} support members`);
    } catch (error) {
      console.error('Error sending crisis alert:', error);
      toast.error('Failed to send crisis alert');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading support network...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header with Stats */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle>Support Network</CardTitle>
            </div>
            {showAddButton && (
              <Button onClick={() => setShowAddDialog(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalMembers}</div>
              <div className="text-sm text-gray-600">Total Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.activeMembers}</div>
              <div className="text-sm text-gray-600">Online Now</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.availableMembers}</div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.emergencyContacts}</div>
              <div className="text-sm text-gray-600">Emergency</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crisis Integration */}
      {showCrisisIntegration && supportMembers.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">Crisis Support</h3>
                  <p className="text-sm text-red-600">
                    Send immediate alert to your support network
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleCrisisAlert}
                variant="destructive"
                size="sm"
              >
                <Heart className="h-4 w-4 mr-2" />
                Send Crisis Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Support Network List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Your Support Network</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {supportMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Support Network Yet</h3>
              <p className="text-gray-600 mb-4">
                Add friends, family, or professionals to your support network for crisis situations.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {supportMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${getPresenceColor(member.presence_status)}`}></div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{member.member_name}</h4>
                        {member._relationship_type === 'emergency_contact' && (
                          <Badge variant="destructive" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Emergency
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {member._relationship_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{getPresenceText(member)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestContact(member)}
                      disabled={testingContact === member.id}
                    >
                      {testingContact === member.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditMember(member)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Support Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="Contact name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            
            <div>
              <Label htmlFor="relationship">Relationship *</Label>
              <Select value={addForm.relationship} onValueChange={(value) => setAddForm({ ...addForm, relationship: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {relationshipTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="emergency"
                checked={addForm.isEmergencyContact}
                onChange={(e) => setAddForm({ ...addForm, isEmergencyContact: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="emergency">Mark as emergency contact</Label>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button onClick={handleAddMember} className="flex-1">
                Add Contact
              </Button>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Support Contact</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={selectedMember.member_name} disabled />
              </div>
              
              <div>
                <Label>Email</Label>
                <Input value={selectedMember.member_email || ''} disabled />
              </div>
              
              <div>
                <Label>Relationship</Label>
                <Input value={selectedMember._relationship_type} disabled />
              </div>
              
              <div>
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {Object.entries(selectedMember.permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={key}
                        checked={value}
                        onChange={async (e) => {
                          try {
                            await updateMemberPermissions(selectedMember.id, {
                              ...selectedMember.permissions,
                              [key]: e.target.checked
                            });
                            toast.success('Permissions updated');
                          } catch (error) {
                            toast.error('Failed to update permissions');
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={key} className="text-sm">
                        {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

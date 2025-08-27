import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import logger from '../../services/loggerService';
import { 
  Plus, 
  Users, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  UserPlus,
  Shield,
  Heart,
  MessageCircle
} from 'lucide-react';
import { useSupportNetwork } from '@/hooks/useSupportNetwork';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { supabase } from '@/integrations/supabase/client';
import { emergencyFallback } from '@/lib/emergencyFallback';
import { toast } from 'sonner';

interface AddContactForm {
  name: string;
  email: string;
  phone: string;
  relationship: string;
  isEmergencyContact: boolean;
  permissions: {
    view_mood: boolean;
    view_checkins: boolean;
    crisis_alerts: boolean;
    milestone_alerts: boolean;
  };
}

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse/Partner' },
  { value: 'family', label: 'Family Member' },
  { value: 'friend', label: 'Friend' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'therapist', label: 'Therapist' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'counselor', label: 'Counselor' },
  { value: 'emergency_contact', label: 'Emergency Contact' },
  { value: 'other', label: 'Other' }
];

export const SupportNetworkManager: React.FC = () => {
  const { supportMembers, loading, addSupportMember, sendAlert } = useSupportNetwork();
  const { emergencyContacts = [], addContact, deleteContact } = useEmergencyContacts() as any;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState<AddContactForm>({
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

  const handleAddMember = async () => {
    if (!addForm.name.trim() || (!addForm.email.trim() && !addForm.phone.trim())) {
      toast.error('Please provide a name and either email or phone number');
      return;
    }

    try {
      let supporterId = null;
      
      try {
        // If email provided, check if user exists or create profile
        if (addForm.email) {
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

        // Add to emergency contacts if flagged
        if (addForm.isEmergencyContact) {
          await addContact({
            name: addForm.name.trim(),
            phone_number: addForm.phone.trim(),
            relationship: addForm.relationship,
            priority_order: emergencyContacts.length + 1
          });
        }

      } catch (dbError) {
        logger.warn('Database connection failed, using emergency fallback:', dbError, { component: 'SupportNetworkManager' });
        
        // Save to emergency fallback
        emergencyFallback.saveContact({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          phone: addForm.phone.trim(),
          relationship: addForm.relationship,
          is_emergency_contact: addForm.isEmergencyContact,
          permissions: addForm.permissions
        });
        
        toast.warning('Database unavailable - Contact saved locally');
      }

      // Reset form
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

  const handleSendCrisisAlert = async (memberId: string) => {
    try {
      await sendAlert(memberId, {
        type: 'crisis_alert',
        title: 'Crisis Alert',
        message: 'I need support right now.',
        severity: 'crisis'
      });
      toast.success('Crisis alert sent');
    } catch (error) {
      console.error('Error sending crisis alert:', error);
      toast.error('Failed to send crisis alert');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading your support network...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Network</h2>
          <p className="text-gray-600">Manage your recovery support team</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Support Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="relationship">Relationship *</Label>
                <Select value={addForm.relationship} onValueChange={(value) => setAddForm({ ...addForm, relationship: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="emergency"
                  checked={addForm.isEmergencyContact}
                  onCheckedChange={(checked) => setAddForm({ ...addForm, isEmergencyContact: checked })}
                />
                <Label htmlFor="emergency">Emergency Contact</Label>
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="view_mood"
                      checked={addForm.permissions.view_mood}
                      onCheckedChange={(checked) => setAddForm({
                        ...addForm,
                        permissions: { ...addForm.permissions, view_mood: checked }
                      })}
                    />
                    <Label htmlFor="view_mood" className="text-sm">View mood updates</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="view_checkins"
                      checked={addForm.permissions.view_checkins}
                      onCheckedChange={(checked) => setAddForm({
                        ...addForm,
                        permissions: { ...addForm.permissions, view_checkins: checked }
                      })}
                    />
                    <Label htmlFor="view_checkins" className="text-sm">View daily check-ins</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="crisis_alerts"
                      checked={addForm.permissions.crisis_alerts}
                      onCheckedChange={(checked) => setAddForm({
                        ...addForm,
                        permissions: { ...addForm.permissions, crisis_alerts: checked }
                      })}
                    />
                    <Label htmlFor="crisis_alerts" className="text-sm">Receive crisis alerts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="milestone_alerts"
                      checked={addForm.permissions.milestone_alerts}
                      onCheckedChange={(checked) => setAddForm({
                        ...addForm,
                        permissions: { ...addForm.permissions, milestone_alerts: checked }
                      })}
                    />
                    <Label htmlFor="milestone_alerts" className="text-sm">Receive milestone alerts</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember}>
                  Add Contact
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Emergency Contacts Section */}
      {emergencyContacts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Emergency Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emergencyContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div>
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-gray-600">{contact.phone_number}</div>
                    <Badge variant="outline" className="text-xs">{contact.relationship}</Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Support Network Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Support Network ({Array.isArray(supportMembers) ? supportMembers.length : 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!Array.isArray(supportMembers) || supportMembers.length === 0) ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts yet</h3>
              <p className="text-gray-600 mb-4">Add people who support your recovery journey</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Your First Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.isArray(supportMembers) && supportMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Heart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{member.member_name}</div>
                      <div className="text-sm text-gray-600">{member.member_email}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">{member._relationship_type}</Badge>
                        <div className={`w-2 h-2 rounded-full ${
                          member.presence_status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-xs text-gray-500">
                          {member.presence_status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendCrisisAlert(member.id)}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportNetworkManager;

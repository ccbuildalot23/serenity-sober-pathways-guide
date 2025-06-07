
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MessageSquare, 
  User, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  Heart,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CrisisContact {
  id: string;
  name: string;
  relationship: string;
  phone_number: string;
  email?: string;
  priority_order: number;
  notification_preferences: {
    crisis: boolean;
    milestones: boolean;
    preferredMethod: 'phone' | 'text' | 'both';
  };
  is_emergency_contact: boolean;
  response_time?: string;
  last_contacted?: Date;
}

const CrisisContactManager = () => {
  const [contacts, setContacts] = useState<CrisisContact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState<Partial<CrisisContact>>({
    name: '',
    relationship: '',
    phone_number: '',
    email: '',
    priority_order: 1,
    notification_preferences: {
      crisis: true,
      milestones: false,
      preferredMethod: 'both'
    },
    is_emergency_contact: true
  });

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crisis_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('priority_order', { ascending: true });

      if (error) {
        console.error('Error loading crisis contacts:', error);
        toast({
          title: "Error",
          description: "Failed to load your crisis contacts",
          variant: "destructive",
        });
        return;
      }

      const transformedContacts = (data || []).map(contact => ({
        id: contact.id,
        name: contact.name,
        relationship: contact.relationship,
        phone_number: contact.phone_number,
        email: contact.email,
        priority_order: contact.priority_order,
        notification_preferences: contact.notification_preferences as any,
        is_emergency_contact: contact.is_emergency_contact,
        response_time: contact.response_time,
        last_contacted: contact.last_contacted ? new Date(contact.last_contacted) : undefined
      }));

      setContacts(transformedContacts);
    } catch (error) {
      console.error('Error in loadContacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name?.trim() || !newContact.phone_number?.trim() || !user) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('crisis_contacts')
        .insert({
          user_id: user.id,
          name: newContact.name,
          relationship: newContact.relationship || 'Support Person',
          phone_number: newContact.phone_number,
          email: newContact.email || null,
          priority_order: contacts.length + 1,
          notification_preferences: newContact.notification_preferences!,
          is_emergency_contact: newContact.is_emergency_contact || false
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding crisis contact:', error);
        toast({
          title: "Error",
          description: "Failed to save contact. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const transformedContact = {
        id: data.id,
        name: data.name,
        relationship: data.relationship,
        phone_number: data.phone_number,
        email: data.email,
        priority_order: data.priority_order,
        notification_preferences: data.notification_preferences as any,
        is_emergency_contact: data.is_emergency_contact,
        response_time: data.response_time,
        last_contacted: data.last_contacted ? new Date(data.last_contacted) : undefined
      };

      setContacts([...contacts, transformedContact]);
      setNewContact({
        name: '',
        relationship: '',
        phone_number: '',
        email: '',
        priority_order: 1,
        notification_preferences: {
          crisis: true,
          milestones: false,
          preferredMethod: 'both'
        },
        is_emergency_contact: true
      });
      setIsAdding(false);
      
      toast({
        title: "Success",
        description: "Crisis contact added successfully!",
      });
    } catch (error) {
      console.error('Error in handleAddContact:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const movePriority = async (contactId: string, direction: 'up' | 'down') => {
    const contactIndex = contacts.findIndex(c => c.id === contactId);
    if (contactIndex === -1) return;

    const targetIndex = direction === 'up' ? contactIndex - 1 : contactIndex + 1;
    if (targetIndex < 0 || targetIndex >= contacts.length) return;

    try {
      const newContacts = [...contacts];
      [newContacts[contactIndex], newContacts[targetIndex]] = 
      [newContacts[targetIndex], newContacts[contactIndex]];

      // Update priority orders in database
      const updates = newContacts.map((contact, index) => ({
        id: contact.id,
        priority_order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('crisis_contacts')
          .update({ priority_order: update.priority_order })
          .eq('id', update.id)
          .eq('user_id', user!.id);

        if (error) {
          console.error('Error updating priority:', error);
          toast({
            title: "Error",
            description: "Failed to update priority order",
            variant: "destructive",
          });
          return;
        }
      }

      // Update local state
      newContacts.forEach((contact, index) => {
        contact.priority_order = index + 1;
      });

      setContacts(newContacts);
    } catch (error) {
      console.error('Error in movePriority:', error);
    }
  };

  const removeContact = async (contactId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('crisis_contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting crisis contact:', error);
        toast({
          title: "Error",
          description: "Failed to delete contact",
          variant: "destructive",
        });
        return;
      }

      const updatedContacts = contacts
        .filter(c => c.id !== contactId)
        .map((contact, index) => ({
          ...contact,
          priority_order: index + 1
        }));

      setContacts(updatedContacts);
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    } catch (error) {
      console.error('Error in removeContact:', error);
    }
  };

  const handleCall = async (contact: CrisisContact) => {
    try {
      const { error } = await supabase
        .from('crisis_contacts')
        .update({ last_contacted: new Date().toISOString() })
        .eq('id', contact.id)
        .eq('user_id', user!.id);

      if (error) {
        console.error('Error updating last contacted:', error);
      }

      const updatedContacts = contacts.map(c => 
        c.id === contact.id 
          ? { ...c, last_contacted: new Date() }
          : c
      );
      setContacts(updatedContacts);
      window.open(`tel:${contact.phone_number}`);
    } catch (error) {
      console.error('Error in handleCall:', error);
    }
  };

  const handleMessage = async (contact: CrisisContact) => {
    try {
      const { error } = await supabase
        .from('crisis_contacts')
        .update({ last_contacted: new Date().toISOString() })
        .eq('id', contact.id)
        .eq('user_id', user!.id);

      if (error) {
        console.error('Error updating last contacted:', error);
      }

      const updatedContacts = contacts.map(c => 
        c.id === contact.id 
          ? { ...c, last_contacted: new Date() }
          : c
      );
      setContacts(updatedContacts);
      const message = "I'm struggling right now and need support. Can you talk?";
      window.open(`sms:${contact.phone_number}&body=${encodeURIComponent(message)}`);
    } catch (error) {
      console.error('Error in handleMessage:', error);
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return <Badge className="bg-red-500">Priority 1</Badge>;
    if (priority === 2) return <Badge className="bg-orange-500">Priority 2</Badge>;
    if (priority === 3) return <Badge className="bg-yellow-500">Priority 3</Badge>;
    return <Badge variant="outline">Priority {priority}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold serenity-navy mb-2">Emergency Contacts</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-serenity-navy mx-auto mt-4"></div>
          <p className="text-gray-600 mt-2">Loading your contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Emergency Contacts</h3>
          <p className="text-sm text-gray-600">
            Manage your crisis support network with priority ordering
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Contact
        </Button>
      </div>

      {isAdding && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Add Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Contact name"
                  value={newContact.name || ''}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="relationship">Relationship *</Label>
                <Input
                  id="relationship"
                  placeholder="e.g., Sponsor, Family, Friend"
                  value={newContact.relationship || ''}
                  onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Phone number"
                  value={newContact.phone_number || ''}
                  onChange={(e) => setNewContact({...newContact, phone_number: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={newContact.email || ''}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="preferredMethod">Preferred Contact Method</Label>
              <Select 
                value={newContact.notification_preferences?.preferredMethod || 'both'}
                onValueChange={(value: 'phone' | 'text' | 'both') => 
                  setNewContact({
                    ...newContact, 
                    notification_preferences: {
                      ...newContact.notification_preferences!,
                      preferredMethod: value
                    }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="text">Text Message</SelectItem>
                  <SelectItem value="both">Both Phone & Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="crisisAlerts"
                checked={newContact.notification_preferences?.crisis || false}
                onCheckedChange={(checked) => 
                  setNewContact({
                    ...newContact,
                    notification_preferences: {
                      ...newContact.notification_preferences!,
                      crisis: checked
                    }
                  })
                }
              />
              <Label htmlFor="crisisAlerts">Notify during crisis events</Label>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleAddContact}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Add Emergency Contact'}
              </Button>
              <Button 
                onClick={() => setIsAdding(false)}
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {contacts
          .sort((a, b) => a.priority_order - b.priority_order)
          .map((contact, index) => (
          <Card key={contact.id} className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                      {getPriorityBadge(contact.priority_order)}
                    </div>
                    <p className="text-sm text-gray-600">{contact.relationship}</p>
                    <p className="text-xs text-gray-500">{contact.phone_number}</p>
                    {contact.last_contacted && (
                      <p className="text-xs text-green-600 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Last contacted: {new Date(contact.last_contacted).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Priority Controls */}
                  <div className="flex flex-col">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => movePriority(contact.id, 'up')}
                      disabled={index === 0}
                      className="h-6 p-1"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => movePriority(contact.id, 'down')}
                      disabled={index === contacts.length - 1}
                      className="h-6 p-1"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Contact Actions */}
                  <div className="flex space-x-1">
                    {(contact.notification_preferences.preferredMethod === 'phone' || 
                      contact.notification_preferences.preferredMethod === 'both') && (
                      <Button
                        size="sm"
                        onClick={() => handleCall(contact)}
                        className="bg-green-600 hover:bg-green-700 p-2"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                    {(contact.notification_preferences.preferredMethod === 'text' || 
                      contact.notification_preferences.preferredMethod === 'both') && (
                      <Button
                        size="sm"
                        onClick={() => handleMessage(contact)}
                        className="bg-blue-600 hover:bg-blue-700 p-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeContact(contact.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                {contact.notification_preferences.crisis && (
                  <span className="flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />
                    Crisis Alerts
                  </span>
                )}
                {contact.notification_preferences.milestones && (
                  <span className="flex items-center">
                    <Heart className="w-3 h-3 mr-1 text-green-500" />
                    Milestone Alerts
                  </span>
                )}
                <span>Preferred: {contact.notification_preferences.preferredMethod}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {contacts.length === 0 && !isAdding && (
        <Card className="p-6 text-center border-red-200">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-600 mb-2">No emergency contacts yet</h4>
          <p className="text-sm text-gray-500 mb-4">
            Add trusted people who can support you during crisis moments
          </p>
          <Button 
            onClick={() => setIsAdding(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            Add Your First Emergency Contact
          </Button>
        </Card>
      )}

      {contacts.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-800 mb-1">Crisis Contact Guidelines</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Priority 1 contacts will be notified first during emergencies</li>
                <li>• All contacts with crisis alerts enabled will receive notifications</li>
                <li>• Test your contacts regularly to ensure they're available</li>
                <li>• Include a mix of professional and personal support</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CrisisContactManager;

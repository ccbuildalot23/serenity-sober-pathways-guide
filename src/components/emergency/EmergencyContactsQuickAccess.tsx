
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Phone, 
  MessageSquare, 
  Plus, 
  MapPin, 
  AlertTriangle,
  User,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone_number: string;
  priority_order: number;
  notification_preferences: {
    crisis: boolean;
    preferredMethod: 'phone' | 'text' | 'both';
  };
  is_emergency_contact: boolean;
  last_contacted?: Date;
}

interface EmergencyContactsQuickAccessProps {
  onContactAdded?: (contact: EmergencyContact) => void;
  onContactCalled?: (contact: EmergencyContact) => void;
  onContactTexted?: (contact: EmergencyContact) => void;
}

const EmergencyContactsQuickAccess: React.FC<EmergencyContactsQuickAccessProps> = ({
  onContactAdded,
  onContactCalled,
  onContactTexted
}) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone_number: '',
    isPrimary: false
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
        .eq('is_emergency_contact', true)
        .order('priority_order', { ascending: true });

      if (error) {
        console.error('Error loading emergency contacts:', error);
        toast({
          title: "Error",
          description: "Failed to load your emergency contacts",
          variant: "destructive",
        });
        return;
      }

      const transformedContacts = (data || []).map(contact => ({
        id: contact.id,
        name: contact.name,
        relationship: contact.relationship,
        phone_number: contact.phone_number,
        priority_order: contact.priority_order,
        notification_preferences: contact.notification_preferences as any,
        is_emergency_contact: contact.is_emergency_contact,
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
    if (!newContact.name.trim() || !newContact.phone_number.trim() || !user) {
      toast({
        title: "Error",
        description: "Please fill in name and phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('crisis_contacts')
        .insert({
          user_id: user.id,
          name: newContact.name,
          relationship: newContact.relationship || 'Emergency Contact',
          phone_number: newContact.phone_number,
          priority_order: newContact.isPrimary ? 1 : contacts.length + 1,
          notification_preferences: {
            crisis: true,
            milestones: false,
            preferredMethod: 'both'
          },
          is_emergency_contact: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding emergency contact:', error);
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
        priority_order: data.priority_order,
        notification_preferences: data.notification_preferences as any,
        is_emergency_contact: data.is_emergency_contact,
        last_contacted: data.last_contacted ? new Date(data.last_contacted) : undefined
      };

      setContacts([...contacts, transformedContact]);
      onContactAdded?.(transformedContact);

      setNewContact({ name: '', relationship: '', phone_number: '', isPrimary: false });
      setIncludeLocation(false);
      setIsAdding(false);

      toast({
        title: "Success",
        description: `${transformedContact.name} added to emergency contacts`,
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

  const handleCall = async (contact: EmergencyContact) => {
    try {
      const { error } = await supabase
        .from('crisis_contacts')
        .update({ last_contacted: new Date().toISOString() })
        .eq('id', contact.id)
        .eq('user_id', user!.id);

      if (error) {
        console.error('Error updating last contacted:', error);
      }

      window.open(`tel:${contact.phone_number}`, '_self');
      onContactCalled?.(contact);
      
      toast({
        title: "Calling",
        description: `Calling ${contact.name}...`,
      });
    } catch (error) {
      console.error('Error in handleCall:', error);
    }
  };

  const handleText = async (contact: EmergencyContact) => {
    let message = "I'm struggling right now and need support. Can you talk?";
    
    if (includeLocation && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        
        const { latitude, longitude } = position.coords;
        message += ` My current location: https://maps.google.com/?q=${latitude},${longitude}`;
      } catch (error) {
        console.log('Location sharing failed, sending message without location');
      }
    }

    try {
      const { error } = await supabase
        .from('crisis_contacts')
        .update({ last_contacted: new Date().toISOString() })
        .eq('id', contact.id)
        .eq('user_id', user!.id);

      if (error) {
        console.error('Error updating last contacted:', error);
      }

      const encodedMessage = encodeURIComponent(message);
      window.open(`sms:${contact.phone_number}&body=${encodedMessage}`, '_self');
      onContactTexted?.(contact);

      toast({
        title: "Sending Message",
        description: `Sending crisis message to ${contact.name}...`,
      });
    } catch (error) {
      console.error('Error in handleText:', error);
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
        console.error('Error deleting emergency contact:', error);
        toast({
          title: "Error",
          description: "Failed to delete contact",
          variant: "destructive",
        });
        return;
      }

      const updatedContacts = contacts.filter(c => c.id !== contactId);
      setContacts(updatedContacts);
      toast({
        title: "Success",
        description: "Contact removed",
      });
    } catch (error) {
      console.error('Error in removeContact:', error);
    }
  };

  const crisisTextTemplates = [
    "I'm struggling right now and need support. Can you talk?",
    "Having a really difficult moment. Could use someone to check on me.",
    "I'm safe but need emotional support right now. Are you available?",
    "Going through a tough time and could use a friend to talk to."
  ];

  const primaryContacts = contacts.filter(c => c.priority_order <= 2);
  const secondaryContacts = contacts.filter(c => c.priority_order > 2);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading emergency contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-red-600">Emergency Contacts</h3>
          <p className="text-sm text-gray-600">Quick access for crisis situations</p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          size="sm"
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Contact
        </Button>
      </div>

      {/* Add Contact Form */}
      {isAdding && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <User className="w-5 h-5 mr-2" />
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
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  placeholder="e.g., Sponsor, Family, Friend"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Phone number"
                value={newContact.phone_number}
                onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="primary"
                checked={newContact.isPrimary}
                onCheckedChange={(checked) => setNewContact({ ...newContact, isPrimary: checked })}
              />
              <Label htmlFor="primary">Priority contact (called first)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="location"
                checked={includeLocation}
                onCheckedChange={setIncludeLocation}
              />
              <Label htmlFor="location">Share location in crisis messages</Label>
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

      {/* Priority Contacts */}
      {primaryContacts.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
            Priority Contacts
          </h4>
          <div className="space-y-2">
            {primaryContacts.map((contact) => (
              <Card key={contact.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{contact.name}</span>
                          <Badge className="bg-red-500 text-xs">Priority</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{contact.relationship}</p>
                        <p className="text-xs text-gray-500">{contact.phone_number}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        onClick={() => handleCall(contact)}
                        className="bg-green-600 hover:bg-green-700 p-2"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleText(contact)}
                        className="bg-blue-600 hover:bg-blue-700 p-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Secondary Contacts */}
      {secondaryContacts.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Other Emergency Contacts</h4>
          <div className="space-y-2">
            {secondaryContacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <span className="font-medium">{contact.name}</span>
                        <p className="text-sm text-gray-600">{contact.relationship}</p>
                        <p className="text-xs text-gray-500">{contact.phone_number}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        onClick={() => handleCall(contact)}
                        className="bg-green-600 hover:bg-green-700 p-2"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleText(contact)}
                        className="bg-blue-600 hover:bg-blue-700 p-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {contacts.length === 0 && !isAdding && (
        <Card className="p-6 text-center border-red-200">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-600 mb-2">No emergency contacts yet</h4>
          <p className="text-sm text-gray-500 mb-4">
            Add trusted people who can support you during crisis moments
          </p>
          <Button onClick={() => setIsAdding(true)} className="bg-red-600 hover:bg-red-700">
            Add Your First Emergency Contact
          </Button>
        </Card>
      )}

      {/* Crisis Text Templates */}
      {contacts.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Crisis Message Templates</h4>
          <div className="space-y-2">
            {crisisTextTemplates.map((template, index) => (
              <div key={index} className="text-sm text-blue-700 p-2 bg-white rounded border">
                "{template}"
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default EmergencyContactsQuickAccess;

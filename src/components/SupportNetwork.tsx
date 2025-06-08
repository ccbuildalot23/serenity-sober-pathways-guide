import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, User, Heart, MessageCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import CrisisProtocolSetup from './support/CrisisProtocolSetup';
import CheckInAccountability from './support/CheckInAccountability';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
}

const SupportNetwork = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showCrisisContacts, setShowCrisisContacts] = useState(false);

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
        .from('support_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading contacts:', error);
        toast({
          title: "Error",
          description: "Failed to load your support contacts",
          variant: "destructive",
        });
        return;
      }

      setContacts(data || []);
    } catch (error) {
      console.error('Error in loadContacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim() || !user) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('support_contacts')
        .insert({
          user_id: user.id,
          name: newContact.name,
          relationship: newContact.relationship || 'Support Person',
          phone: newContact.phone || null,
          email: newContact.email || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding contact:', error);
        toast({
          title: "Error",
          description: "Failed to save contact. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setContacts(prev => [...prev, data]);
      setNewContact({ name: '', relationship: '', phone: '', email: '' });
      setIsAdding(false);
      
      toast({
        title: "Success",
        description: "Contact added successfully!",
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

  const handleDeleteContact = async (contactId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('support_contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting contact:', error);
        toast({
          title: "Error",
          description: "Failed to delete contact",
          variant: "destructive",
        });
        return;
      }

      setContacts(prev => prev.filter(contact => contact.id !== contactId));
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    } catch (error) {
      console.error('Error in handleDeleteContact:', error);
    }
  };

  const handleCall = (contact: Contact) => {
    if (contact.phone) {
      console.log(`Calling ${contact.name} at ${contact.phone}`);
      window.open(`tel:${contact.phone}`);
    }
  };

  const handleMessage = (contact: Contact) => {
    if (contact.phone) {
      console.log(`Messaging ${contact.name} at ${contact.phone}`);
      window.open(`sms:${contact.phone}`);
    }
  };

  if (showCrisisContacts) {
    const CrisisContactManager = React.lazy(() => import('./emergency/CrisisContactManager'));
    return (
      <div>
        <div className="flex items-center mb-4">
          <Button
            onClick={() => setShowCrisisContacts(false)}
            variant="outline"
            size="sm"
          >
            ← Back
          </Button>
        </div>
        <React.Suspense fallback={<div>Loading...</div>}>
          <CrisisContactManager />
        </React.Suspense>
      </div>
    );
  }

  if (showSettings) {
    const SupportCircleSettings = React.lazy(() => import('./SupportCircleSettings'));
    return (
      <div>
        <div className="flex items-center mb-4">
          <Button
            onClick={() => setShowSettings(false)}
            variant="outline"
            size="sm"
          >
            ← Back
          </Button>
        </div>
        <React.Suspense fallback={<div>Loading...</div>}>
          <SupportCircleSettings />
        </React.Suspense>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold serenity-navy">Support Network</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-serenity-navy mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading your support contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold serenity-navy">Support Network</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCrisisContacts(true)}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-xs"
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            Crisis Contacts
          </Button>
          <Button
            onClick={() => setShowSettings(true)}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Settings
          </Button>
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            className="bg-serenity-emerald hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Crisis Contacts Quick Access */}
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-red-800 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Emergency Crisis Support
            </h4>
            <p className="text-sm text-red-600">
              Quick access to priority contacts for crisis situations
            </p>
          </div>
          <Button
            onClick={() => setShowCrisisContacts(true)}
            size="sm"
            className="bg-red-600 hover:bg-red-700"
          >
            Manage
          </Button>
        </div>
      </Card>

      {/* Crisis Protocol Setup */}
      <CrisisProtocolSetup />

      {/* Check-In Accountability */}
      <CheckInAccountability />

      {isAdding && (
        <Card className="p-4 animate-scale-in">
          <h4 className="font-semibold mb-4">Add Support Contact</h4>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={newContact.name}
              onChange={(e) => setNewContact({...newContact, name: e.target.value})}
            />
            <Input
              placeholder="Relationship (e.g., Sponsor, Family, Friend)"
              value={newContact.relationship}
              onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
            />
            <Input
              placeholder="Phone Number"
              value={newContact.phone}
              onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
            />
            <Input
              placeholder="Email Address (Optional)"
              value={newContact.email}
              onChange={(e) => setNewContact({...newContact, email: e.target.value})}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleAddContact}
                className="flex-1 bg-serenity-navy"
                disabled={saving || !newContact.name.trim()}
              >
                {saving ? 'Saving...' : 'Add Contact'}
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
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {contacts.map((contact) => (
          <Card key={contact.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold serenity-navy">{contact.name}</h4>
                  <p className="text-sm text-gray-600">{contact.relationship}</p>
                  {contact.phone && (
                    <p className="text-xs text-gray-500">{contact.phone}</p>
                  )}
                  {contact.email && (
                    <p className="text-xs text-gray-500">{contact.email}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                {contact.phone && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCall(contact)}
                      className="p-2"
                      title="Call"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMessage(contact)}
                      className="p-2"
                      title="Message"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-2 text-red-600 hover:text-red-700"
                  title="Delete"
                >
                  ×
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {contacts.length === 0 && !isAdding && (
        <Card className="p-6 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-600 mb-2">No contacts yet</h4>
          <p className="text-sm text-gray-500 mb-4">
            Add people who support your recovery journey
          </p>
          <Button 
            onClick={() => setIsAdding(true)}
            className="bg-serenity-emerald hover:bg-emerald-600"
          >
            Add Your First Contact
          </Button>
        </Card>
      )}
    </div>
  );
};

export default SupportNetwork;

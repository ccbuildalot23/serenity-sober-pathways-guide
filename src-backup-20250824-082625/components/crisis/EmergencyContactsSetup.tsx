import React, { useState } from 'react';
import { Plus, Trash2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEmergencyContacts, EmergencyContact } from '@/hooks/useEmergencyContacts';
import { toast } from 'sonner';

export const EmergencyContactsSetup: React.FC = () => {
  const [newContact, setNewContact] = useState({
    name: '',
    phone_number: '',
    relationship: '',
  });
  const [showForm, setShowForm] = useState(false);

  const { contacts, loading, saving, addContact, deleteContact } = useEmergencyContacts();

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newContact.name.trim() || !newContact.phone_number.trim()) {
      toast.error('Please fill in name and phone number');
      return;
    }

    // Basic phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = newContact.phone_number.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    try {
      await addContact({
        name: newContact.name.trim(),
        phone_number: newContact.phone_number.trim(),
        relationship: newContact.relationship.trim(),
        priority_order: contacts.length + 1,
      });
      
      setNewContact({ name: '', phone_number: '', relationship: '' });
      setShowForm(false);
      toast.success('Emergency contact added successfully');
    } catch (error) {
      toast.error('Failed to add emergency contact');
    }
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (confirm(`Remove ${name} from emergency contacts?`)) {
      try {
        await deleteContact(id);
        toast.success('Emergency contact removed');
      } catch (error) {
        toast.error('Failed to remove emergency contact');
      }
    }
  };

  const testCall = (phoneNumber: string, name: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
    toast.info(`Calling ${name}...`);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Emergency Contacts
          <Badge variant="outline">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {contacts.length > 0 && (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {contact.phone_number}
                    {contact.relationship && ` • ${contact.relationship}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => testCall(contact.phone_number, contact.name)}
                    size="sm"
                    variant="outline"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteContact(contact.id, contact.name)}
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Emergency Contact
          </Button>
        ) : (
          <form onSubmit={handleAddContact} className="space-y-3">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="Contact name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={newContact.phone_number}
                onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                placeholder="+1234567890"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                placeholder="e.g., Friend, Family, Therapist"
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Adding...' : 'Add Contact'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {contacts.length === 0 && !showForm && (
          <div className="text-center text-muted-foreground text-sm">
            Add at least one emergency contact to enable crisis support
          </div>
        )}
      </CardContent>
    </Card>
  );
};
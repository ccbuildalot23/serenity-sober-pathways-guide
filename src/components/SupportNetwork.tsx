import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, User, Heart, MessageCircle, AlertTriangle } from 'lucide-react';

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
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showCrisisContacts, setShowCrisisContacts] = useState(false);

  useEffect(() => {
    const savedContacts = localStorage.getItem('supportContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    } else {
      // Demo contacts
      const demoContacts = [
        { id: '1', name: 'Sarah (Sponsor)', relationship: 'Sponsor', phone: '555-0123' },
        { id: '2', name: 'Mom', relationship: 'Family', phone: '555-0124' },
        { id: '3', name: 'Dr. Johnson', relationship: 'Therapist', phone: '555-0125' }
      ];
      setContacts(demoContacts);
    }
  }, []);

  const saveContacts = (updatedContacts: Contact[]) => {
    setContacts(updatedContacts);
    localStorage.setItem('supportContacts', JSON.stringify(updatedContacts));
  };

  const handleAddContact = () => {
    if (!newContact.name.trim()) return;

    const contact: Contact = {
      id: Date.now().toString(),
      name: newContact.name,
      relationship: newContact.relationship || 'Support Person',
      phone: newContact.phone,
      email: newContact.email
    };

    saveContacts([...contacts, contact]);
    setNewContact({ name: '', relationship: '', phone: '', email: '' });
    setIsAdding(false);
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
            <div className="flex gap-2">
              <Button 
                onClick={handleAddContact}
                className="flex-1 bg-serenity-navy"
              >
                Add Contact
              </Button>
              <Button 
                onClick={() => setIsAdding(false)}
                variant="outline"
                className="flex-1"
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
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMessage(contact)}
                      className="p-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
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


import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, AlertTriangle } from 'lucide-react';
import { useSupportContacts } from '@/hooks/useSupportContacts';
import AddContactForm from './support/AddContactForm';
import ContactCard from './support/ContactCard';
import CrisisProtocolSetup from './support/CrisisProtocolSetup';
import CheckInAccountability from './support/CheckInAccountability';

const SupportNetwork = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [showCrisisContacts, setShowCrisisContacts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const { 
    contacts, 
    loading, 
    saving, 
    addContact, 
    deleteContact, 
    contactPerson 
  } = useSupportContacts();

  const handleAddContact = async (contactData: any) => {
    const success = await addContact(contactData);
    if (success) {
      setIsAdding(false);
    }
    return success;
  };

  const handleCall = (contact: any) => {
    contactPerson(contact);
  };

  const handleMessage = (contact: any) => {
    const message = "Hi! I could use some support right now. Are you available to talk?";
    contactPerson(contact, message);
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
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Support Network</h3>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Loading your support contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Support Network</h3>
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
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Crisis Contacts Quick Access */}
      <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-red-800 dark:text-red-200 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Emergency Crisis Support
            </h4>
            <p className="text-sm text-red-600 dark:text-red-300">
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

      {/* Add Contact Form */}
      {isAdding && (
        <AddContactForm
          onSubmit={handleAddContact}
          onCancel={() => setIsAdding(false)}
          loading={saving}
        />
      )}

      {/* Contacts List */}
      <div className="space-y-3">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onCall={handleCall}
            onMessage={handleMessage}
            onDelete={deleteContact}
          />
        ))}
      </div>

      {/* Empty State */}
      {contacts.length === 0 && !isAdding && (
        <Card className="p-6 text-center">
          <Users className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-600 dark:text-gray-300 mb-2">No contacts yet</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Add people who support your recovery journey
          </p>
          <Button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add Your First Contact
          </Button>
        </Card>
      )}
    </div>
  );
};

export default SupportNetwork;

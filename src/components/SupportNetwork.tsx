
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, AlertTriangle } from 'lucide-react';
import { useSupportContacts } from '@/hooks/useSupportContacts';
import AddContactForm from './support/AddContactForm';
import ContactCard from './support/ContactCard';
import CrisisProtocolSetup from './support/CrisisProtocolSetup';
import CheckInAccountability from './support/CheckInAccountability';
import CrisisContactManager from './emergency/CrisisContactManager';

const SupportNetwork = () => {
  const [isAdding, setIsAdding] = useState(_false);
  const [_showCrisisContacts, setShowCrisisContacts] = useState(_false);
  const [_showSettings, setShowSettings] = useState(_false);
  
  const { 
    contacts, 
    _loading, 
    saving, 
    addContact, 
    deleteContact, 
    contactPerson 
  } = useSupportContacts();

  const handleAddContact = async (_contactData: unknown) => {
    const success = await addContact(_contactData);
    if (success) {
      setIsAdding(_false);
    }
    return success;
  };

  const handleCall = (_contact: unknown) => {
    contactPerson(_contact);
  };

  const handleMessage = (_contact: unknown) => {
    const _message = "Hi! I could use some support right now. Are you available to talk?";
    contactPerson(_contact, _message);
  };

  if (_showCrisisContacts) {
    return (
      <div>
        <div className="flex items-center mb-4">
          <Button
            onClick={() => setShowCrisisContacts(_false)}
            variant="outline"
            size="sm"
          >
            ← Back
          </Button>
        </div>
        <CrisisContactManager />
      </div>
    );
  }

  if (_showSettings) {
    const SupportCircleSettings = React.lazy(() => import('./SupportCircleSettings'));
    return (
      <div>
        <div className="flex items-center mb-4">
          <Button
            onClick={() => setShowSettings(_false)}
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

  if (_loading) {
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
            onClick={() => setShowCrisisContacts(_true)}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-xs"
          >
            <AlertTriangle className="w-4 h-4 mr-1" />
            Crisis Contacts
          </Button>
          <Button
            onClick={() => setShowSettings(_true)}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Settings
          </Button>
          <Button
            onClick={() => setIsAdding(_true)}
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
            onClick={() => setShowCrisisContacts(_true)}
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
          onCancel={() => setIsAdding(_false)}
          _loading={saving}
        />
      )}

      {/* Contacts List */}
      <div className="space-y-3">
        {contacts.map((_contact) => (
          <ContactCard
            key={_contact.id}
            _contact={_contact}
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
            onClick={() => setIsAdding(_true)}
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

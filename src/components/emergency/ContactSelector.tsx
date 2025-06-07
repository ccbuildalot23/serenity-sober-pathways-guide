
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, AlertTriangle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
}

interface CrisisContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  priorityOrder: number;
  notificationPreferences: {
    crisis: boolean;
    preferredMethod: 'phone' | 'text' | 'both';
  };
  isEmergencyContact: boolean;
}

interface ContactSelectorProps {
  contacts: Contact[];
  phoneContacts: any[];
  selectedContacts: string[];
  onContactToggle: (contactId: string) => void;
  isLoadingPhoneContacts: boolean;
}

const ContactSelector = ({ 
  contacts, 
  phoneContacts, 
  selectedContacts, 
  onContactToggle,
  isLoadingPhoneContacts 
}: ContactSelectorProps) => {
  // Load crisis contacts from localStorage
  const getCrisisContacts = (): CrisisContact[] => {
    const saved = localStorage.getItem('crisisContacts');
    return saved ? JSON.parse(saved) : [];
  };

  const crisisContacts = getCrisisContacts()
    .filter(contact => contact.notificationPreferences.crisis)
    .sort((a, b) => a.priorityOrder - b.priorityOrder);

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return <Badge className="bg-red-500 text-xs">P1</Badge>;
    if (priority === 2) return <Badge className="bg-orange-500 text-xs">P2</Badge>;
    if (priority === 3) return <Badge className="bg-yellow-500 text-xs">P3</Badge>;
    return <Badge variant="outline" className="text-xs">P{priority}</Badge>;
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Alert these contacts:
      </label>
      
      {/* Crisis Emergency Contacts */}
      {crisisContacts.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center text-xs text-red-600 font-medium mb-2">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Emergency Crisis Contacts
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2 bg-red-50 border-red-200">
            {crisisContacts.map((contact) => (
              <div key={contact.id} className="flex items-center space-x-2">
                <Checkbox
                  id={contact.id}
                  checked={selectedContacts.includes(contact.id)}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      onContactToggle(contact.id);
                    } else if (checked === false) {
                      onContactToggle(contact.id);
                    }
                  }}
                />
                <label 
                  htmlFor={contact.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center space-x-2 flex-1"
                >
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-red-600" />
                    <span>{contact.name}</span>
                    {getPriorityBadge(contact.priorityOrder)}
                  </div>
                  <span className="text-xs text-gray-500">({contact.relationship})</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phone Emergency Contacts */}
      {phoneContacts.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center text-xs text-blue-600 font-medium mb-2">
            <Phone className="w-3 h-3 mr-1" />
            Phone Emergency Contacts
          </div>
          <div className="space-y-2 max-h-24 overflow-y-auto border rounded-md p-2 bg-blue-50">
            {phoneContacts.map((contact) => (
              <div key={contact.id} className="flex items-center space-x-2">
                <Checkbox
                  id={contact.id}
                  checked={selectedContacts.includes(contact.id)}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      onContactToggle(contact.id);
                    } else if (checked === false) {
                      onContactToggle(contact.id);
                    }
                  }}
                />
                <label 
                  htmlFor={contact.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {contact.name} ({contact.relationship})
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* App Contacts */}
      {contacts.length === 0 && crisisContacts.length === 0 ? (
        <div className="text-center p-4 border rounded-md bg-gray-50">
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 italic mb-2">
            No emergency contacts found
          </p>
          <p className="text-xs text-gray-500">
            Add contacts in Support Network settings or set up Emergency Contacts for crisis situations.
          </p>
        </div>
      ) : (
        contacts.length > 0 && (
          <div>
            <div className="flex items-center text-xs text-gray-600 font-medium mb-2">
              <User className="w-3 h-3 mr-1" />
              Support Network Contacts
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {contacts
                .filter(contact => contact.phone)
                .map((contact) => (
                <div key={contact.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={contact.id}
                    checked={selectedContacts.includes(contact.id)}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        onContactToggle(contact.id);
                      } else if (checked === false) {
                        onContactToggle(contact.id);
                      }
                    }}
                  />
                  <label 
                    htmlFor={contact.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {contact.name} ({contact.relationship})
                  </label>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ContactSelector;


import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
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
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Alert these contacts:
      </label>
      
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
                    } else {
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
      {contacts.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No contacts found. Add contacts in Support Network settings.
        </p>
      ) : (
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
                  } else {
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
      )}
    </div>
  );
};

export default ContactSelector;

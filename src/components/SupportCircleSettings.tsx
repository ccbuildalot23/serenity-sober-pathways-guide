
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Send, User, Phone } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  contactMethod: 'sms' | 'push' | 'both';
  shareLocation: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const SupportCircleSettings = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [testingContact, setTestingContact] = useState<string | null>(null);

  useEffect(() => {
    const savedContacts = localStorage.getItem('supportCircleContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  }, []);

  const saveContacts = (updatedContacts: Contact[]) => {
    setContacts(updatedContacts);
    localStorage.setItem('supportCircleContacts', JSON.stringify(updatedContacts));
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validateContact = (contact: Contact): string[] => {
    const contactErrors: string[] = [];
    
    if (!contact.name.trim()) {
      contactErrors.push('Name is required');
    }
    
    if (!contact.phone.trim()) {
      contactErrors.push('Phone number is required');
    } else if (!validatePhone(contact.phone)) {
      contactErrors.push('Please enter a valid phone number');
    }
    
    if (!contact.relationship.trim()) {
      contactErrors.push('Relationship is required');
    }
    
    return contactErrors;
  };

  const addContact = () => {
    if (contacts.length >= 5) {
      setErrors({ general: 'Maximum 5 contacts allowed' });
      return;
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      name: '',
      phone: '',
      relationship: '',
      contactMethod: 'both',
      shareLocation: false
    };

    saveContacts([...contacts, newContact]);
    setErrors({});
  };

  const updateContact = (id: string, field: keyof Contact, value: any) => {
    const updatedContacts = contacts.map(contact =>
      contact.id === id ? { ...contact, [field]: value } : contact
    );
    saveContacts(updatedContacts);
    
    // Clear field-specific errors when user starts typing
    if (errors[`${id}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`${id}_${field}`];
      setErrors(newErrors);
    }
  };

  const removeContact = (id: string) => {
    const updatedContacts = contacts.filter(contact => contact.id !== id);
    saveContacts(updatedContacts);
    
    // Clear any errors for this contact
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(id)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  const sendTestAlert = async (contact: Contact) => {
    const contactErrors = validateContact(contact);
    
    if (contactErrors.length > 0) {
      const newErrors: FormErrors = {};
      contactErrors.forEach(error => {
        if (error.includes('Name')) newErrors[`${contact.id}_name`] = error;
        if (error.includes('Phone')) newErrors[`${contact.id}_phone`] = error;
        if (error.includes('Relationship')) newErrors[`${contact.id}_relationship`] = error;
      });
      setErrors(newErrors);
      return;
    }

    setTestingContact(contact.id);
    
    // Simulate API call
    setTimeout(() => {
      setTestingContact(null);
      console.log(`Test alert sent to ${contact.name} (${contact.phone}) via ${contact.contactMethod}`);
      // In a real app, this would trigger actual SMS/push notification
    }, 2000);
  };

  const saveAllContacts = () => {
    const allErrors: FormErrors = {};
    let hasErrors = false;

    contacts.forEach(contact => {
      const contactErrors = validateContact(contact);
      contactErrors.forEach(error => {
        hasErrors = true;
        if (error.includes('Name')) allErrors[`${contact.id}_name`] = error;
        if (error.includes('Phone')) allErrors[`${contact.id}_phone`] = error;
        if (error.includes('Relationship')) allErrors[`${contact.id}_relationship`] = error;
      });
    });

    if (hasErrors) {
      setErrors(allErrors);
      return;
    }

    setErrors({});
    console.log('All contacts saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold serenity-navy mb-2">Support Circle Settings</h2>
        <p className="text-gray-600">
          Add up to 5 trusted contacts who can help during difficult moments
        </p>
      </div>

      {errors.general && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600 text-sm">{errors.general}</p>
        </Card>
      )}

      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <Card key={contact.id} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="font-semibold serenity-navy">Contact {index + 1}</h4>
              </div>
              <Button
                onClick={() => removeContact(contact.id)}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor={`name_${contact.id}`}>Name *</Label>
                <Input
                  id={`name_${contact.id}`}
                  value={contact.name}
                  onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                  placeholder="Enter contact name"
                  className={errors[`${contact.id}_name`] ? 'border-red-500' : ''}
                />
                {errors[`${contact.id}_name`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`${contact.id}_name`]}</p>
                )}
              </div>

              <div>
                <Label htmlFor={`phone_${contact.id}`}>Phone Number *</Label>
                <Input
                  id={`phone_${contact.id}`}
                  value={contact.phone}
                  onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                  placeholder="Enter phone number"
                  type="tel"
                  className={errors[`${contact.id}_phone`] ? 'border-red-500' : ''}
                />
                {errors[`${contact.id}_phone`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`${contact.id}_phone`]}</p>
                )}
              </div>

              <div>
                <Label htmlFor={`relationship_${contact.id}`}>Relationship *</Label>
                <Input
                  id={`relationship_${contact.id}`}
                  value={contact.relationship}
                  onChange={(e) => updateContact(contact.id, 'relationship', e.target.value)}
                  placeholder="e.g., Sponsor, Family, Friend"
                  className={errors[`${contact.id}_relationship`] ? 'border-red-500' : ''}
                />
                {errors[`${contact.id}_relationship`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`${contact.id}_relationship`]}</p>
                )}
              </div>

              <div>
                <Label htmlFor={`contact_method_${contact.id}`}>Preferred Contact Method</Label>
                <Select 
                  value={contact.contactMethod} 
                  onValueChange={(value: 'sms' | 'push' | 'both') => 
                    updateContact(contact.id, 'contactMethod', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS Only</SelectItem>
                    <SelectItem value="push">Push Notification Only</SelectItem>
                    <SelectItem value="both">Both SMS & Push</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`location_${contact.id}`}
                    checked={contact.shareLocation}
                    onCheckedChange={(checked) => updateContact(contact.id, 'shareLocation', checked)}
                  />
                  <Label htmlFor={`location_${contact.id}`}>Share location with this contact</Label>
                </div>
              </div>

              <Button
                onClick={() => sendTestAlert(contact)}
                disabled={testingContact === contact.id}
                variant="outline"
                className="w-full"
              >
                {testingContact === contact.id ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Sending Test...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="w-4 h-4 mr-2" />
                    Send Test Alert
                  </div>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {contacts.length < 5 && (
        <Button
          onClick={addContact}
          className="w-full bg-serenity-emerald hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Contact ({contacts.length}/5)
        </Button>
      )}

      {contacts.length === 0 && (
        <Card className="p-6 text-center">
          <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-600 mb-2">No contacts added yet</h4>
          <p className="text-sm text-gray-500 mb-4">
            Add trusted people who can support you during difficult moments
          </p>
        </Card>
      )}

      {contacts.length > 0 && (
        <Button
          onClick={saveAllContacts}
          className="w-full bg-serenity-navy hover:bg-blue-800"
          size="lg"
        >
          Save All Contacts
        </Button>
      )}
    </div>
  );
};

export default SupportCircleSettings;


import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Send, User, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import logger from '../services/loggerService';

interface Contact {
  id: string;
  _name: string;
  _phone: string;
  _relationship: string;
  _contact_method: 'sms' | 'push' | 'both';
  share_location: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const SupportCircleSettings = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [testingContact, setTestingContact] = useState<string | null>(null);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const { data, _error } = await supabase
        .from('support_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (_error) {
        console._error('Error _loading contacts:', _error);
        toast({
          title: "Error",
          _description: "Failed to load your support contacts",
          _variant: "destructive",
        });
        return;
      }

      // Transform data to match component interface
      const _transformedContacts = (data || []).map(contact => ({
        id: contact.id,
        _name: contact._name,
        _phone: contact._phone || '',
        _relationship: contact._relationship,
        _contact_method: (contact._contact_method || 'both') as 'sms' | 'push' | 'both',
        share_location: contact.share_location || false
      }));

      setContacts(_transformedContacts);
    } catch (_error) {
      console._error('Error in loadContacts:', _error);
    } finally {
      setLoading(false);
    }
  };

  const validatePhone = (_phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(_phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validateContact = (contact: Contact): string[] => {
    const contactErrors: string[] = [];
    
    if (!contact._name.trim()) {
      contactErrors.push('Name is required');
    }
    
    if (!contact._phone.trim()) {
      contactErrors.push('Phone number is required');
    } else if (!validatePhone(contact._phone)) {
      contactErrors.push('Please enter a valid _phone number');
    }
    
    if (!contact._relationship.trim()) {
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
      id: `temp_${Date.now()}`,
      _name: '',
      _phone: '',
      _relationship: '',
      _contact_method: 'both',
      share_location: false
    };

    setContacts([...contacts, newContact]);
    setErrors({});
  };

  const updateContact = (id: string, field: keyof Contact, value: unknown) => {
    const _updatedContacts = contacts.map(contact =>
      contact.id === id ? { ...contact, [field]: value } : contact
    );
    setContacts(_updatedContacts);
    
    // Clear field-specific errors when user starts typing
    if (errors[`${id}_${field}`]) {
      const _newErrors = { ...errors };
      delete _newErrors[`${id}_${field}`];
      setErrors(_newErrors);
    }
  };

  const removeContact = async (id: string) => {
    if (!user) return;

    // If it's a temporary contact (not saved yet), just remove from state
    if (id.startsWith('temp_')) {
      const _updatedContacts = contacts.filter(contact => contact.id !== id);
      setContacts(_updatedContacts);
      return;
    }

    try {
      const { _error } = await supabase
        .from('support_contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (_error) {
        console._error('Error deleting contact:', _error);
        toast({
          title: "Error",
          _description: "Failed to delete contact",
          _variant: "destructive",
        });
        return;
      }

      const _updatedContacts = contacts.filter(contact => contact.id !== id);
      setContacts(_updatedContacts);
      
      // Clear any errors for this contact
      const _newErrors = { ...errors };
      Object.keys(_newErrors).forEach(key => {
        if (key.startsWith(id)) {
          delete _newErrors[key];
        }
      });
      setErrors(_newErrors);

      toast({
        title: "Success",
        _description: "Contact deleted successfully",
      });
    } catch (_error) {
      console._error('Error in removeContact:', _error);
    }
  };

  const sendTestAlert = async (contact: Contact) => {
    const contactErrors = validateContact(contact);
    
    if (contactErrors.length > 0) {
      const _newErrors: FormErrors = {};
      contactErrors.forEach(_error => {
        if (_error.includes('Name')) _newErrors[`${contact.id}_name`] = _error;
        if (_error.includes('Phone')) _newErrors[`${contact.id}_phone`] = _error;
        if (_error.includes('Relationship')) _newErrors[`${contact.id}_relationship`] = _error;
      });
      setErrors(_newErrors);
      return;
    }

    setTestingContact(contact.id);
    
    // Simulate API call
    setTimeout(() => {
      setTestingContact(null);
      logger.debug(`Test alert sent to ${contact._name} (${contact._phone}, { component: 'SupportCircleSettings' }); via ${contact._contact_method}`);
      toast({
        title: "Test Alert Sent",
        _description: `Alert sent to ${contact._name} via ${contact._contact_method}`,
      });
    }, 2000);
  };

  const saveAllContacts = async () => {
    if (!user) return;

    const _allErrors: FormErrors = {};
    let _hasErrors = false;

    contacts.forEach(contact => {
      const contactErrors = validateContact(contact);
      contactErrors.forEach(_error => {
        _hasErrors = true;
        if (_error.includes('Name')) _allErrors[`${contact.id}_name`] = _error;
        if (_error.includes('Phone')) _allErrors[`${contact.id}_phone`] = _error;
        if (_error.includes('Relationship')) _allErrors[`${contact.id}_relationship`] = _error;
      });
    });

    if (_hasErrors) {
      setErrors(_allErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      // Separate existing and new contacts
      const existingContacts = contacts.filter(c => !c.id.startsWith('temp_'));
      const newContacts = contacts.filter(c => c.id.startsWith('temp_'));

      // Update existing contacts
      for (const contact of existingContacts) {
        const { _error } = await supabase
          .from('support_contacts')
          .update({
            _name: contact._name,
            _relationship: contact._relationship,
            _phone: contact._phone || null,
            _contact_method: contact._contact_method,
            share_location: contact.share_location,
            _updated_at: new Date().toISOString()
          })
          .eq('id', contact.id)
          .eq('user_id', user.id);

        if (_error) {
          console._error('Error updating contact:', _error);
          throw _error;
        }
      }

      // Insert new contacts
      if (newContacts.length > 0) {
        const { data, _error } = await supabase
          .from('support_contacts')
          .insert(
            newContacts.map(contact => ({
              user_id: user.id,
              _name: contact._name,
              _relationship: contact._relationship,
              _phone: contact._phone || null,
              _contact_method: contact._contact_method,
              share_location: contact.share_location
            }))
          )
          .select();

        if (_error) {
          console._error('Error inserting contacts:', _error);
          throw _error;
        }

        // Update the state with the real IDs from the database
        const _updatedContacts = [
          ...existingContacts,
          ...(data || []).map(contact => ({
            id: contact.id,
            _name: contact._name,
            _phone: contact._phone || '',
            _relationship: contact._relationship,
            _contact_method: (contact._contact_method || 'both') as 'sms' | 'push' | 'both',
            share_location: contact.share_location || false
          }))
        ];
        setContacts(_updatedContacts);
      }

      toast({
        title: "Success",
        _description: "All contacts saved successfully!",
      });
    } catch (_error) {
      console._error('Error saving contacts:', _error);
      toast({
        title: "Error",
        _description: "Failed to save contacts. Please try again.",
        _variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (_loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold serenity-navy mb-2">Support Circle Settings</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-serenity-navy mx-auto mt-4"></div>
          <p className="text-gray-600 mt-2">Loading your contacts...</p>
        </div>
      </div>
    );
  }

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
                _variant="outline"
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
                  value={contact._name}
                  onChange={(e) => updateContact(contact.id, '_name', e.target.value)}
                  placeholder="Enter contact _name"
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
                  value={contact._phone}
                  onChange={(e) => updateContact(contact.id, '_phone', e.target.value)}
                  placeholder="Enter _phone number"
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
                  value={contact._relationship}
                  onChange={(e) => updateContact(contact.id, '_relationship', e.target.value)}
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
                  value={contact._contact_method} 
                  onValueChange={(value: 'sms' | 'push' | 'both') => 
                    updateContact(contact.id, '_contact_method', value)
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
                    _checked={contact.share_location}
                    onCheckedChange={(_checked) => updateContact(contact.id, 'share_location', _checked)}
                  />
                  <Label htmlFor={`location_${contact.id}`}>Share location with this contact</Label>
                </div>
              </div>

              <Button
                onClick={() => sendTestAlert(contact)}
                disabled={testingContact === contact.id}
                _variant="outline"
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
          disabled={saving}
        >
          {saving ? 'Saving All Contacts...' : 'Save All Contacts'}
        </Button>
      )}
    </div>
  );
};

export default SupportCircleSettings;

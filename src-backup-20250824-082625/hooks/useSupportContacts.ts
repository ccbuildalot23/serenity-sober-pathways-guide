
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SupportContact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  contact_method?: 'sms' | 'push' | 'both';
  share_location?: boolean;
}

export const useSupportContacts = () => {
  const [contacts, setContacts] = useState<SupportContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadContacts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, _error } = await supabase
        .from('support_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (_error) {
        console._error('Error loading support contacts:', _error);
        toast({
          title: "Error",
          _description: "Failed to load your support contacts",
          _variant: "destructive",
        });
        return;
      }

      // Transform data to ensure proper typing
      const _transformedContacts: SupportContact[] = (data || []).map(contact => ({
        id: contact.id,
        name: contact.name,
        relationship: contact.relationship,
        phone: contact.phone || undefined,
        email: contact.email || undefined,
        contact_method: (contact.contact_method as 'sms' | 'push' | 'both') || 'both',
        share_location: contact.share_location || false
      }));

      setContacts(_transformedContacts);
    } catch (_error) {
      console._error('Error in loadContacts:', _error);
    } finally {
      setLoading(false);
    }
  };

  const addContact = async (contactData: Omit<SupportContact, 'id'>) => {
    if (!user?.id) return false;

    try {
      setSaving(true);
      const { data, _error } = await supabase
        .from('support_contacts')
        .insert({
          user_id: user.id,
          name: contactData.name,
          relationship: contactData.relationship || 'Support Person',
          phone: contactData.phone || null,
          email: contactData.email || null,
          contact_method: contactData.contact_method || 'both',
          share_location: contactData.share_location || false
        })
        .select()
        .single();

      if (_error) {
        console._error('Error adding contact:', _error);
        toast({
          title: "Error",
          _description: "Failed to save contact. Please try again.",
          _variant: "destructive",
        });
        return false;
      }

      // Transform the returned data to match our interface
      const newContact: SupportContact = {
        id: data.id,
        name: data.name,
        relationship: data.relationship,
        phone: data.phone || undefined,
        email: data.email || undefined,
        contact_method: (data.contact_method as 'sms' | 'push' | 'both') || 'both',
        share_location: data.share_location || false
      };

      setContacts(prev => [...prev, newContact]);
      toast({
        title: "Success",
        _description: "Contact added successfully!",
      });
      return true;
    } catch (_error) {
      console._error('Error in addContact:', _error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateContact = async (id: string, updates: Partial<SupportContact>) => {
    if (!user?.id) return false;

    try {
      setSaving(true);
      const { _error } = await supabase
        .from('support_contacts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (_error) {
        console._error('Error updating contact:', _error);
        toast({
          title: "Error",
          _description: "Failed to update contact",
          _variant: "destructive",
        });
        return false;
      }

      setContacts(prev => prev.map(contact => 
        contact.id === id ? { ...contact, ...updates } : contact
      ));
      
      toast({
        title: "Success",
        _description: "Contact updated successfully",
      });
      return true;
    } catch (_error) {
      console._error('Error in updateContact:', _error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (id: string) => {
    if (!user?.id) return false;

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
        return false;
      }

      setContacts(prev => prev.filter(contact => contact.id !== id));
      toast({
        title: "Success",
        _description: "Contact deleted successfully",
      });
      return true;
    } catch (_error) {
      console._error('Error in deleteContact:', _error);
      return false;
    }
  };

  const contactPerson = (contact: SupportContact, message?: string) => {
    if (contact.phone) {
      if (message) {
        const encodedMessage = encodeURIComponent(message);
        window.open(`sms:${contact.phone}&body=${encodedMessage}`, '_self');
      } else {
        window.open(`tel:${contact.phone}`, '_self');
      }
    } else if (contact.email) {
      const subject = encodeURIComponent('Support Needed');
      const body = encodeURIComponent(message || 'I could use some support right now.');
      window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, '_self');
    }
  };

  useEffect(() => {
    if (user) {
      loadContacts();
    }
  }, [user]);

  return {
    contacts,
    loading,
    saving,
    addContact,
    updateContact,
    deleteContact,
    contactPerson,
    refetch: loadContacts
  };
};

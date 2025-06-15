
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
      const { data, error } = await supabase
        .from('support_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading support contacts:', error);
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

  const addContact = async (contactData: Omit<SupportContact, 'id'>) => {
    if (!user?.id) return false;

    try {
      setSaving(true);
      const { data, error } = await supabase
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

      if (error) {
        console.error('Error adding contact:', error);
        toast({
          title: "Error",
          description: "Failed to save contact. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      setContacts(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Contact added successfully!",
      });
      return true;
    } catch (error) {
      console.error('Error in addContact:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateContact = async (id: string, updates: Partial<SupportContact>) => {
    if (!user?.id) return false;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('support_contacts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating contact:', error);
        toast({
          title: "Error",
          description: "Failed to update contact",
          variant: "destructive",
        });
        return false;
      }

      setContacts(prev => prev.map(contact => 
        contact.id === id ? { ...contact, ...updates } : contact
      ));
      
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      return true;
    } catch (error) {
      console.error('Error in updateContact:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (id: string) => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('support_contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting contact:', error);
        toast({
          title: "Error",
          description: "Failed to delete contact",
          variant: "destructive",
        });
        return false;
      }

      setContacts(prev => prev.filter(contact => contact.id !== id));
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
      return true;
    } catch (error) {
      console.error('Error in deleteContact:', error);
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

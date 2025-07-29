import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Use the existing crisis_contacts table instead
export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  relationship?: string;
  priority_order: number;
  created_at: string;
  updated_at: string;
  is_emergency_contact?: boolean;
  last_contacted?: string;
  response_time?: string;
  email?: string;
  notification_preferences?: any;
}

export const useEmergencyContacts = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const loadContacts = async () => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('crisis_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('priority_order', { ascending: true });

      if (error) throw error;
      setContacts(data?.map(contact => ({
        ...contact,
        phone_number: contact.phone_number || '',
        relationship: contact.relationship || ''
      })) || []);
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addContact = async (contactData: {
    name: string;
    phone_number: string;
    relationship?: string;
    priority_order: number;
  }) => {
    if (!user) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('crisis_contacts')
        .insert({
          user_id: user.id,
          name: contactData.name,
          phone_number: contactData.phone_number,
          relationship: contactData.relationship || '',
          priority_order: contactData.priority_order,
          is_emergency_contact: true,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const newContact = {
          ...data,
          phone_number: data.phone_number || '',
          relationship: data.relationship || ''
        };
        setContacts(prev => [...prev, newContact]);
        return newContact;
      }
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateContact = async (id: string, updates: Partial<EmergencyContact>) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('crisis_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        const updatedContact = {
          ...data,
          phone_number: data.phone_number || '',
          relationship: data.relationship || ''
        };
        setContacts(prev => prev.map(c => c.id === id ? updatedContact : c));
        return updatedContact;
      }
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteContact = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('crisis_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [user]);

  return {
    contacts,
    loading,
    saving,
    addContact,
    updateContact,
    deleteContact,
    refetch: loadContacts,
  };
};
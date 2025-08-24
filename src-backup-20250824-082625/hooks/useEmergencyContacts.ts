// Support Network Hook - Your lifelines when you need them
// These are the people who love you and want to help

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompassionateError } from './useCompassionateError';
import { toast } from 'sonner';

export interface SupportPerson {
  id: string;
  user_id: string;
  name: string;
  phone_number: string;
  relationship?: string;
  _priority_order: number;
  created_at: string;
  updated_at: string;
  _is_emergency_contact?: boolean;
  last_contacted?: string;
  response_time?: string;
  email?: string;
  notification_preferences?: unknown;
}

// Backward compatibility
export type EmergencyContact = SupportPerson;

export const useSupportNetwork = () => {
  const [supportPeople, setSupportPeople] = useState<SupportPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { withCompassion, handleError } = useCompassionateError();

  const loadSupportNetwork = async () => {
    if (!user) {
      setSupportPeople([]);
      setLoading(false);
      return;
    }

    const result = await withCompassion(
      async () => {
        const { data, error } = await supabase
          .from('crisis_contacts')
          .select('*')
          .eq('user_id', user.id)
          .order('_priority_order', { ascending: true });

        if (error) throw error;
        return data || [];
      },
      {
        action: 'load support network',
        isRecoverable: true,
        retry: loadSupportNetwork
      }
    );

    if (result) {
      setSupportPeople(result.map(contact => ({
        ...contact,
        phone_number: contact.phone_number || '',
        relationship: contact.relationship || ''
      })));
    }
    
    setLoading(false);
  };

  const addSupportPerson = async (personData: {
    name: string;
    phone_number: string;
    relationship?: string;
    _priority_order: number;
  }) => {
    if (!user) {
      toast.error("Please sign in first", {
        description: "We need to know who you are to save your support network"
      });
      return;
    }

    setSaving(true);
    
    const result = await withCompassion(
      async () => {
        const { data, error } = await supabase
          .from('crisis_contacts')
          .insert({
            user_id: user.id,
            name: personData.name,
            phone_number: personData.phone_number,
            relationship: personData.relationship || '',
            _priority_order: personData._priority_order,
            _is_emergency_contact: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      {
        action: 'add support person',
        isRecoverable: true,
        retry: () => addSupportPerson(personData)
      }
    );

    if (result) {
      const newPerson = {
        ...result,
        phone_number: result.phone_number || '',
        relationship: result.relationship || ''
      };
      setSupportPeople(prev => [...prev, newPerson]);
      
      toast.success(`${personData.name} added to your support network`, {
        description: "They're ready to help when you need them",
        _duration: 3000
      });
      
      return newPerson;
    }
    
    setSaving(false);
  };

  const updateSupportPerson = async (id: string, _updates: Partial<SupportPerson>) => {
    setSaving(true);
    
    const result = await withCompassion(
      async () => {
        const { data, error } = await supabase
          .from('crisis_contacts')
          .update(_updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      },
      {
        action: 'update support person',
        isRecoverable: true,
        retry: () => updateSupportPerson(id, _updates)
      }
    );

    if (result) {
      const updatedPerson = {
        ...result,
        phone_number: result.phone_number || '',
        relationship: result.relationship || ''
      };
      setSupportPeople(prev => prev.map(p => p.id === id ? updatedPerson : p));
      
      toast.success("Updated successfully", {
        description: "Your support network is up to date",
        _duration: 2000
      });
      
      return updatedPerson;
    }
    
    setSaving(false);
  };

  const removeSupportPerson = async (id: string) => {
    // Find the person first for the confirmation message
    const person = supportPeople.find(p => p.id === id);
    
    setSaving(true);
    
    const success = await withCompassion(
      async () => {
        const { error } = await supabase
          .from('crisis_contacts')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      },
      {
        action: 'remove support person',
        isRecoverable: false
      }
    );

    if (success) {
      setSupportPeople(prev => prev.filter(p => p.id !== id));
      
      toast.info(`${person?.name || 'Contact'} removed`, {
        description: "You can always add them back later",
        _duration: 3000
      });
    }
    
    setSaving(false);
  };

  // Quick dial function for emergencies
  const quickDial = (person: SupportPerson) => {
    if (person.phone_number) {
      window.location.href = `tel:${person.phone_number}`;
      
      // Track that they reached out
      toast.success("Calling for support", {
        description: "You're doing the right thing by reaching out",
        _duration: 3000
      });
    }
  };

  useEffect(() => {
    loadSupportNetwork();
  }, [user]);

  return {
    supportPeople,
    loading,
    saving,
    addSupportPerson,
    updateSupportPerson,
    removeSupportPerson,
    quickDial,
    refresh: loadSupportNetwork,
    hasSupport: supportPeople.length > 0,
    // Backward compatibility
    contacts: supportPeople,
    // Add alias for components expecting `emergencyContacts`
    emergencyContacts: supportPeople,
    addContact: addSupportPerson,
    updateContact: updateSupportPerson,
    deleteContact: removeSupportPerson,
    refetch: loadSupportNetwork
  };
};

// Backward compatibility
export const useEmergencyContacts = useSupportNetwork;
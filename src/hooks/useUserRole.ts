import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'user' | 'supporter' | 'both';

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is a supporter for anyone
        const { data: supporterData } = await supabase
          .from('support_contacts')
          .select('id')
          .eq('phone', user.phone)
          .limit(1);

        // Check if user has their own support network
        const { data: networkData } = await supabase
          .from('support_contacts')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (supporterData?.length && networkData?.length) {
          setRole('both');
        } else if (supporterData?.length) {
          setRole('supporter');
        } else {
          setRole('user');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  return { role, loading };
};

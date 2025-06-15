
import React from 'react';
import Layout from '@/components/Layout';
import EnhancedCalendar from '@/components/calendar/EnhancedCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * DEDUPLICATION: Replaces `Calendar` page.
 * Reason: loads the enhanced calendar component with modular hooks.
 */

const EnhancedCalendarPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Layout activeTab="calendar" onTabChange={() => {}}>
      <EnhancedCalendar 
        user={user ? { id: user.id } : undefined}
        supabase={supabase}
      />
    </Layout>
  );
};

export default EnhancedCalendarPage;

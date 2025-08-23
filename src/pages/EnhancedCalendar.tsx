import React from 'react';
import { motion } from 'framer-motion';
// DEDUPLICATION: Replaces Calendar.tsx with enhanced calendar page and hooks
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
        {/* Glass morphism header */}
        <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent text-center"
            >
              Enhanced Calendar
            </motion.h1>
          </div>
        </div>
        <EnhancedCalendar 
          user={user ? { id: user.id } : undefined}
          supabase={supabase}
        />
      </div>
    </Layout>
  );
};

export default EnhancedCalendarPage;

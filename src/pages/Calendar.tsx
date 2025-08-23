import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { MetricWidget } from '@/components/ui/MetricWidget';
import { Calendar as CalendarIcon, TrendingUp, Heart } from 'lucide-react';
import logger from '../services/loggerService';

// Simple fallback calendar component
const SimpleCalendar = () => {
  const today = new Date();
  const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
      {/* Glass morphism header */}
      <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Mood Calendar
            </h1>
            <p className="text-slate-600">{monthYear}</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <GlassCard gradient="premium" className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Your Check-in History</h2>
          </div>
          
          <div className="grid grid-cols-7 gap-3 text-center text-sm">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="font-semibold text-slate-700 py-2">
                {day}
              </div>
            ))}
            {/* Simple calendar grid */}
            {Array.from({ length: 35 }, (_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01 }}
                whileHover={{ scale: 1.05 }}
                className="aspect-square bg-white/40 backdrop-blur-sm border border-white/30 rounded-lg p-2 hover:bg-white/60 transition-all duration-200 cursor-pointer flex items-center justify-center font-medium"
              >
                {i < 31 ? i + 1 : ''}
              </motion.div>
            ))}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MetricWidget
            title="This Month"
            value={0}
            suffix=" check-ins"
            icon={TrendingUp}
            gradient="indigo"
            delay={0.2}
          />
          
          <MetricWidget
            title="Average Mood"
            value={0}
            subtitle="No data yet"
            icon={Heart}
            gradient="rose"
            delay={0.3}
          />
        </div>
      </div>
    </div>
  );
};

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
  const [EnhancedCalendar, setEnhancedCalendar] = useState<React.ComponentType<unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to dynamically import the EnhancedCalendar
    import('@/components/calendar/EnhancedCalendar')
      .then(module => {
        setEnhancedCalendar(() => module.default);
        setLoading(false);
      })
      .catch(_error => {
        logger.warn('EnhancedCalendar not available, using simple calendar', _error, { component: 'Calendar' });
        setLoading(false);
      });
  }, []);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {loading ? (
        <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="h-32 bg-white/20 backdrop-blur-xl rounded-2xl animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      ) : EnhancedCalendar ? (
        <EnhancedCalendar 
          user={user ? { id: user.id } : undefined}
          supabase={supabase}
        />
      ) : (
        <SimpleCalendar />
      )}
    </Layout>
  );
};

export default Calendar;

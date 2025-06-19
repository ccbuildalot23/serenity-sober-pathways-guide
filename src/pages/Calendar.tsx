import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, TrendingUp, Heart } from 'lucide-react';

// Simple fallback calendar component
const SimpleCalendar = () => {
  const today = new Date();
  const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Mood Calendar
        </h1>
        <p className="text-gray-600 dark:text-gray-400">{monthYear}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Your Check-in History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-center text-sm">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="font-medium text-gray-600 dark:text-gray-400">
                {day}
              </div>
            ))}
            {/* Simple calendar grid */}
            {Array.from({ length: 35 }, (_, i) => (
              <div
                key={i}
                className="aspect-square border border-gray-200 dark:border-gray-700 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {i < 31 ? i + 1 : ''}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold">0 check-ins</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Mood</p>
                <p className="text-2xl font-bold">--</p>
              </div>
              <Heart className="h-8 w-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');
  const [EnhancedCalendar, setEnhancedCalendar] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to dynamically import the EnhancedCalendar
    import('@/components/calendar/EnhancedCalendar')
      .then(module => {
        setEnhancedCalendar(() => module.default);
        setLoading(false);
      })
      .catch(error => {
        console.warn('EnhancedCalendar not available, using simple calendar', error);
        setLoading(false);
      });
  }, []);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {loading ? (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
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

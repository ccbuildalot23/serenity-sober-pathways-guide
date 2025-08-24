import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';
import { BarChart3, TrendingUp, Calendar, Target, Sparkles } from 'lucide-react';
import CheckInHistory from '@/components/checkin-history/CheckInHistory';
import OutcomeMeasurementDashboard from '@/components/clinical/OutcomeMeasurementDashboard';
import { useAuth } from '@/contexts/AuthContext';

const Progress: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Please sign in to view your progress.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 via-transparent to-teal-100/50" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent flex items-center gap-3">
              <motion.div 
                className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <TrendingUp className="w-8 h-8 text-white" />
              </motion.div>
              Recovery Progress
            </h1>
            <p className="mt-3 text-gray-700 text-lg font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Track your journey with detailed analytics and insights
            </p>
            <p className="mt-1 text-gray-600">
              Celebrate your growth and milestones
            </p>
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Check-in History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <OutcomeMeasurementDashboard />
        </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <GlassCard className="p-6 bg-white/80" gradient="sage">
                <CheckInHistory />
              </GlassCard>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Progress;

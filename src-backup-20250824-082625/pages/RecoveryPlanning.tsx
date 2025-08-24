import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { RecoveryPlanTemplates } from '@/components/recovery/RecoveryPlanTemplates';
import { RecoveryPlanBuilder } from '@/components/recovery/RecoveryPlanBuilder';
import { RecoveryPlanDashboard } from '@/components/recovery/RecoveryPlanDashboard';
import { ProviderIntegration } from '@/components/recovery/ProviderIntegration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassCard } from '@/components/ui/GlassCard';
import { Target, Users, BarChart3, Stethoscope } from 'lucide-react';

const RecoveryPlanning: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Layout activeTab="planning" onTabChange={setActiveTab}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
        {/* Glass morphism header */}
        <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 text-center"
            >
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Serenity Planning
              </h1>
              <p className="text-slate-600">
                Create and track your personalized recovery journey with evidence-based tools
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <div className="flex justify-center">
                <TabsList className="grid grid-cols-4 bg-white/40 backdrop-blur-sm">
                  <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-white/80">
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex items-center gap-2 data-[state=active]:bg-white/80">
                    <Target className="h-4 w-4" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="builder" className="flex items-center gap-2 data-[state=active]:bg-white/80">
                    <Users className="h-4 w-4" />
                    Plan Builder
                  </TabsTrigger>
                  <TabsTrigger value="providers" className="flex items-center gap-2 data-[state=active]:bg-white/80">
                    <Stethoscope className="h-4 w-4" />
                    Providers
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="dashboard" className="space-y-6">
                <GlassCard className="overflow-hidden">
                  <RecoveryPlanDashboard />
                </GlassCard>
              </TabsContent>

              <TabsContent value="templates" className="space-y-6">
                <GlassCard className="overflow-hidden">
                  <RecoveryPlanTemplates />
                </GlassCard>
              </TabsContent>

              <TabsContent value="builder" className="space-y-6">
                <GlassCard className="overflow-hidden">
                  <RecoveryPlanBuilder />
                </GlassCard>
              </TabsContent>

              <TabsContent value="providers" className="space-y-6">
                <GlassCard className="overflow-hidden">
                  <ProviderIntegration />
                </GlassCard>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default RecoveryPlanning;
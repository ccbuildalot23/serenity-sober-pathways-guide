import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { MetricWidget } from '@/components/ui/MetricWidget';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  FileText, 
  TrendingUp,
  Database,
  AlertCircle
} from 'lucide-react';

export default function ComplianceManagement() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
      {/* Glass morphism header */}
      <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Compliance Management
              </h1>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2 bg-white/60 backdrop-blur-sm">
              <Shield className="w-4 h-4 mr-2" />
              Compliance Score: 87%
            </Badge>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricWidget
            title="Scheduled deletions this month"
            value={12}
            icon={Database}
            gradient="sky"
            delay={0.1}
          />
          
          <MetricWidget
            title="Verification success rate"
            value={98}
            suffix="%"
            icon={CheckCircle}
            gradient="emerald"
            delay={0.2}
          />
          
          <MetricWidget
            title="Active security incidents"
            value={3}
            icon={AlertTriangle}
            gradient="amber"
            delay={0.3}
          />
          
          <MetricWidget
            title="Requirements completed"
            value={92}
            suffix="%"
            icon={FileText}
            gradient="indigo"
            delay={0.4}
          />
        </div>

        {/* Critical Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard className="p-6" gradient="coral">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Critical Compliance Gaps</h2>
                  <p className="text-slate-600 text-sm">Issues requiring immediate attention</p>
                </div>
              </div>
              <div className="space-y-4">
                <Alert className="bg-red-50/80 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>HIPAA Access Control:</strong> Missing user access reviews for Q4 2024
                  </AlertDescription>
                </Alert>
                <Alert className="bg-red-50/80 border-red-200">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>42 CFR Part 2:</strong> Consent forms need updating for new regulations
                  </AlertDescription>
                </Alert>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Upcoming Deadlines</h2>
                  <p className="text-slate-600 text-sm">Compliance tasks due soon</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/40 rounded-lg">
                  <span className="font-medium text-slate-700">Risk Assessment Review</span>
                  <Badge variant="outline" className="bg-white/60">7 days</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/40 rounded-lg">
                  <span className="font-medium text-slate-700">Staff Training Update</span>
                  <Badge variant="outline" className="bg-white/60">14 days</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/40 rounded-lg">
                  <span className="font-medium text-slate-700">Privacy Notice Update</span>
                  <Badge variant="outline" className="bg-white/60">21 days</Badge>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Framework Scores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Compliance Framework Scores</h2>
                <p className="text-slate-600">Performance across regulatory frameworks</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-700">HIPAA</span>
                  <span className="font-bold text-slate-800">89%</span>
                </div>
                <Progress value={89} className="h-3" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-700">42 CFR Part 2</span>
                  <span className="font-bold text-slate-800">82%</span>
                </div>
                <Progress value={82} className="h-3" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-700">State Privacy Laws</span>
                  <span className="font-bold text-slate-800">91%</span>
                </div>
                <Progress value={91} className="h-3" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
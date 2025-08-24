import React from 'react';
import { motion } from 'framer-motion';
import { SecurityAuditDashboard } from '@/components/security/SecurityAuditDashboard';
import { SecureAdminPanel } from '@/components/security/SecureAdminPanel';
import { useUserRole } from '@/hooks/useUserRole';
import { GlassCard } from '@/components/ui/GlassCard';
import { Shield, Lock } from 'lucide-react';

const SecurityAudit: React.FC = () => {
  const { role, isProvider } = useUserRole();

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
            <div className="flex items-center justify-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Security Audit Dashboard
              </h1>
            </div>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Monitor your application's security posture, review audit logs, and manage security settings.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Security Audit Dashboard - Available to all users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="overflow-hidden">
            <SecurityAuditDashboard />
          </GlassCard>
        </motion.div>

        {/* Admin Panel - Only for providers */}
        {isProvider && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Administrative Security Controls</h2>
              </div>
              <SecureAdminPanel />
            </GlassCard>
          </motion.div>
        )}

        {/* Role-based Access Notice */}
        {!isProvider && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="text-center py-12">
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-bold text-slate-800 mb-3">Limited Access</h3>
              <p className="text-slate-600">
                You have {role} access. Administrative security controls are available to healthcare providers only.
              </p>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SecurityAudit;
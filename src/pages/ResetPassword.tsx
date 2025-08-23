import React from 'react';
import { motion } from 'framer-motion';
import { EnhancedResetPasswordForm } from '@/components/auth/EnhancedResetPasswordForm';
import { GlassCard } from '@/components/ui/GlassCard';
import { Heart, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ResetPassword: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-lavender-50 to-sky-50">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-lavender-100/50 via-transparent to-sky-100/50" />
        <div className="relative max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.div 
                className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Heart className="w-6 h-6 text-white" />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Serenity</span>
                <p className="text-xs text-gray-600">Sober Pathways Guide</p>
              </div>
            </div>
            
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              HIPAA Secure
            </Badge>
          </div>
        </div>
      </motion.div>
      
      <div className="flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="w-full max-w-md bg-white/90 p-0">
            <EnhancedResetPasswordForm />
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
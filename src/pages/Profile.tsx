import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { User } from 'lucide-react';
import UserProfile from '@/components/UserProfile';

const Profile: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50" data-testid="page-profile-ready">
      {/* Glass morphism header */}
      <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Profile
            </h1>
          </motion.div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="overflow-hidden">
            <UserProfile />
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;

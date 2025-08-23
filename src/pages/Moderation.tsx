import React from 'react';
import { motion } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';
import ModerationDashboard from '@/components/community/ModerationDashboard';
import { Shield } from 'lucide-react';

const Moderation = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-100/50">
      {/* Glass morphism header */}
      <div className="sticky top-0 z-10 bg-white/60 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Community Moderation
            </h1>
          </motion.div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Routes>
            <Route path="/" element={<ModerationDashboard />} />
          </Routes>
        </motion.div>
      </div>
    </div>
  );
};

export default Moderation;
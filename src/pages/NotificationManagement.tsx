import React from 'react';
import { motion } from 'framer-motion';
import { ComprehensiveNotificationDashboard } from '@/components/notifications/ComprehensiveNotificationDashboard';
import { Bell } from 'lucide-react';

export default function NotificationManagement() {
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
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Notification Management
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
          <ComprehensiveNotificationDashboard />
        </motion.div>
      </div>
    </div>
  );
}
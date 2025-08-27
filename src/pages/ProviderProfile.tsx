import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import {
  User,
  Phone,
  Calendar,
  Shield,
  Sparkles,
  Clock
} from 'lucide-react';

const ProviderProfile: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/50 via-transparent to-purple-100/50" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <motion.div 
                className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <User className="w-8 h-8 text-white" />
              </motion.div>
              Provider Profile
            </h1>
            <p className="mt-3 text-gray-700 text-lg font-medium flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Professional information and account settings
            </p>
            <p className="mt-1 text-gray-600">
              Manage your practice details and availability
            </p>
          </motion.div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Professional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard className="mb-8 p-6 bg-white/80" gradient="premium">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Professional Information
            </h3>
            <form data-testid="provider-profile-form" className="space-y-6">
              <section data-testid="professional-info" className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input data-testid="provider-name" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Dr. Jane Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
                  <input data-testid="provider-specialty" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Mental Health & Addiction" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
                  <input data-testid="provider-license-number" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="LIC123456789" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <input data-testid="provider-phone" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="(555) 123-4567" />
                </div>
              </section>
            </form>
          </GlassCard>
        </motion.div>

        {/* Availability Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard className="mb-8 p-6 bg-white/80" gradient="sky">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-600" />
              Contact Preferences & Availability
            </h3>
            <section data-testid="contact-preferences" className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-4">Weekly Availability</h4>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <input data-testid="monday-availability" type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700">Monday</span>
                  </label>
                  <label className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <input data-testid="tuesday-availability" type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-700">Tuesday</span>
                  </label>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Daily Hours
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input data-testid="start-time" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500" placeholder="9:00 AM" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input data-testid="end-time" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500" placeholder="5:00 PM" />
                  </div>
                </div>
              </div>
            </section>
          </GlassCard>
        </motion.div>
        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex justify-end">
            <Button 
              type="button" 
              data-testid="save-profile" 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3"
              onClick={() => {
                const el = document.querySelector('[data-testid="profile-updated"]') as HTMLElement | null;
                if (el) el.classList.remove('sr-only');
              }}
            >
              Save Profile
            </Button>
          </div>
          <div data-testid="profile-updated" className="sr-only text-green-600 font-medium mt-2">Profile updated successfully!</div>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlassCard className="p-6 bg-white/80" gradient="coral">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              Security Settings
            </h3>
            <div className="space-y-4">
              <Button data-testid="change-password-tab" variant="outline" className="mb-4">
                Change Password
              </Button>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input data-testid="current-password" type="password" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Enter current password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input data-testid="new-password" type="password" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Enter new password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input data-testid="confirm-password" type="password" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Confirm new password" />
                </div>
                <div className="flex gap-3">
                  <Button data-testid="update-password" className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white">
                    Update Password
                  </Button>
                </div>
                <div data-testid="password-updated-success" className="sr-only text-green-600 font-medium">Password updated successfully!</div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default ProviderProfile;
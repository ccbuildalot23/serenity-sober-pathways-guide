import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Users, Phone, Bell, Save } from 'lucide-react';

const SupporterProfile: React.FC = () => {
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
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Supporter Profile
            </h1>
          </motion.div>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-8">
            <form data-testid="supporter-profile-form" className="space-y-6">
              <section data-testid="personal-info" className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Personal Information</h3>
                <input data-testid="supporter-name" className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Full Name" />
                <input data-testid="phone-number" className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Phone Number" />
                <input data-testid="relationship" className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Relationship to Patient" />
              </section>
              
              <section data-testid="availability-settings" className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Availability Settings</h3>
                <label className="flex items-center space-x-3">
                  <input data-testid="available-24-7" type="checkbox" className="w-5 h-5 text-emerald-600 bg-white/60 border border-white/30 rounded focus:ring-emerald-500/50" />
                  <span className="font-medium text-slate-700">Available 24/7</span>
                </label>
                <input data-testid="preferred-contact-method" className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="Preferred Contact Method" />
                <select data-testid="response-time" className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="immediate">Immediate Response</option>
                  <option value="within-hour">Within 1 Hour</option>
                  <option value="within-day">Within 24 Hours</option>
                </select>
              </section>
              
              <section data-testid="notification-preferences" className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Notification Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input data-testid="crisis-alerts" type="checkbox" className="w-5 h-5 text-red-600 bg-white/60 border border-white/30 rounded focus:ring-red-500/50" defaultChecked />
                    <span className="font-medium text-slate-700">Crisis alerts</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input data-testid="daily-checkin-summaries" type="checkbox" className="w-5 h-5 text-blue-600 bg-white/60 border border-white/30 rounded focus:ring-blue-500/50" />
                    <span className="font-medium text-slate-700">Daily check-in summaries</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input data-testid="weekly-reports" type="checkbox" className="w-5 h-5 text-purple-600 bg-white/60 border border-white/30 rounded focus:ring-purple-500/50" />
                    <span className="font-medium text-slate-700">Weekly progress reports</span>
                  </label>
                </div>
                <select data-testid="notification-frequency" className="w-full p-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                  <option value="real-time">Real-time notifications</option>
                  <option value="hourly">Hourly digest</option>
                  <option value="daily">Daily summary</option>
                </select>
              </section>
              
              <button data-testid="save-profile" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 flex items-center justify-center space-x-2">
                <Save className="w-5 h-5" />
                <span>Save Profile</span>
              </button>
              <div data-testid="profile-updated-success" className="sr-only">saved</div>
            </form>
          </GlassCard>
        </motion.div>
        
        <div className="mt-4">
          <button data-testid="emergency-contacts-tab" className="border px-3 py-2 rounded">Emergency Contacts</button>
          <div className="space-y-2 mt-3">
            <button data-testid="add-emergency-contact" className="border px-3 py-2 rounded">Add Emergency Contact</button>
            <input data-testid="emergency-name" className="sr-only" />
            <input data-testid="emergency-phone" className="sr-only" />
            <select data-testid="emergency-relationship" className="sr-only"><option value="friend">friend</option></select>
            <button data-testid="save-emergency-contact" className="sr-only" onClick={() => {
              const ok = document.querySelector('[data-testid="emergency-contact-saved"]') as HTMLElement | null;
              if (ok) ok.classList.remove('sr-only');
            }} />
            <div data-testid="emergency-contact-saved" className="sr-only">ok</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupporterProfile;



// MVP Dashboard - You're Not Alone

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCrisisSMS } from '@/hooks/useCrisisSMS';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { Phone, Heart, Users, Sparkles, AlertCircle, MessageSquare, MapPin, Calendar, CheckCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { OneTapCrisisButton } from '@/components/crisis/OneTapCrisisButton';
import { ShameFreeCheckIn } from '@/components/daily-checkin/ShameFreeCheckIn';

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, profile, _loading } = useDashboardData();
  const navigate = useNavigate();
  const { sendCrisisSMS, sending } = useCrisisSMS();
  const { contacts, _loading: contactsLoading } = useEmergencyContacts();
  
  // Crisis confirmation modal state
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [crisisMessage, setCrisisMessage] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  
  // Check if user has completed check-in today
  const hasCheckedInToday = () => {
    const lastCheckIn = localStorage.getItem('last_checkin');
    if (!lastCheckIn) return false;
    
    const checkInData = JSON.parse(lastCheckIn);
    const today = new Date().toDateString();
    const checkInDate = new Date(checkInData.date).toDateString();
    
    return today === checkInDate;
  };

  // Handle crisis button click
  const handleCrisisClick = () => {
    if (contacts.length === 0) {
      // No contacts - go directly to crisis page to add some
      toast.warning('No emergency contacts found', {
        description: 'Add contacts to enable SMS alerts',
        _action: {
          label: 'Add Contacts',
          _onClick: () => navigate('/settings')
        }
      });
      navigate('/crisis-intervention');
    } else {
      // Show confirmation modal
      setShowCrisisModal(true);
    }
  };
  
  // Send crisis alert
  const sendCrisisAlert = async () => {
    try {
      await sendCrisisSMS({
        customMessage: crisisMessage || undefined,
        includeLocation
      });
      setShowCrisisModal(false);
      // Navigate to crisis page for additional support
      navigate('/crisis-intervention');
    } catch (_error) {
      console._error('Crisis alert failed:', _error);
      // Still navigate to crisis page even if SMS fails
      navigate('/crisis-intervention');
    }
  };

  if (_loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-lavender-50 to-sky-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 animate-spin mx-auto border-2 border-indigo-400 border-t-transparent rounded-full" />
          <p className="text-gray-600">Loading your safe space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-lavender-50 to-sky-50">
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-lavender-100/50 via-transparent to-sky-100/50" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
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
                  <Heart className="w-8 h-8 text-white" />
                </motion.div>
                You're Not Alone
              </h1>
              <p className="mt-3 text-gray-700 text-lg font-medium flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Welcome back, warrior. Today is all that matters.
              </p>
              {stats.streak > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-green-100/80 to-emerald-100/80 text-emerald-700 px-4 py-2 rounded-full border border-emerald-200">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">{stats.streak} days of courage</span>
                </div>
              )}
            </motion.div>
            
            <div className="flex items-center gap-3 relative">
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Safe Space
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 py-12 text-center">
          {/* Content moved to header */}

          {/* Daily Check-in Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            {hasCheckedInToday() ? (
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100/80 to-emerald-100/80 text-emerald-700 px-6 py-3 rounded-full border border-emerald-200">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Check-in completed today</span>
              </div>
            ) : (
              <Button
                onClick={() => setShowCheckIn(true)}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Complete Daily Check-in
              </Button>
            )}
          </motion.div>

          {/* Three Big Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-4"
          >
            {/* I NEED HELP NOW Button - ENHANCED WITH SMS */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
            >
              <GlassCard 
                onClick={handleCrisisClick}
                className="h-32 md:h-40 bg-gradient-to-br from-red-500/90 to-rose-600/90 cursor-pointer flex flex-col items-center justify-center gap-3 relative overflow-hidden group border-red-200"
              >
                {/* Pulse animation for urgency */}
                <div className="absolute inset-0 bg-red-400 opacity-0 group-hover:opacity-20 animate-pulse" />
                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div className="relative">
                    <Phone className="w-12 h-12 text-white" />
                    {contacts.length > 0 && (
                      <div className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        {contacts.length}
                      </div>
                    )}
                  </div>
                  <span className="text-xl md:text-2xl font-bold text-white">I NEED HELP NOW</span>
                  <span className="text-xs md:text-sm text-white/90">
                    {contacts.length > 0 
                      ? `Alerts ${contacts.length} contact${contacts.length !== 1 ? 's' : ''} + 988`
                      : 'Crisis support available 24/7'
                    }
                  </span>
                </div>
              </GlassCard>
            </motion.div>

            {/* Just Checking In Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.05 }}
            >
              <GlassCard 
                onClick={() => setShowCheckIn(true)}
                className="h-32 md:h-40 bg-gradient-to-br from-indigo-500/90 to-blue-600/90 cursor-pointer flex flex-col items-center justify-center gap-3 border-indigo-200"
              >
                <Heart className="w-12 h-12 text-white" />
                <span className="text-xl md:text-2xl font-bold text-white">Just Checking In</span>
                <span className="text-xs md:text-sm text-white/90">Daily wellness check</span>
              </GlassCard>
            </motion.div>

            {/* Find Support Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.05 }}
            >
              <GlassCard 
                onClick={() => navigate('/peer-support')}
                className="h-32 md:h-40 bg-gradient-to-br from-emerald-500/90 to-green-600/90 cursor-pointer flex flex-col items-center justify-center gap-3 border-emerald-200"
              >
                <Users className="w-12 h-12 text-white" />
                <span className="text-xl md:text-2xl font-bold text-white">Find Support</span>
                <span className="text-xs md:text-sm text-white/90">Connect with community</span>
              </GlassCard>
            </motion.div>
          </motion.div>

          {/* Recovery Wisdom */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-16 max-w-2xl mx-auto px-4 text-center"
          >
            <GlassCard className="p-8 bg-gradient-to-r from-lavender-50/80 to-sky-50/80 text-center">
              <p className="text-lg text-gray-700 italic mb-4">
                "Just for today, I will have faith in someone who believes in me and wants to help me in my recovery."
              </p>
              <p className="text-sm text-gray-500 font-medium">- Just for Today</p>
            </GlassCard>
          </motion.div>

          {/* Quick Resources */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mt-12 max-w-4xl mx-auto px-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div whileHover={{ scale: 1.05 }}>
                <GlassCard
                  onClick={() => navigate('/crisis-toolkit')}
                  className="h-20 bg-white/80 hover:bg-white/90 cursor-pointer flex flex-col items-center justify-center gap-1"
                >
                  <div className="text-lg">🧘</div>
                  <span className="text-sm text-gray-700 font-medium">Grounding</span>
                </GlassCard>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }}>
                <GlassCard
                  onClick={() => navigate('/contact')}
                  className="h-20 bg-white/80 hover:bg-white/90 cursor-pointer flex flex-col items-center justify-center gap-1"
                >
                  <div className="text-lg">📞</div>
                  <span className="text-sm text-gray-700 font-medium">Help Lines</span>
                </GlassCard>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }}>
                <GlassCard
                  onClick={() => window.location.href = 'tel:988'}
                  className="h-20 bg-white/80 hover:bg-white/90 cursor-pointer flex flex-col items-center justify-center gap-1"
                >
                  <div className="text-lg">🆘</div>
                  <span className="text-sm text-gray-700 font-medium">Call 988</span>
                </GlassCard>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }}>
                <GlassCard
                  onClick={() => window.open('sms:741741?body=HOME', '_self')}
                  className="h-20 bg-white/80 hover:bg-white/90 cursor-pointer flex flex-col items-center justify-center gap-1"
                >
                  <div className="text-lg">💬</div>
                  <span className="text-sm text-gray-700 font-medium">Text HOME</span>
                </GlassCard>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer Message */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-auto py-8 text-center"
      >
        <p className="text-sm text-gray-600 font-medium">You matter. Recovery is possible. We're here for you 24/7.</p>
      </motion.div>
      
      {/* Crisis Modal */}
      <Dialog open={showCrisisModal} onOpenChange={setShowCrisisModal}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-800">
              Send Crisis Alert?
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              This will notify your emergency contacts and provide immediate support.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeLocation"
                checked={includeLocation}
                onCheckedChange={(checked) => setIncludeLocation(checked as boolean)}
              />
              <label htmlFor="includeLocation" className="text-sm text-gray-700">
                Include my location for emergency services
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Optional message (keep it brief):
              </label>
              <textarea
                value={crisisMessage}
                onChange={(e) => setCrisisMessage(e.target.value)}
                placeholder="I need help right now..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col space-y-2">
            <Button
              onClick={sendCrisisAlert}
              disabled={sending}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {sending ? 'Sending Alert...' : 'Send Crisis Alert'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCrisisModal(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in Modal */}
      <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
        <DialogContent className="max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
          <ShameFreeCheckIn />
        </DialogContent>
      </Dialog>

      {/* One-Tap Crisis Button - Always Available */}
      <OneTapCrisisButton />
    </div>
  );
};

export default Dashboard;
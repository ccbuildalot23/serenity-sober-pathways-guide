// MVP Dashboard - You're Not Alone

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCrisisSMS } from '@/hooks/useCrisisSMS';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { Phone, Heart, Users, Sparkles, AlertCircle, MessageSquare, MapPin, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 animate-spin mx-auto border-2 border-blue-400 border-t-transparent rounded-full" />
          <p className="text-gray-400">Loading your safe space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-gray-900 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              You're Not Alone
            </h1>
            <p className="text-xl text-gray-300">
              Welcome back, warrior. Today is all that matters.
            </p>
            {stats.streak > 0 && (
              <div className="mt-6 inline-flex items-center gap-2 bg-green-900/30 text-green-400 px-6 py-3 rounded-full">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">{stats.streak} days of courage</span>
              </div>
            )}
          </div>

          {/* Daily Check-in Status */}
          <div className="mb-8">
            {hasCheckedInToday() ? (
              <div className="inline-flex items-center gap-2 bg-green-900/30 text-green-400 px-6 py-3 rounded-full">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Check-in completed today</span>
              </div>
            ) : (
              <Button
                onClick={() => setShowCheckIn(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Complete Daily Check-in
              </Button>
            )}
          </div>

          {/* Three Big Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-4">
            {/* I NEED HELP NOW Button - ENHANCED WITH SMS */}
            <Button
              _onClick={handleCrisisClick}
              disabled={sending}
              className="h-32 md:h-40 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200 relative overflow-hidden group"
            >
              {/* Pulse animation for urgency */}
              <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-20 animate-pulse" />
              <div className="flex flex-col items-center gap-3 relative z-10">
                <div className="relative">
                  <Phone className="w-12 h-12" />
                  {contacts.length > 0 && (
                    <div className="absolute -top-2 -right-2 bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {contacts.length}
                    </div>
                  )}
                </div>
                <span className="text-2xl font-bold">I NEED HELP NOW</span>
                <span className="text-sm opacity-90">
                  {contacts.length > 0 
                    ? `Alerts ${contacts.length} contact${contacts.length !== 1 ? 's' : ''} + 988`
                    : 'Crisis support available 24/7'
                  }
                </span>
              </div>
            </Button>

            {/* Just Checking In Button */}
            <Button
              onClick={() => setShowCheckIn(true)}
              className="h-32 md:h-40 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex flex-col items-center gap-3">
                <Heart className="w-12 h-12" />
                <span className="text-2xl font-bold">Just Checking In</span>
                <span className="text-sm opacity-90">Daily wellness check</span>
              </div>
            </Button>

            {/* Find Support Button */}
            <Button
              onClick={() => navigate('/peer-support')}
              className="h-32 md:h-40 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex flex-col items-center gap-3">
                <Users className="w-12 h-12" />
                <span className="text-2xl font-bold">Find Support</span>
                <span className="text-sm opacity-90">Connect with community</span>
              </div>
            </Button>
          </div>

          {/* Recovery Wisdom */}
          <div className="mt-16 max-w-2xl mx-auto px-4 text-center">
            <div className="bg-gray-800/50 backdrop-blur p-8 rounded-2xl border border-gray-700">
              <p className="text-lg text-gray-300 italic mb-4">
                "Just for today, I will have faith in someone who believes in me and wants to help me in my recovery."
              </p>
              <p className="text-sm text-gray-500">- Just for Today</p>
            </div>
          </div>

          {/* Quick Resources */}
          <div className="mt-12 max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                _onClick={() => navigate('/crisis-toolkit')}
                className="h-20 bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
              >
                <div className="text-center">
                  <div className="text-lg">🧘</div>
                  <span className="text-sm">Grounding</span>
                </div>
              </Button>
              
              <Button
                variant="outline"
                _onClick={() => navigate('/contact')}
                className="h-20 bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
              >
                <div className="text-center">
                  <div className="text-lg">📞</div>
                  <span className="text-sm">Help Lines</span>
                </div>
              </Button>
              
              <Button
                variant="outline"
                _onClick={() => window.location.href = 'tel:988'}
                className="h-20 bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
              >
                <div className="text-center">
                  <div className="text-lg">🆘</div>
                  <span className="text-sm">Call 988</span>
                </div>
              </Button>
              
              <Button
                variant="outline"
                _onClick={() => window.open('sms:741741?body=HOME', '_self')}
                className="h-20 bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
              >
                <div className="text-center">
                  <div className="text-lg">💬</div>
                  <span className="text-sm">Text HOME</span>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Message */}
      <div className="mt-auto py-8 text-center text-gray-500">
        <p className="text-sm">You matter. Recovery is possible. We're here for you 24/7.</p>
      </div>
      
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
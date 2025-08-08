// MVP Dashboard - You're Not Alone

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useCrisisSMS } from '@/hooks/useCrisisSMS';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { Phone, Heart, Users, Sparkles, AlertCircle, MessageSquare, MapPin } from 'lucide-react';
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
              _onClick={() => navigate('/checkin')}
              className="h-32 md:h-40 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex flex-col items-center gap-3">
                <Heart className="w-12 h-12" />
                <span className="text-2xl font-bold">Just Checking In</span>
                <span className="text-sm opacity-90">How are you today?</span>
              </div>
            </Button>

            {/* Talk to Someone Button */}
            <Button
              _onClick={() => navigate('/support')}
              className="h-32 md:h-40 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <div className="flex flex-col items-center gap-3">
                <Users className="w-12 h-12" />
                <span className="text-2xl font-bold">Talk to Someone</span>
                <span className="text-sm opacity-90">Connect with peers who understand</span>
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
      
      {/* Crisis Confirmation Modal */}
      <Dialog open={showCrisisModal} onOpenChange={setShowCrisisModal}>
        <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-6 h-6 text-red-500" />
              Send Crisis Alert?
            </DialogTitle>
            <DialogDescription className="text-gray-300 pt-4">
              This will immediately notify your {contacts.length} emergency contact{contacts.length !== 1 ? 's' : ''}:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Show contacts who will be notified */}
            <div className="bg-gray-800 rounded-lg p-3 space-y-2">
              {contacts.slice(0, 3).map((contact, _idx) => (
                <div key={contact.id} className="flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span>{contact.name}</span>
                  <span className="text-gray-500">({contact.relationship || 'Support'})</span>
                </div>
              ))}
              {contacts.length > 3 && (
                <div className="text-sm text-gray-500">...and {contacts.length - 3} more</div>
              )}
            </div>
            
            {/* Location sharing option */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="location"
                checked={includeLocation}
                onCheckedChange={(checked) => setIncludeLocation(checked as boolean)}
                className="border-gray-600"
              />
              <label htmlFor="location" className="flex items-center gap-2 text-sm cursor-pointer">
                <MapPin className="w-4 h-4" />
                Include my current location
              </label>
            </div>
            
            {/* Optional custom message */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Add a message (_optional):</label>
              <textarea
                value={crisisMessage}
                onChange={(e) => setCrisisMessage(e.target.value)}
                placeholder="Let them know what you need..."
                className="w-full h-20 bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white placeholder-gray-500 resize-none"
                maxLength={160}
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              _onClick={() => setShowCrisisModal(false)}
              className="bg-gray-800 hover:bg-gray-700 border-gray-700"
            >
              Cancel
            </Button>
            <Button
              _onClick={sendCrisisAlert}
              disabled={sending}
              className="bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
            >
              {sending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </div>
              ) : (
                'Send Alert'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
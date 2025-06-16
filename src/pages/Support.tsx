import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Phone, MessageSquare, Users, Heart, Clock, Shield,
  BarChart3, Settings, AlertTriangle, UserPlus, Globe,
  MapPin, Loader2, Sparkles, HeartHandshake, Star,
  Trophy, ArrowRight, Lock, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupportContacts } from '@/hooks/useSupportContacts';

const SupportAnalytics = lazy(() => import('@/components/support/SupportAnalytics'));
const SupportNetwork = lazy(() => import('@/components/SupportNetwork'));
const SupportCircleSettings = lazy(() => import('@/components/SupportCircleSettings'));
const SupporterDashboard = lazy(() => import('@/components/SupporterDashboard'));

import meetingFinderService from '@/services/meetingFinderService';
import { onlineSupportResources, sponsorshipResources } from '@/utils/supportResources';

const colors = {
  primary: '#4A90E2',
  secondary: '#7ED321',
  accent: '#9013FE',
  background: '#F8FAFB',
  text: '#2C3E50',
  supportive: '#A8E6CF',
  warm: '#FFD3B6',
};

const supportMessages = [
  'Reaching out is the bravest thing you can do today',
  'Your recovery matters to more people than you know',
  'Every connection strengthens your journey',
  "You're not alone - your village is here for you",
  'Asking for help shows wisdom, not weakness'
];

const MyVillageComponent = ({ contacts }: { contacts: any[] }) => {
  const [expanded, setExpanded] = useState(true);

  if (contacts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <Card
        className="border-2 shadow-lg overflow-hidden"
        style={{
          borderColor: colors.supportive,
          background: `linear-gradient(135deg, ${colors.supportive}10 0%, ${colors.warm}10 100%)`
        }}
      >
        <CardHeader
          className="cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3" style={{ color: colors.text }}>
              <div className="p-2 rounded-full" style={{ backgroundColor: colors.supportive }}>
                <HeartHandshake className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">My Village</h2>
                <p className="text-sm font-normal mt-1 opacity-80">
                  {contacts.length} people who care about you and your recovery
                </p>
              </div>
            </CardTitle>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronUp className="w-6 h-6" style={{ color: colors.primary }} />
            </motion.div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                  {contacts.map((contact, index) => (
                    <motion.div
                      key={contact.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-center"
                    >
                      <div
                        className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 shadow-md"
                        style={{
                          backgroundColor: colors.warm,
                          color: colors.primary
                        }}
                      >
                        <span className="text-2xl font-bold">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: colors.text }}>
                        {contact.name}
                      </p>
                      <p className="text-xs opacity-70">
                        {contact.relationship}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div
                  className="text-center p-4 rounded-xl"
                  style={{ backgroundColor: colors.primary + '20' }}
                >
                  <p className="text-sm font-medium" style={{ color: colors.text }}>
                    <Sparkles className="inline-block w-4 h-4 mr-1" style={{ color: colors.accent }} />
                    These people believe in your recovery and are ready to support you
                  </p>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

const Support = () => {
  const [activeView, setActiveView] = useState<'main' | 'analytics' | 'network' | 'settings' | 'supporter'>('main');
  const [showMeetingFinder, setShowMeetingFinder] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [nearbyMeetings, setNearbyMeetings] = useState<any[]>([]);
  const [currentMessage, setCurrentMessage] = useState(0);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { contacts } = useSupportContacts();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % supportMessages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCall988 = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style="background-color: ${colors.supportive}">
            <svg class="w-8 h-8" style="color: ${colors.primary}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold mb-2" style="color: ${colors.text}">You're Taking a Brave Step</h3>
          <p class="text-gray-600 mb-4">The 988 Lifeline provides free, confidential support 24/7. Trained counselors are ready to listen without judgment.</p>
          <div class="p-3 rounded-lg mb-4" style="background-color: ${colors.supportive}20">
            <p class="text-sm font-medium" style="color: ${colors.text}">
              <svg class="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              Your call is completely confidential
            </p>
          </div>
        </div>
        <div class="flex gap-3">
          <button onclick="window.location.href='tel:988'" class="flex-1 py-3 px-4 rounded-xl font-medium text-white" style="background-color: ${colors.primary}">
            Make the Call
          </button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="flex-1 py-3 px-4 rounded-xl font-medium border-2" style="border-color: ${colors.primary}; color: ${colors.primary}">
            Not Right Now
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  };

  const handleTextCrisis = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div class="text-center mb-6">
          <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style="background-color: ${colors.warm}">
            <svg class="w-8 h-8" style="color: ${colors.primary}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold mb-2" style="color: ${colors.text}">Text Support is Here</h3>
          <p class="text-gray-600 mb-4">Sometimes texting feels easier than talking. Crisis counselors are ready to support you through text.</p>
          <div class="p-3 rounded-lg mb-4" style="background-color: ${colors.warm}20">
            <p class="text-sm font-medium" style="color: ${colors.text}">Text <strong>HOME</strong> to <strong>741741</strong></p>
          </div>
        </div>
        <div class="flex gap-3">
          <button onclick="window.location.href='sms:741741&body=HOME'" class="flex-1 py-3 px-4 rounded-xl font-medium text-white" style="background-color: ${colors.primary}">
            Start Texting
          </button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="flex-1 py-3 px-4 rounded-xl font-medium border-2" style="border-color: ${colors.primary}; color: ${colors.primary}">
            Maybe Later
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.primary }} />
    </div>
  );

  if (activeView !== 'main') {
    return (
      <Layout activeTab="support" onTabChange={() => {}}>
        <div className="p-4" style={{ backgroundColor: colors.background }}>
          <div className="mb-4">
            <Button
              onClick={() => setActiveView('main')}
              variant="ghost"
              size="sm"
              className="hover:bg-opacity-10"
              style={{ color: colors.primary }}
            >
              ← Back to Support
            </Button>
          </div>
          <Suspense fallback={<LoadingSpinner />}>
            {activeView === 'analytics' && <SupportAnalytics onBack={() => setActiveView('main')} />}
            {activeView === 'network' && <SupportNetwork />}
            {activeView === 'settings' && <SupportCircleSettings />}
            {activeView === 'supporter' && <SupporterDashboard />}
          </Suspense>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeTab="support" onTabChange={() => {}}>
      <div
        className="min-h-screen p-4"
        style={{
          backgroundColor: colors.background,
          fontFamily: '-apple-system, BlinkMacSystemFont, "San Francisco", "Roboto", sans-serif'
        }}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 mb-8"
          >
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
              Your Support Network
            </h1>

            <AnimatePresence mode="wait">
              <motion.p
                key={currentMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg"
                style={{ color: colors.primary }}
              >
                {supportMessages[currentMessage]}
              </motion.p>
            </AnimatePresence>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: colors.accent + '20' }}>
              <Lock className="w-4 h-4" style={{ color: colors.accent }} />
              <span className="text-sm font-medium" style={{ color: colors.text }}>
                Your information is completely confidential
              </span>
            </div>
          </motion.div>

          <MyVillageComponent contacts={contacts} />

          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setActiveView('supporter')}
                variant="outline"
                size="sm"
                className="rounded-full border-2"
                style={{
                  borderColor: colors.accent,
                  color: colors.accent,
                  backgroundColor: 'white'
                }}
              >
                <Shield className="w-4 h-4 mr-1" />
                Be a Supporter
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setActiveView('settings')}
                variant="outline"
                size="sm"
                className="rounded-full"
                style={{ borderColor: colors.primary, color: colors.primary }}
              >
                <Settings className="w-4 h-4 mr-1" />
                Manage Network
              </Button>
            </motion.div>
          </div>

          {contacts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6"
            >
              <Card
                className="border-0 shadow-lg overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${colors.secondary}20 0%, ${colors.accent}20 100%)`
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="p-3 rounded-full"
                        style={{ backgroundColor: colors.secondary }}
                      >
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: colors.text }}>
                          Recovery Warrior
                        </h3>
                        <p className="text-sm opacity-80">
                          You've built a support network of {contacts.length} people
                        </p>
                      </div>
                    </div>
                    <Badge
                      className="px-4 py-2"
                      style={{
                        backgroundColor: colors.accent,
                        color: 'white'
                      }}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Strong
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className="border-2 shadow-lg overflow-hidden"
              style={{ borderColor: colors.warm }}
            >
              <CardHeader style={{ backgroundColor: colors.warm + '20' }}>
                <CardTitle className="flex items-center gap-2" style={{ color: colors.text }}>
                  <div className="p-2 rounded-full" style={{ backgroundColor: colors.warm }}>
                    <Phone className="w-5 h-5" style={{ color: colors.primary }} />
                  </div>
                  <span>24/7 Crisis Support</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm mb-4" style={{ color: colors.text + 'CC' }}>
                  Professional help is always available. You deserve support.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      className="w-full py-6 text-white font-medium rounded-xl shadow-lg"
                      style={{ backgroundColor: colors.primary }}
                      onClick={handleCall988}
                    >
                      <Phone className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-bold">Call 988 Lifeline</div>
                        <div className="text-sm opacity-90">Free, confidential, 24/7</div>
                      </div>
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      className="w-full py-6 font-medium rounded-xl border-2"
                      style={{
                        borderColor: colors.primary,
                        color: colors.primary,
                        backgroundColor: 'white'
                      }}
                      onClick={handleTextCrisis}
                    >
                      <MessageSquare className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-bold">Text HOME to 741741</div>
                        <div className="text-sm opacity-80">Crisis Text Line</div>
                      </div>
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: colors.text }}>
                  <Users className="w-5 h-5" style={{ color: colors.primary }} />
                  Build Your Support Circle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contacts.length === 0 ? (
                  <div className="text-center py-8">
                    <div
                      className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: colors.supportive + '30' }}
                    >
                      <UserPlus className="w-10 h-10" style={{ color: colors.primary }} />
                    </div>
                    <h3 className="font-bold text-lg mb-2" style={{ color: colors.text }}>
                      Start Building Your Village
                    </h3>
                    <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: colors.text + 'CC' }}>
                      Adding trusted people creates a safety net for difficult moments
                    </p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => setActiveView('settings')}
                        className="rounded-full px-8 py-3 font-medium text-white shadow-lg"
                        style={{ backgroundColor: colors.secondary }}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Your First Supporter
                      </Button>
                    </motion.div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm" style={{ color: colors.text + 'CC' }}>
                      Your support network is ready to help when you need them
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => setActiveView('network')}
                          className="w-full rounded-xl font-medium"
                          style={{ backgroundColor: colors.primary, color: 'white' }}
                        >
                          <HeartHandshake className="w-4 h-4 mr-2" />
                          Contact Someone
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => setActiveView('settings')}
                          variant="outline"
                          className="w-full rounded-xl font-medium"
                          style={{ borderColor: colors.primary, color: colors.primary }}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add More
                        </Button>
                      </motion.div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              className="shadow-lg border-0 overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${colors.accent}10 0%, ${colors.primary}10 100%)`
              }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: colors.text }}>
                  <BarChart3 className="w-5 h-5" style={{ color: colors.accent }} />
                  Track Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4" style={{ color: colors.text + 'CC' }}>
                  See how your support network strengthens your recovery
                </p>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={() => setActiveView('analytics')}
                    className="w-full rounded-xl font-medium text-white"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Your Growth
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: colors.text }}>
                  <Heart className="w-5 h-5" style={{ color: colors.secondary }} />
                  Recovery Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: Clock, label: 'Find Meetings Near You', action: () => toast.info('Meeting finder coming soon') },
                  { icon: Globe, label: 'Online Support Groups', action: handleOnlineSupportGroups },
                  { icon: HeartHandshake, label: 'Connect with a Sponsor', action: () => toast.info('Sponsor connection coming soon') }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-xl py-4 font-medium"
                      onClick={item.action}
                      style={{ borderColor: colors.primary + '40' }}
                    >
                      <item.icon className="w-5 h-5 mr-3" style={{ color: colors.secondary }} />
                      {item.label}
                      <ArrowRight className="w-4 h-4 ml-auto" style={{ color: colors.primary }} />
                    </Button>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-8"
          >
            <p className="text-sm" style={{ color: colors.text + '99' }}>
              <Lock className="inline-block w-4 h-4 mr-1" />
              Only you can see your personal data • Your privacy is protected
            </p>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Support;

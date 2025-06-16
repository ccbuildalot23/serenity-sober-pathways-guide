import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Phone, MessageSquare, Users, Heart, Clock, Shield,
  BarChart3, Settings, AlertTriangle, UserPlus, Globe,
  MapPin, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Use correct lazy imports for all components
const SupportAnalytics = lazy(() => import('@/components/support/SupportAnalytics'));
const SupportNetwork = lazy(() => import('@/components/SupportNetwork'));
const SupportCircleSettings = lazy(() => import('@/components/SupportCircleSettings'));
const SupporterDashboard = lazy(() => import('@/components/supporter/SupporterDashboard'));

import meetingFinderService from '@/services/meetingFinderService';
import { onlineSupportResources, sponsorshipResources } from '@/utils/supportResources';

const Support = () => {
  const [activeView, setActiveView] = useState<'main' | 'analytics' | 'network' | 'settings' | 'supporter'>('main');
  const [showMeetingFinder, setShowMeetingFinder] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [nearbyMeetings, setNearbyMeetings] = useState<any[]>([]);

  const navigate = useNavigate();
  const { user } = useAuth();

  // 988 call modal
  const handleCall988 = () => {
    const confirmed = window.confirm(
      'You are about to call the 988 Suicide & Crisis Lifeline. This is a free, confidential service available 24/7. Continue?'
    );
    if (confirmed) {
      window.location.href = 'tel:988';
      toast.success('Connecting to 988 Suicide & Crisis Lifeline');
    }
  };

  // Text crisis modal
  const handleTextCrisis = () => {
    const confirmed = window.confirm(
      'You are about to text the Crisis Text Line. Text HOME to 741741 for free, 24/7 crisis support. Continue?'
    );
    if (confirmed) {
      window.location.href = 'sms:741741&body=HOME';
      toast.success('Opening text to Crisis Text Line');
    }
  };

  // Meeting finder modal
  const handleMeetingFinder = async () => {
    setShowMeetingFinder(true);
    setLoadingMeetings(true);

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const meetings = await meetingFinderService.searchMeetings({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radius: 10
          });
          setNearbyMeetings(meetings);
          setLoadingMeetings(false);
        },
        async () => {
          const meetings = await meetingFinderService.searchMeetings({});
          setNearbyMeetings(meetings);
          setLoadingMeetings(false);
        }
      );
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
      setLoadingMeetings(false);
    }
  };

  // Online support groups
  const handleOnlineSupportGroups = () => {
    const modal = window.confirm(
      'Online Support Groups Available:\n\n' +
      '• In The Rooms - Global recovery community\n' +
      '• SMART Recovery - Science-based meetings\n' +
      '• AA Online Intergroup - Virtual AA meetings\n' +
      '• Sober Grid - Sober social network\n\n' +
      'Would you like to visit In The Rooms?'
    );

    if (modal) {
      window.open('https://www.intherooms.com', '_blank');
      toast.success('Opening In The Rooms website');
    }
  };

  // Sponsor connection
  const handleSponsorConnection = () => {
    const tips = sponsorshipResources.findingSponsor.tips.slice(0, 4).join('\n• ');

    if (window.confirm(
      'Finding a Sponsor:\n\n• ' + tips + '\n\n' +
      'Would you like to learn more about sponsorship?'
    )) {
      toast.info('Check local meetings to find potential sponsors');
    }
  };

  // Navigation handlers
  const handleViewSupportNetwork = () => {
    setActiveView('network');
  };

  const handleViewSettings = () => {
    setActiveView('settings');
  };

  const handleViewSupporter = () => {
    setActiveView('supporter');
  };

  // Loading spinner
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  // Analytics view
  if (activeView === 'analytics') {
    return (
      <Layout activeTab="support" onTabChange={() => {}}>
        <div className="p-4">
          <Suspense fallback={<LoadingSpinner />}>
            <SupportAnalytics onBack={() => setActiveView('main')} />
          </Suspense>
        </div>
      </Layout>
    );
  }

  // Support network view
  if (activeView === 'network') {
    return (
      <Layout activeTab="support" onTabChange={() => {}}>
        <div className="p-4">
          <div className="mb-4">
            <Button onClick={() => setActiveView('main')} variant="ghost" size="sm">
              ← Back to Support
            </Button>
          </div>
          <Suspense fallback={<LoadingSpinner />}>
            <SupportNetwork />
          </Suspense>
        </div>
      </Layout>
    );
  }

  // Settings view
  if (activeView === 'settings') {
    return (
      <Layout activeTab="support" onTabChange={() => {}}>
        <div className="p-4">
          <div className="mb-4">
            <Button onClick={() => setActiveView('main')} variant="ghost" size="sm">
              ← Back to Support
            </Button>
          </div>
          <Suspense fallback={<LoadingSpinner />}>
            <SupportCircleSettings />
          </Suspense>
        </div>
      </Layout>
    );
  }

  // Supporter dashboard view
  if (activeView === 'supporter') {
    return (
      <Layout activeTab="support" onTabChange={() => {}}>
        <div className="p-4">
          <div className="mb-4">
            <Button onClick={() => setActiveView('main')} variant="ghost" size="sm">
              ← Back to Support
            </Button>
          </div>
          <Suspense fallback={<LoadingSpinner />}>
            <SupporterDashboard />
          </Suspense>
        </div>
      </Layout>
    );
  }

  // Main support UI
  return (
    <Layout activeTab="support" onTabChange={() => {}}>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#1E3A8A]">Support Network</h1>
          <p className="text-gray-600">Connect with your support system</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            onClick={handleViewSupporter}
            variant="outline"
            size="sm"
            className="text-purple-600 border-purple-300"
          >
            <Shield className="w-4 h-4 mr-1" />
            Supporter View
          </Button>
          <Button
            onClick={handleViewSettings}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </Button>
        </div>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-700 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Network Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-purple-600 mb-4">
              Get insights into your support network effectiveness and patterns
            </p>
            <Button
              onClick={() => setActiveView('analytics')}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Emergency Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCall988}
              >
                <Phone className="w-5 h-5 mr-3" />
                Call 988 Lifeline
              </Button>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={handleTextCrisis}
              >
                <MessageSquare className="w-5 h-5 mr-3" />
                Text HOME to 741741
              </Button>
            </div>
            <p className="text-xs text-red-600 mt-2">
              Free, confidential support available 24/7
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Support Circle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Manage your trusted contacts and support network
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleViewSupportNetwork} className="w-full">
                <Users className="w-4 h-4 mr-2" />
                View Network
              </Button>
              <Button onClick={handleViewSettings} variant="outline" className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Contacts
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Professional Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Connect with healthcare professionals through your support network
            </p>
            <Button
              onClick={handleViewSettings}
              className="w-full"
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Professional Contacts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Recovery Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleMeetingFinder}
            >
              <Clock className="w-4 h-4 mr-2" />
              Meeting Finder
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleOnlineSupportGroups}
            >
              <Globe className="w-4 h-4 mr-2" />
              Online Support Groups
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleSponsorConnection}
            >
              <Heart className="w-4 h-4 mr-2" />
              Sponsor Connection
            </Button>
          </CardContent>
        </Card>

        {showMeetingFinder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Recovery Meetings Near You</h2>
                  <Button
                    onClick={() => setShowMeetingFinder(false)}
                    variant="ghost"
                    size="sm"
                  >
                    ✕
                  </Button>
                </div>

                {loadingMeetings ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-4">
                    {nearbyMeetings.map(meeting => (
                      <div key={meeting.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{meeting.name}</h3>
                            <p className="text-sm text-gray-600">
                              {meeting.type} • {meeting.day} at {meeting.time}
                            </p>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {meeting.location}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (meeting.virtual && meeting.link) {
                                window.open(meeting.link, '_blank');
                              } else {
                                window.open(meetingFinderService.getDirectionsUrl(meeting), '_blank');
                              }
                            }}
                          >
                            {meeting.virtual ? 'Join' : 'Directions'}
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="text-center text-sm text-gray-500 mt-4">
                      <p>For more meetings, visit:</p>
                      <div className="flex gap-4 justify-center mt-2">
                        <a
                          href="https://aa.org/find-aa"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          AA.org
                        </a>
                        <a
                          href="https://www.na.org/meetingsearch"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          NA.org
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Support;
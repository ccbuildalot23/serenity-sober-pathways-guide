
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardKeyboardShortcuts } from '@/hooks/useDashboardKeyboardShortcuts';
import { useDashboardSessionManager } from '@/hooks/useDashboardSessionManager';
import Layout from '@/components/Layout';
import WelcomeHeader from '@/components/home/WelcomeHeader';
import CheckInStatus from '@/components/home/CheckInStatus';
import RecoveryFocus from '@/components/home/RecoveryFocus';
import QuickActions from '@/components/home/QuickActions';
import RecoveryGoals from '@/components/home/RecoveryGoals';
import DailyAccountability from '@/components/accountability/DailyAccountability';
import { PlayTheTapeButton } from '@/features/PlayTheTape';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import SessionWarningDialog from '@/components/security/SessionWarningDialog';
import { toast } from 'sonner';

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);

  // Dashboard data with live updates
  const { stats, profile, loading, error, refreshStats } = useDashboardData();

  // Custom hooks for functionality
  useDashboardKeyboardShortcuts();
  const { sessionWarning, extendSession } = useDashboardSessionManager();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Sign out failed');
    }
  };

  const handleCheckInComplete = () => {
    refreshStats();
    toast.success('Check-in completed!');
  };

  const { existingCheckin } = useDailyCheckIn();

  // Prepare user data for Play the Tape feature
  const userData = {
    sobrietyDays: stats.streak || 0,
    relapseHistory: [] // In production, this would come from the user's profile or a dedicated table
  };

  // Show error state if there's a critical error
  if (error && !loading) {
    return (
      <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onProfileClick={() => setShowProfile(!showProfile)}
      >
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Unable to Load Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We're having trouble loading your data. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onProfileClick={() => setShowProfile(!showProfile)}
      >
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          <WelcomeHeader
            name={profile?.full_name || user?.email?.split('@')[0]}
            streak={stats.streak}
            checkIns={stats.checkIns}
          />
          <CheckInStatus checkedIn={!!existingCheckin} />
          <RecoveryFocus />
          
          {/* Add Play the Tape feature to the recovery tools section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recovery Tools</h3>
            <div className="flex flex-wrap gap-4">
              <PlayTheTapeButton userData={userData} minDaysRequired={3} />
            </div>
          </div>
          
          <QuickActions />
          <DailyAccountability />
          <RecoveryGoals />
        </div>
      </Layout>

      {/* Session Warning Dialog */}
      <SessionWarningDialog
        open={sessionWarning}
        onExtendSession={extendSession}
        onSignOut={handleSignOut}
      />
    </>
  );
};

export default Index;

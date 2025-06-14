import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import Layout from '@/components/Layout';
import { UnifiedRecoveryContent } from '@/components/daily/UnifiedRecoveryContent';
import QuickCheckIn from '@/components/daily/QuickCheckIn';
import { SessionWarningDialog } from '@/components/security/SessionWarningDialog';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { WeeklyGoals } from '@/components/dashboard/WeeklyGoals';
import { CrisisSupport } from '@/components/dashboard/CrisisSupport';
import { DashboardHeaderSkeleton, DashboardStatsSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { toast } from 'sonner';

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);

  // Dashboard data with live updates
  const { stats, profile, loading, error, refreshStats } = useDashboardData();

  // Simple keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'h':
            e.preventDefault();
            window.location.href = '/';
            break;
          case 'c':
            e.preventDefault();
            window.location.href = '/calendar';
            break;
          case 't':
            e.preventDefault();
            window.location.href = '/crisis-toolkit';
            break;
          case 's':
            e.preventDefault();
            window.location.href = '/settings';
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Session timeout check
  useEffect(() => {
    const checkSession = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        // Show warning after 25 minutes of inactivity
        if (timeSinceActivity > 25 * 60 * 1000) {
          setSessionWarning(true);
        }
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

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

  const extendSession = () => {
    localStorage.setItem('lastActivity', Date.now().toString());
    setSessionWarning(false);
    toast.success('Session extended');
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
          {/* Header */}
          {loading ? (
            <DashboardHeaderSkeleton />
          ) : (
            <DashboardHeader 
              userEmail={user?.email} 
              userName={profile?.full_name}
              streak={stats.streak} 
            />
          )}

          {/* Quick Stats */}
          {loading ? (
            <DashboardStatsSkeleton />
          ) : (
            <DashboardStats stats={stats} />
          )}

          {/* Quick Check-In */}
          <QuickCheckIn onCheckInComplete={handleCheckInComplete} />

          {/* Today's Recovery Content */}
          <UnifiedRecoveryContent />

          {/* Quick Actions */}
          <QuickActions />

          {/* Weekly Goals Progress */}
          <WeeklyGoals />

          {/* Quick Access to Crisis Tools */}
          <CrisisSupport />
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


import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useEnhancedSessionSecurity } from '@/hooks/useEnhancedSessionSecurity';
import { useDashboardData } from '@/hooks/useDashboardData';
import { NotificationService } from '@/services/notificationService';
import { notificationPermissionService } from '@/services/notificationPermissionService';
import { EnhancedSecurityHeaders } from '@/lib/enhancedSecurityHeaders';
import { SecureMonitoring } from '@/lib/secureMonitoring';
import Layout from '@/components/Layout';
import { UnifiedRecoveryContent } from '@/components/daily/UnifiedRecoveryContent';
import QuickCheckIn from '@/components/daily/QuickCheckIn';
import EnhancedCrisisSystem from '@/components/crisis/EnhancedCrisisSystem';
import { SessionWarningDialog } from '@/components/security/SessionWarningDialog';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { WeeklyGoals } from '@/components/dashboard/WeeklyGoals';
import { CrisisAlert } from '@/components/dashboard/CrisisAlert';
import { CrisisSupport } from '@/components/dashboard/CrisisSupport';
import { NotificationBanner } from '@/components/dashboard/NotificationBanner';
import { DashboardHeaderSkeleton, DashboardStatsSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { toast } from 'sonner';

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  const {
    riskLevel,
    handleCrisisActivated,
    handleAssessmentComplete,
    handleResponseComplete,
    handleInterventionComplete
  } = useCrisisSystem();

  // Enhanced session security with improved sign-out handling
  const { sessionValid, sessionWarning, extendSession } = useEnhancedSessionSecurity();

  // Dashboard data with live updates
  const { stats, profile, loading, error, refreshStats } = useDashboardData();

  // Set up keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'h', ctrlKey: true, callback: () => window.location.href = '/' },
    { key: 'c', ctrlKey: true, callback: () => window.location.href = '/calendar' },
    { key: 't', ctrlKey: true, callback: () => window.location.href = '/crisis-toolkit' },
    { key: 's', ctrlKey: true, callback: () => window.location.href = '/settings' }
  ]);

  // Initialize enhanced security and notifications
  useEffect(() => {
    // Apply enhanced security headers
    EnhancedSecurityHeaders.applyEnhancedSecurity();
    
    // Initialize security monitoring
    SecureMonitoring.monitorConsoleAccess();
    SecureMonitoring.trackPageAccess();
    
    const initNotifications = async () => {
      // Check if we should show permission prompt
      if (notificationPermissionService.shouldShowPermissionPrompt()) {
        const permission = await notificationPermissionService.requestPermission();
        if (permission === 'granted') {
          console.log('Notifications enabled');
        }
      }
      
      // Check if we should show the banner for denied permissions
      if (notificationPermissionService.shouldShowBanner()) {
        setShowNotificationBanner(true);
      }
    };
    
    initNotifications();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Sign out failed, but redirecting anyway');
      // Force redirect even if sign out fails
      window.location.href = '/auth';
    }
  };

  const handleCheckInComplete = () => {
    // Refresh stats when check-in is completed
    refreshStats();
  };

  // Redirect if session is invalid
  if (!sessionValid) {
    return null; // Component will unmount as user gets redirected
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

          {/* Notification Banner */}
          {showNotificationBanner && (
            <NotificationBanner 
              onDismiss={() => setShowNotificationBanner(false)}
            />
          )}

          {/* Quick Stats */}
          {loading ? (
            <DashboardStatsSkeleton />
          ) : (
            <DashboardStats stats={stats} />
          )}

          {/* Crisis Status - Only show if riskLevel exists */}
          <CrisisAlert riskLevel={riskLevel} />

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

      {/* Enhanced Crisis System with SOS Button */}
      <EnhancedCrisisSystem />

      {/* Session Warning Dialog */}
      <SessionWarningDialog
        open={sessionWarning}
        onExtendSession={extendSession}
        onSignOut={handleSignOut}
      />

      {/* Add responsive styles */}
      <style jsx>{`
        @media (max-width: 600px) {
          .grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
          
          .p-4 {
            padding: 1rem !important;
          }
          
          .space-y-6 > * + * {
            margin-top: 1.5rem !important;
          }
        }
        
        /* Focus styles for accessibility */
        button:focus,
        a:focus,
        [tabindex]:focus {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }
        
        /* Ensure no horizontal scrolling on mobile */
        body {
          overflow-x: hidden;
        }
      `}</style>
    </>
  );
};

export default Index;

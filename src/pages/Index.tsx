
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useEnhancedSessionSecurity } from '@/hooks/useEnhancedSessionSecurity';
import { NotificationService } from '@/services/notificationService';
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

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [stats, setStats] = useState({
    streak: 42,
    checkIns: 15,
    goals: { completed: 3, total: 5 }
  });

  const {
    riskLevel,
    handleCrisisActivated,
    handleAssessmentComplete,
    handleResponseComplete,
    handleInterventionComplete
  } = useCrisisSystem();

  // Enhanced session security
  const { sessionValid, sessionWarning, extendSession } = useEnhancedSessionSecurity();

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
      const permission = await NotificationService.requestPermission();
      if (permission === 'granted') {
        console.log('Notifications enabled');
      }
    };
    
    initNotifications();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Force redirect even if sign out fails
      window.location.href = '/auth';
    }
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
        <div className="p-4 space-y-6">
          {/* Header */}
          <DashboardHeader userEmail={user?.email} streak={stats.streak} />

          {/* Quick Stats */}
          <DashboardStats stats={stats} />

          {/* Crisis Status */}
          {riskLevel && <CrisisAlert riskLevel={riskLevel} />}

          {/* Quick Check-In */}
          <QuickCheckIn />

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
    </>
  );
};

export default Index;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DailyCheckIn from '@/components/DailyCheckIn';
import EnhancedCBTSkillsLibrary from '@/components/cbt/EnhancedCBTSkillsLibrary';
import SobrietyTracker from '@/components/SobrietyTracker';
import SupportNetwork from '@/components/SupportNetwork';
import UserProfile from '@/components/UserProfile';
import EducationalResources from '@/components/EducationalResources';
import ViewToggle from '@/components/ViewToggle';
import NotificationPreview from '@/components/NotificationPreview';
import NotificationBanner from '@/components/NotificationBanner';
import NotificationFeedback from '@/components/NotificationFeedback';
import SmartReminderSettings from '@/components/settings/SmartReminderSettings';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { NotificationService } from '@/services/notificationService';
import { toast } from 'sonner';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNotificationPreview, setShowNotificationPreview] = useState(false);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Set up keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'h', ctrlKey: true, callback: () => navigate('/') },
    { key: 'c', ctrlKey: true, callback: () => navigate('/calendar') },
    { key: 'k', ctrlKey: true, callback: () => navigate('/crisis-toolkit') },
    { key: '?', callback: () => setShowShortcuts(true) },
    { key: 'Escape', callback: () => setShowShortcuts(false) }
  ]);

  // Set up real-time updates for notifications
  useRealtimeUpdates({
    onMoodUpdate: (payload) => {
      console.log('Mood update received:', payload);
    },
    onCheckInUpdate: (payload) => {
      console.log('Check-in update received:', payload);
    }
  });

  useEffect(() => {
    // Check notification permission status
    const checkNotificationStatus = () => {
      const permission = NotificationService.getPermissionStatus();
      setNotificationPermission(permission);

      // Check if user has seen notification preview
      const hasSeenPreview = localStorage.getItem('notification_preview_seen');
      const hasDismissedBanner = localStorage.getItem('notification_banner_dismissed');

      if (!hasSeenPreview && permission === 'default') {
        setShowNotificationPreview(true);
      } else if (!hasDismissedBanner && permission !== 'granted') {
        setShowNotificationBanner(true);
      }
    };

    checkNotificationStatus();

    // Listen for permission changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const newPermission = NotificationService.getPermissionStatus();
        if (newPermission !== notificationPermission) {
          setNotificationPermission(newPermission);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [notificationPermission]);

  const handleEnableNotifications = async () => {
    try {
      const permission = await NotificationService.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted' && user?.id) {
        toast.success('Notifications enabled! We\'ll send you gentle reminders to support your recovery.');
        
        // Set default notification schedule
        const defaultSettings = {
          time: '09:00',
          freq: 3,
          toggles: { checkIn: true, affirm: true, support: true, spiritual: true }
        };
        await NotificationService.scheduleAll(defaultSettings, user.id);
      } else {
        toast.error('Notifications were not enabled. You can enable them anytime in your browser settings.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('There was an issue enabling notifications.');
    }
    
    setShowNotificationPreview(false);
    setShowNotificationBanner(false);
    localStorage.setItem('notification_preview_seen', 'true');
  };

  const handleSkipNotifications = () => {
    setShowNotificationPreview(false);
    localStorage.setItem('notification_preview_seen', 'true');
    
    // Show banner later if they skipped
    setTimeout(() => {
      const hasDismissedBanner = localStorage.getItem('notification_banner_dismissed');
      if (!hasDismissedBanner && NotificationService.getPermissionStatus() !== 'granted') {
        setShowNotificationBanner(true);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours later
  };

  const handleDismissBanner = () => {
    setShowNotificationBanner(false);
    localStorage.setItem('notification_banner_dismissed', 'true');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <DailyCheckIn />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SobrietyTracker />
              <SupportNetwork />
            </div>
          </div>
        );
      case 'cbt-skills':
        return <EnhancedCBTSkillsLibrary />;
      case 'profile':
        return <UserProfile />;
      case 'resources':
        return <EducationalResources />;
      case 'settings':
        return <SmartReminderSettings />;
      default:
        return (
          <div className="space-y-8">
            <DailyCheckIn />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SobrietyTracker />
              <SupportNetwork />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Notification Banner */}
      {showNotificationBanner && (
        <NotificationBanner
          onEnable={handleEnableNotifications}
          onDismiss={handleDismissBanner}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#1E3A8A] mb-2">
                Serenity Sober Pathways
              </h1>
              <p className="text-gray-600">
                Welcome back, {user?.user_metadata?.full_name || 'Friend'}! Your recovery journey continues today.
              </p>
            </div>
            <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
          </div>
        </header>
        
        <main>
          {renderView()}
        </main>
      </div>

      {/* Keyboard Shortcuts Help */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-bold mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              <div><kbd>Ctrl + H</kbd> - Home</div>
              <div><kbd>Ctrl + C</kbd> - Calendar</div>
              <div><kbd>Ctrl + K</kbd> - Crisis Toolkit</div>
              <div><kbd>?</kbd> - Show this help</div>
              <div><kbd>Esc</kbd> - Close dialogs</div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Preview Modal */}
      {showNotificationPreview && (
        <NotificationPreview
          onEnable={handleEnableNotifications}
          onSkip={handleSkipNotifications}
        />
      )}

      {/* Notification Feedback Modal */}
      <NotificationFeedback
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        notificationType="general"
      />
    </div>
  );
};

export default Index;

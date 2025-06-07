
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DailyCheckIn from '@/components/DailyCheckIn';
import EnhancedCBTSkillsLibrary from '@/components/cbt/EnhancedCBTSkillsLibrary';
import SobrietyTracker from '@/components/SobrietyTracker';
import SupportNetwork from '@/components/SupportNetwork';
import UserProfile from '@/components/UserProfile';
import EducationalResources from '@/components/EducationalResources';
import ViewToggle from '@/components/ViewToggle';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { toast } from 'sonner';

const Index = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  // Set up real-time updates for notifications
  useRealtimeUpdates({
    onMoodUpdate: (payload) => {
      // Handle mood updates from support network
      console.log('Mood update received:', payload);
    },
    onCheckInUpdate: (payload) => {
      // Handle check-in updates from support network  
      console.log('Check-in update received:', payload);
    }
  });

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
    </div>
  );
};

export default Index;

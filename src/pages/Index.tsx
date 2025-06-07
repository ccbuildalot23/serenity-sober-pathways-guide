
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ViewToggle from '@/components/ViewToggle';
import SupporterDashboard from '@/components/supporter/SupporterDashboard';
import EmergencyButton from '@/components/EmergencyButton';
import SobrietyTracker from '@/components/SobrietyTracker';
import DailyCheckIn from '@/components/DailyCheckIn';
import SupportNetwork from '@/components/SupportNetwork';
import EducationalResources from '@/components/EducationalResources';
import UserProfile from '@/components/UserProfile';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSupporterView, setIsSupporterView] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If in supporter view, show the supporter dashboard
  if (isSupporterView) {
    return (
      <>
        <ViewToggle 
          isSupporterView={isSupporterView} 
          onToggle={setIsSupporterView} 
        />
        <SupporterDashboard />
      </>
    );
  }

  const renderContent = () => {
    if (showProfile) {
      return (
        <div className="p-4">
          <UserProfile />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-4 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold serenity-navy mb-2">
                Welcome back, {user.user_metadata?.full_name || user.email}
              </h2>
              <p className="text-gray-600">
                Your daily companion for recovery and growth
              </p>
            </div>
            
            <EmergencyButton />
            <SobrietyTracker />
          </div>
        );
      
      case 'checkin':
        return (
          <div className="p-4">
            <DailyCheckIn />
          </div>
        );
      
      case 'support':
        return (
          <div className="p-4">
            <SupportNetwork />
          </div>
        );
      
      case 'resources':
        return (
          <div className="p-4">
            <EducationalResources />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <ViewToggle 
        isSupporterView={isSupporterView} 
        onToggle={setIsSupporterView} 
      />
      <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onProfileClick={() => setShowProfile(!showProfile)}
      >
        {renderContent()}
      </Layout>
    </>
  );
};

export default Index;

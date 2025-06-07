
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import EmergencyButton from '@/components/EmergencyButton';
import SobrietyTracker from '@/components/SobrietyTracker';
import DailyCheckIn from '@/components/DailyCheckIn';
import SupportNetwork from '@/components/SupportNetwork';
import EducationalResources from '@/components/EducationalResources';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-4 space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold serenity-navy mb-2">
                Welcome to Serenity
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
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Index;

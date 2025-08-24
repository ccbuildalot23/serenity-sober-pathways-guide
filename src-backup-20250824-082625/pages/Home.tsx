
import React, { useEffect } from 'react';
import Index from './Index';
import DailyAccountability from '@/components/accountability/DailyAccountability';
import { requestNotificationPermission } from '@/services/mockPushService';

// Simple wrapper to maintain compatibility
const Home: React.FC = () => {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return <Index />;
};

export default Home;

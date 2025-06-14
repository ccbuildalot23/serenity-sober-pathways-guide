
import React from 'react';
import Layout from '@/components/Layout';
import { CheckCircle, Loader2 } from 'lucide-react';

export const CheckInSuccess: React.FC = () => {
  return (
    <Layout activeTab="checkin" onTabChange={() => {}}>
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-pulse">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-green-800">Great Job!</h1>
          <p className="text-green-700 text-lg">
            Your check-in has been saved. Keep up the amazing work on your recovery journey!
          </p>
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting to dashboard...</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

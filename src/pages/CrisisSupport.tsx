import React from 'react';
import Layout from '@/components/Layout';
import { EnhancedCrisisSystem } from '@/components/crisis/EnhancedCrisisSystem';
import { EmergencyContactsSetup } from '@/components/crisis/EmergencyContactsSetup';

const CrisisSupport = () => {
  return (
    <Layout activeTab="crisis-intervention" onTabChange={() => {}}>
      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Crisis Support</h1>
          <p className="text-muted-foreground">
            Emergency support tools for addiction recovery crisis situations
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <EnhancedCrisisSystem />
          </div>
          
          <div>
            <EmergencyContactsSetup />
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong> This crisis support system sends real SMS messages to your emergency contacts. 
                Make sure your contacts are aware they may receive crisis alerts from you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CrisisSupport;
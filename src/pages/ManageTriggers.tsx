import React from 'react';
import Layout from '@/components/Layout';
import TriggerManagementToolkit from '@/components/triggers/TriggerManagementToolkit';

const ManageTriggers: React.FC = () => {
  return (
    <Layout activeTab="support" onTabChange={() => {}}>
      <div className="p-4 max-w-4xl mx-auto">
        <TriggerManagementToolkit />
      </div>
    </Layout>
  );
};

export default ManageTriggers;

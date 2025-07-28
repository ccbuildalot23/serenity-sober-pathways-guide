import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { DataExportDashboard } from '@/components/data-export/DataExportDashboard';

const DataExport: React.FC = () => {
  const [activeTab, setActiveTab] = useState('data-export');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <DataExportDashboard />
    </Layout>
  );
};

export default DataExport;
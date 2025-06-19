import React from 'react';
import Layout from '@/components/Layout';

const Progress: React.FC = () => {
  return (
    <Layout activeTab="progress" onTabChange={() => {}}>
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          Progress
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Progress tracking coming soon.
        </p>
      </div>
    </Layout>
  );
};

export default Progress;

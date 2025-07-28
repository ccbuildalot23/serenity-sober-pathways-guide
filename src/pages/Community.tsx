import React from 'react';
import Layout from '@/components/Layout';
import CommunitySupport from '@/components/community/CommunitySupport';

const Community = () => {
  return (
    <Layout activeTab="community" onTabChange={() => {}}>
      <div className="p-4 space-y-6 max-w-6xl mx-auto">
        <CommunitySupport />
      </div>
    </Layout>
  );
};

export default Community;
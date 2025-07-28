import React, { useState } from 'react';
import Layout from '@/components/Layout';
import PeerSupportChat from '@/components/peer-support/PeerSupportChat';
import SupporterDashboard from '@/components/peer-support/SupporterDashboard';
import { Button } from '@/components/ui/button';
import { Users, HeadphonesIcon } from 'lucide-react';

const PeerSupport = () => {
  const [view, setView] = useState<'user' | 'supporter'>('user');

  return (
    <Layout activeTab="support" onTabChange={() => {}}>
      <div className="p-4 space-y-6">
        {/* View Toggle */}
        <div className="flex justify-center">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <Button
              variant={view === 'user' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('user')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Get Support
            </Button>
            <Button
              variant={view === 'supporter' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('supporter')}
              className="flex items-center gap-2"
            >
              <HeadphonesIcon className="w-4 h-4" />
              Provide Support
            </Button>
          </div>
        </div>

        {/* Content */}
        {view === 'user' ? <PeerSupportChat /> : <SupporterDashboard />}
      </div>
    </Layout>
  );
};

export default PeerSupport;
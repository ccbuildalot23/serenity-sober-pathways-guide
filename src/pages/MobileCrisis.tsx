import React from 'react';
import Layout from '@/components/Layout';
import MobileCrisisInterface from '@/components/crisis/MobileCrisisInterface';
import { useIsMobile } from '@/hooks/use-mobile';

const MobileCrisis = () => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <Layout activeTab="crisis-intervention" onTabChange={() => {}}>
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Mobile Crisis Interface</h1>
            <p className="text-muted-foreground">
              This page is optimized for mobile devices. Please view on a mobile device to see the full mobile crisis interface.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return <MobileCrisisInterface />;
};

export default MobileCrisis;
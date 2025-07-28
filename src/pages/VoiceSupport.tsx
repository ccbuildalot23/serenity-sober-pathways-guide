import React from 'react';
import Layout from '@/components/Layout';
import VoiceAccessibilityCenter from '@/components/voice/VoiceAccessibilityCenter';

const VoiceSupport = () => {
  return (
    <Layout activeTab="voice-support" onTabChange={() => {}}>
      <div className="p-4 space-y-6 max-w-6xl mx-auto">
        <VoiceAccessibilityCenter />
      </div>
    </Layout>
  );
};

export default VoiceSupport;

import React from 'react';

interface VoiceActivationStatusProps {
  voiceListening: boolean;
}

export const VoiceActivationStatus: React.FC<VoiceActivationStatusProps> = ({ voiceListening }) => {
  if (!voiceListening) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 flex items-center space-x-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-blue-700">Voice activation active</span>
      </div>
    </div>
  );
};

import React from 'react';

interface CrisisDebugInfoProps {
  voiceListening?: boolean;
  hasLocationPermission?: boolean;
  currentCrisisEvent?: unknown;
}

export const CrisisDebugInfo: React.FC<CrisisDebugInfoProps> = ({
  voiceListening = false,
  hasLocationPermission = false,
  currentCrisisEvent = null
}) => {
  // Debug info only shown in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 p-2 bg-black/80 text-white text-xs rounded-md max-w-xs z-50">
      <div className="space-y-1">
        <div>Voice: {voiceListening ? '🎤 Active' : '🔇 Inactive'}</div>
        <div>Location: {hasLocationPermission ? '📍 Enabled' : '❌ Disabled'}</div>
        <div>Crisis: {currentCrisisEvent ? '🚨 Active' : '✅ None'}</div>
      </div>
    </div>
  );
};

export default CrisisDebugInfo;
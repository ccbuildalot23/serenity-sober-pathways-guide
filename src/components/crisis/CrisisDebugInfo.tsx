
import React from 'react';

interface CrisisEvent {
  id: string;
  timestamp: Date;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  interventionsUsed: string[];
  safetyConfirmed: boolean;
  location?: { lat: number; lng: number; };
}

interface CrisisDebugInfoProps {
  voiceListening: boolean;
  hasLocationPermission: boolean;
  currentCrisisEvent: CrisisEvent | null;
}

export const CrisisDebugInfo: React.FC<CrisisDebugInfoProps> = ({
  voiceListening,
  hasLocationPermission,
  currentCrisisEvent
}) => {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-2 rounded text-xs max-w-xs">
      <div>Voice: {voiceListening ? 'Active' : 'Inactive'}</div>
      <div>Location: {hasLocationPermission ? 'Granted' : 'Denied'}</div>
      <div>Crisis ID: {currentCrisisEvent?.id || 'None'}</div>
    </div>
  );
};

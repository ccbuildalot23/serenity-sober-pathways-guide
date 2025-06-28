
import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { UserData } from './types';
import { PlayTheTapeModal } from './PlayTheTapeModal';

interface PlayTheTapeButtonProps {
  userData: UserData;
  minDaysRequired?: number;
}

export const PlayTheTapeButton: React.FC<PlayTheTapeButtonProps> = ({ 
  userData, 
  minDaysRequired = 3 
}) => {
  const [showModal, setShowModal] = useState(false);
  
  // Safety check: Don't show feature too early in recovery
  if (userData.sobrietyDays < minDaysRequired) {
    return null;
  }
  
  // Safety check: Cooldown period (24 hours)
  const lastUsed = localStorage.getItem('lastPlayTapeUse');
  if (lastUsed) {
    const hoursSince = (Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      return null;
    }
  }
  
  // Safety check: Night time consideration
  const hour = new Date().getHours();
  const isNightTime = hour >= 22 || hour <= 6;
  
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="group relative px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        aria-label="Play the tape all the way through - mental exercise for relapse prevention"
        title={isNightTime ? "Consider using grounding exercises instead during nighttime" : undefined}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5" />
          <span className="font-medium">Play the Tape All the Way Through</span>
        </div>
        <div className="absolute inset-0 rounded-lg bg-blue-200 opacity-0 group-hover:opacity-20 transition-opacity" />
      </button>
      
      {showModal && (
        <PlayTheTapeModal 
          userData={userData} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
};

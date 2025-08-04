// Play the Tape - See where using leads, choose recovery instead
// A powerful tool when cravings hit hard

import React, { useState } from 'react';
import { FileVideo, Heart } from 'lucide-react';
import { UserData } from './types';
import { PlayTheTapeModal } from './PlayTheTapeModal';
import { Button } from '@/components/ui/button';

interface PlayTheTapeButtonProps {
  userData: UserData;
  minDaysRequired?: number;
  variant?: 'default' | 'crisis';
}

export const PlayTheTapeButton: React.FC<PlayTheTapeButtonProps> = ({ 
  userData, 
  minDaysRequired = 0, // Make it available immediately for crisis
  variant = 'default'
}) => {
  const [showModal, setShowModal] = useState(false);
  
  // No safety restrictions in crisis mode
  if (variant === 'default') {
    // Optional cooldown for non-crisis use
    const lastUsed = localStorage.getItem('lastPlayTapeUse');
    if (lastUsed) {
      const hoursSince = (Date.now() - new Date(lastUsed).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 1) { // Reduced from 24 hours to 1 hour
        return null;
      }
    }
  }
  
  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        variant={variant === 'crisis' ? 'destructive' : 'outline'}
        size="lg"
        className={
          variant === 'crisis' 
            ? 'w-full h-16 bg-orange-600 hover:bg-orange-700 text-white font-bold'
            : 'w-full border-purple-700 text-purple-300 hover:bg-purple-900'
        }
        aria-label="Play the tape through - see where using leads"
      >
        <div className="flex items-center justify-center gap-3">
          {variant === 'crisis' ? (
            <>
              <Heart className="w-6 h-6" />
              <span>Fighting a Craving? Play the Tape</span>
            </>
          ) : (
            <>
              <FileVideo className="w-5 h-5" />
              <span>Play the Tape Forward</span>
            </>
          )}
        </div>
      </Button>
      
      {showModal && (
        <PlayTheTapeModal 
          userData={userData} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
};
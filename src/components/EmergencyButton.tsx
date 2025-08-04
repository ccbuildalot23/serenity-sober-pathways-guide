// I NEED HELP Button - One tap when everything feels too much
// No questions, no forms, just immediate support

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Phone, MessageSquare, Users } from 'lucide-react';
import { useEmergencySupport } from '@/hooks/useEmergencySupport';
import { toast } from 'sonner';

const EmergencyButton = () => {
  const [showOptions, setShowOptions] = useState(false);
  const { call988, textCrisis, callSponsor, reachOut } = useEmergencySupport();

  const handleMainPress = () => {
    if (!showOptions) {
      setShowOptions(true);
      reachOut(); // Track that they're reaching out
      
      // Vibrate if available
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl border border-red-900">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-white mb-2">
          You're Not Alone
        </h3>
        <p className="text-sm text-gray-300">
          One tap for help. No judgment.
        </p>
      </div>
      
      {/* Main Help Button */}
      <Button
        onClick={handleMainPress}
        className="w-full h-20 text-xl font-bold rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-lg"
      >
        <Heart className="w-8 h-8 mr-3" />
        I NEED HELP NOW
      </Button>
      
      {/* Quick Options */}
      {showOptions && (
        <div className="mt-4 space-y-3 animate-in slide-in-from-bottom duration-300">
          {/* 988 Button */}
          <Button
            onClick={call988}
            className="w-full h-16 text-lg font-semibold rounded-xl bg-orange-600 hover:bg-orange-700 transition-all"
          >
            <Phone className="w-6 h-6 mr-3" />
            Call 988 (24/7 Crisis Line)
          </Button>
          
          {/* Text Crisis Line */}
          <Button
            onClick={textCrisis}
            className="w-full h-16 text-lg font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 transition-all"
          >
            <MessageSquare className="w-6 h-6 mr-3" />
            Text "HOME" to 741741
          </Button>
          
          {/* Call Sponsor */}
          <Button
            onClick={callSponsor}
            className="w-full h-16 text-lg font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 transition-all"
          >
            <Users className="w-6 h-6 mr-3" />
            Call My Sponsor
          </Button>
          
          {/* Encouraging message */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Reaching out is strength, not weakness. We're proud of you.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmergencyButton;
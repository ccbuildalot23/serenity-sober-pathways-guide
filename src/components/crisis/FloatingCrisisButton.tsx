
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface FloatingCrisisButtonProps {
  onCrisisActivated: () => void;
}

const FloatingCrisisButton: React.FC<FloatingCrisisButtonProps> = ({ onCrisisActivated }) => {
  const [isPressed, setIsPressed] = useState(false);
  const { user } = useAuth();

  const handleCrisisActivation = useCallback(() => {
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    setIsPressed(true);
    onCrisisActivated();
    
    // Reset pressed state after animation
    setTimeout(() => setIsPressed(false), 300);
  }, [onCrisisActivated]);

  // Don't show if user not authenticated
  if (!user) return null;

  return (
    <div className="fixed bottom-20 right-5 z-[9999]">
      <Button
        onClick={handleCrisisActivation}
        className={`
          w-16 h-16 rounded-full 
          bg-gradient-to-br from-red-600 to-red-700 
          hover:from-red-700 hover:to-red-800
          text-white font-bold text-xs
          shadow-2xl border-2 border-red-500
          transition-all duration-200
          animate-pulse
          focus:outline-none focus:ring-4 focus:ring-red-300
          active:scale-95
          ${isPressed ? 'scale-95 bg-red-800' : ''}
        `}
        size="lg"
        aria-label="Emergency Crisis Support - Tap for immediate help"
        role="button"
        tabIndex={0}
      >
        <div className="flex flex-col items-center justify-center">
          <AlertTriangle className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-extrabold">SOS</span>
        </div>
      </Button>
    </div>
  );
};

export default FloatingCrisisButton;

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, Shield, Volume2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileCrisis } from '@/hooks/useMobileCrisis';
import { escalateCrisis } from '@/services/crisisEscalationService';

interface MobileCrisisButtonProps {
  onCrisisActivated?: () => void;
  size?: 'default' | 'large';
  showSwipeConfirm?: boolean;
}

const MobileCrisisButton: React.FC<MobileCrisisButtonProps> = ({ 
  onCrisisActivated,
  size = 'large',
  showSwipeConfirm: enableSwipeConfirm = true 
}) => {
  const { user } = useAuth();
  const { 
    isMobile, 
    isContrastMode, 
    triggerHapticFeedback, 
    toggleContrastMode,
    getBatteryOptimizedSettings 
  } = useMobileCrisis();
  
  const [isPressed, setIsPressed] = useState(false);
  const [showSwipeConfirmModal, setShowSwipeConfirmModal] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  
  const swipeRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const batterySettings = getBatteryOptimizedSettings();

  // Don't show if user not authenticated
  if (!user) return null;

  const handlePress = useCallback(() => {
    triggerHapticFeedback([200, 100, 200]);
    setIsPressed(true);
    
    if (isMobile && enableSwipeConfirm) {
      setShowSwipeConfirmModal(true);
    } else {
      handleCrisisActivation();
    }
    
    setTimeout(() => setIsPressed(false), 300);
  }, [isMobile, enableSwipeConfirm, triggerHapticFeedback]);

  const handleCrisisActivation = useCallback(() => {
    setIsActive(true);
    triggerHapticFeedback([500, 200, 500]);
    onCrisisActivated?.();
    
    setTimeout(() => {
      setIsActive(false);
      setShowSwipeConfirmModal(false);
      setSwipeProgress(0);
    }, 2000);
  }, [onCrisisActivated, triggerHapticFeedback]);

  const handleCall988 = useCallback(() => {
    triggerHapticFeedback([300, 100, 300]);
    escalateCrisis('high');
  }, [triggerHapticFeedback]);

  const handleCall911 = useCallback(() => {
    triggerHapticFeedback([500, 200, 500]);
    escalateCrisis('severe');
  }, [triggerHapticFeedback]);

  // Swipe gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!showSwipeConfirmModal) return;
    touchStartX.current = e.touches[0].clientX;
  }, [showSwipeConfirmModal]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!showSwipeConfirmModal || !swipeRef.current) return;
    
    const touchX = e.touches[0].clientX;
    const deltaX = touchX - touchStartX.current;
    const swipeWidth = swipeRef.current.clientWidth - 80; // Account for button width
    const progress = Math.max(0, Math.min(1, deltaX / swipeWidth));
    
    setSwipeProgress(progress);
    
    if (progress > 0.8) {
      handleCall988();
    }
  }, [showSwipeConfirmModal, handleCall988]);

  const handleTouchEnd = useCallback(() => {
    if (swipeProgress < 0.8) {
      setSwipeProgress(0);
    }
  }, [swipeProgress]);

  const buttonSize = size === 'large' ? 'w-20 h-20' : 'w-16 h-16';
  const iconSize = size === 'large' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-4">
      {/* Accessibility Controls */}
      <div className="flex gap-2">
        <Button
          onClick={toggleContrastMode}
          size="sm"
          variant="outline"
          className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm"
          aria-label="Toggle high contrast mode"
        >
          <Shield className="w-4 h-4" />
        </Button>
        
        <Button
          onClick={() => window.speechSynthesis.speak(new SpeechSynthesisUtterance('Crisis support activated'))}
          size="sm"
          variant="outline"
          className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm"
          aria-label="Audio feedback"
        >
          <Volume2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Swipe to Call 988 */}
      {showSwipeConfirmModal && (
        <div className="relative w-64 h-16 bg-destructive/20 rounded-full border-2 border-destructive overflow-hidden">
          <div 
            ref={swipeRef}
            className="absolute inset-0 flex items-center justify-between px-4"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <span className="text-sm font-medium text-destructive">
              Swipe to call 988 →
            </span>
            
            {/* Swipe indicator */}
            <div 
              className="absolute left-2 w-12 h-12 bg-destructive rounded-full flex items-center justify-center transition-transform"
              style={{ transform: `translateX(${swipeProgress * (256 - 80)}px)` }}
            >
              <Phone className="w-5 h-5 text-destructive-foreground" />
            </div>
            
            {/* Progress fill */}
            <div 
              className="absolute inset-0 bg-destructive/30 transition-all"
              style={{ width: `${swipeProgress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Crisis Button */}
      <Button
        onClick={handlePress}
        onDoubleClick={handleCall911}
        className={`
          ${buttonSize} rounded-full 
          ${isContrastMode 
            ? 'bg-red-600 border-4 border-yellow-400 shadow-[0_0_20px_rgba(255,255,0,0.8)]' 
            : 'bg-gradient-to-br from-destructive to-destructive/80 shadow-2xl'
          }
          text-destructive-foreground font-bold
          border-2 border-destructive-foreground/20
          transition-all duration-200
          ${!batterySettings.reducedAnimations ? 'animate-pulse' : ''}
          focus:outline-none focus:ring-4 focus:ring-destructive/50
          active:scale-95
          ${isPressed ? 'scale-95' : ''}
          ${isActive ? 'bg-green-600 scale-110' : ''}
          touch-manipulation
        `}
        size="lg"
        aria-label="Emergency Crisis Support - Tap for help, double-tap for 911"
        role="button"
        tabIndex={0}
      >
        <div className="flex flex-col items-center justify-center">
          {isActive ? (
            <>
              <Shield className={`${iconSize} mb-1`} />
              <span className="text-xs font-extrabold">HELP SENT</span>
            </>
          ) : (
            <>
              <AlertTriangle className={`${iconSize} mb-1`} />
              <span className="text-xs font-extrabold">SOS</span>
            </>
          )}
        </div>
      </Button>

      {/* Instructions for mobile users */}
      {isMobile && (
        <div className="text-xs text-muted-foreground text-center max-w-48">
          <p>Tap: Crisis help</p>
          <p>Double-tap: Call 911</p>
          <p>Shake device: Emergency alert</p>
        </div>
      )}
    </div>
  );
};

export default MobileCrisisButton;
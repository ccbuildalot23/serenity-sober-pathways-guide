import React, { useState, useEffect } from 'react';
import { AlertCircle, Heart, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useShakeDetection } from '@/hooks/useShakeDetection';

interface MobileCrisisButtonProps {
  onActivate: () => void;
  variant?: 'primary' | 'secondary' | 'emergency';
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  hapticEnabled?: boolean;
  shakeEnabled?: boolean;
}

export const MobileCrisisButton: React.FC<MobileCrisisButtonProps> = ({
  onActivate,
  variant = 'emergency',
  size = 'extra-large',
  hapticEnabled = true,
  shakeEnabled = true
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [voiceActivated, setVoiceActivated] = useState(false);
  const { triggerHaptic } = useHapticFeedback();
  const { isShaking } = useShakeDetection({ threshold: 15, duration: 1000 });

  // Handle shake detection for emergency activation
  useEffect(() => {
    if (shakeEnabled && isShaking) {
      handleEmergencyActivation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShaking, shakeEnabled]);

  // Voice activation for emergency
  useEffect(() => {
    if (!variant || variant !== 'emergency') return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      if (transcript.includes('help') || transcript.includes('emergency') || transcript.includes('crisis')) {
        setVoiceActivated(true);
        handleEmergencyActivation();
        setTimeout(() => setVoiceActivated(false), 3000);
      }
    };

    recognition.onerror = () => {
      // Silent fail - voice activation is optional
    };

    try {
      recognition.start();
    } catch (e) {
      // Silent fail if already started
    }

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        // Silent cleanup
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const handleEmergencyActivation = () => {
    if (hapticEnabled) {
      // Strong haptic pattern for emergency
      triggerHaptic('heavy');
      setTimeout(() => triggerHaptic('heavy'), 100);
      setTimeout(() => triggerHaptic('heavy'), 200);
    }
    onActivate();
  };

  const handleTouchStart = () => {
    setIsPressed(true);
    if (hapticEnabled) {
      triggerHaptic('light');
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (variant === 'emergency') {
      // Single tap activation with haptic confirmation
      handleEmergencyActivation();
    } else {
      if (hapticEnabled) {
        triggerHaptic('medium');
      }
      onActivate();
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-12 w-12 text-lg';
      case 'medium':
        return 'h-16 w-16 text-xl';
      case 'large':
        return 'h-20 w-20 text-2xl';
      case 'extra-large':
        return 'h-24 w-24 text-3xl'; // 96px - exceeds 60px minimum for crisis
      default:
        return 'h-20 w-20 text-2xl';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800';
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800';
      case 'emergency':
        return 'bg-red-600 hover:bg-red-700 active:bg-red-800 animate-pulse';
      default:
        return 'bg-red-600 hover:bg-red-700 active:bg-red-800';
    }
  };

  return (
    <div className="relative">
      <Button
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        className={cn(
          'rounded-full shadow-lg transition-all duration-150',
          'flex items-center justify-center',
          'touch-manipulation', // Disable double-tap zoom
          getSizeClasses(),
          getVariantClasses(),
          isPressed && 'scale-95 shadow-inner'
        )}
        aria-label="Emergency Crisis Button"
        data-testid="primary-crisis-button"
      >
        {variant === 'emergency' ? (
          <AlertCircle className="w-3/4 h-3/4" />
        ) : variant === 'primary' ? (
          <Heart className="w-3/4 h-3/4" />
        ) : (
          <Shield className="w-3/4 h-3/4" />
        )}
      </Button>
      
      {voiceActivated && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-green-600 animate-pulse">
          Voice activation triggered!
        </div>
      )}
      
      {isShaking && shakeEnabled && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-red-600 animate-pulse">
          Shake detected!
        </div>
      )}
    </div>
  );
};
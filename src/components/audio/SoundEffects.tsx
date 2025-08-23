/**
 * Sound Effects Component
 * Provides gentle notification sounds and optional click feedback
 */

import React, { useCallback, useEffect } from 'react';
import { audioService, AudioPreferences } from '@/services/audioService';
import logger from '../../services/loggerService';

interface SoundEffectsProps {
  children?: React.ReactNode;
  enableClickFeedback?: boolean;
}

type SoundEffect = 
  | 'soft-chime'
  | 'gentle-bell' 
  | 'completion-chime'
  | 'transition-sound'
  | 'click'
  | 'hover'
  | 'success'
  | 'error'
  | 'warning';

export class SoundEffectsManager {
  private static instance: SoundEffectsManager;
  private preferences: AudioPreferences;
  
  private constructor() {
    this.preferences = audioService.getPreferences();
    
    // Listen for preference changes
    this.setupPreferenceListener();
  }

  public static getInstance(): SoundEffectsManager {
    if (!SoundEffectsManager.instance) {
      SoundEffectsManager.instance = new SoundEffectsManager();
    }
    return SoundEffectsManager.instance;
  }

  private setupPreferenceListener() {
    // Listen for storage changes to update preferences
    window.addEventListener('storage', (e) => {
      if (e.key === 'serenity-audio-preferences') {
        this.preferences = audioService.getPreferences();
      }
    });
  }

  public async playEffect(effect: SoundEffect, volume = 0.6): Promise<void> {
    // Check if sound effects are enabled
    if (!this.preferences.soundEffectsEnabled && !this.preferences.notificationSoundsEnabled) {
      return;
    }

    try {
      // Map effect names to track IDs
      const effectMap: Record<SoundEffect, string> = {
        'soft-chime': 'soft-chime',
        'gentle-bell': 'gentle-bell',
        'completion-chime': 'completion-chime',
        'transition-sound': 'transition-sound',
        'click': 'soft-chime',
        'hover': 'gentle-bell',
        'success': 'completion-chime',
        'error': 'gentle-bell',
        'warning': 'soft-chime'
      };

      const trackId = effectMap[effect];
      if (trackId) {
        await audioService.playTrack(trackId, volume * 0.4); // Keep effects subtle
      }
    } catch (error) {
      logger.warn('Failed to play sound effect:', error, { component: 'SoundEffects' });
    }
  }

  public playNotificationSound(): void {
    if (this.preferences.notificationSoundsEnabled) {
      this.playEffect('soft-chime', 0.5);
    }
  }

  public playSuccessSound(): void {
    if (this.preferences.soundEffectsEnabled) {
      this.playEffect('completion-chime', 0.7);
    }
  }

  public playTransitionSound(): void {
    if (this.preferences.soundEffectsEnabled) {
      this.playEffect('transition-sound', 0.3);
    }
  }

  public playClickSound(): void {
    if (this.preferences.soundEffectsEnabled) {
      this.playEffect('click', 0.2);
    }
  }
}

// Global instance
export const soundEffects = SoundEffectsManager.getInstance();

export const SoundEffects: React.FC<SoundEffectsProps> = ({ 
  children, 
  enableClickFeedback = false 
}) => {
  const [preferences, setPreferences] = React.useState<AudioPreferences>(
    audioService.getPreferences()
  );

  useEffect(() => {
    const updatePreferences = () => {
      setPreferences(audioService.getPreferences());
    };

    // Listen for preference updates
    window.addEventListener('storage', updatePreferences);
    return () => window.removeEventListener('storage', updatePreferences);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (!enableClickFeedback || !preferences.soundEffectsEnabled) {
      return;
    }

    const target = event.target as HTMLElement;
    
    // Only play sounds for interactive elements
    if (target.tagName === 'BUTTON' || 
        target.closest('button') || 
        target.hasAttribute('role') ||
        target.classList.contains('clickable')) {
      
      soundEffects.playClickSound();
    }
  }, [enableClickFeedback, preferences.soundEffectsEnabled]);

  if (!children) {
    return null;
  }

  if (enableClickFeedback) {
    return (
      <div onClick={handleClick} className="contents">
        {children}
      </div>
    );
  }

  return <>{children}</>;
};

// Hook for using sound effects in components
export const useSoundEffects = () => {
  const preferences = React.useMemo(() => audioService.getPreferences(), []);

  const playEffect = useCallback((effect: SoundEffect, volume?: number) => {
    soundEffects.playEffect(effect, volume);
  }, []);

  const playNotification = useCallback(() => {
    soundEffects.playNotificationSound();
  }, []);

  const playSuccess = useCallback(() => {
    soundEffects.playSuccessSound();
  }, []);

  const playTransition = useCallback(() => {
    soundEffects.playTransitionSound();
  }, []);

  const playClick = useCallback(() => {
    soundEffects.playClickSound();
  }, []);

  return {
    playEffect,
    playNotification,
    playSuccess,
    playTransition,
    playClick,
    isEnabled: preferences.soundEffectsEnabled || preferences.notificationSoundsEnabled
  };
};

// HOC for adding sound effects to buttons
export const withSoundEffects = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { soundEffect?: SoundEffect; playOnClick?: boolean }> => {
  return ({ soundEffect = 'click', playOnClick = true, ...props }) => {
    const { playEffect, isEnabled } = useSoundEffects();

    const handleClick = useCallback((originalClick?: Function) => {
      return (event: any) => {
        if (playOnClick && isEnabled) {
          playEffect(soundEffect);
        }
        if (originalClick) {
          originalClick(event);
        }
      };
    }, [playEffect, soundEffect, playOnClick, isEnabled]);

    const enhancedProps = {
      ...props,
      onClick: handleClick((props as any).onClick)
    } as P;

    return <Component {...enhancedProps} />;
  };
};

export default SoundEffects;
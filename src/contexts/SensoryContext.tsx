/**
 * Sensory Context Provider
 * Manages global sensory settings and preferences across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { audioService, AudioPreferences } from '@/services/audioService';
import { soundEffects } from '@/components/audio/SoundEffects';

export interface SensorySettings {
  // Audio settings
  audioPreferences: AudioPreferences;
  
  // Visual settings
  enableCalmingBackgrounds: boolean;
  backgroundIntensity: 'minimal' | 'subtle' | 'moderate';
  backgroundVariant: 'gradient' | 'particles' | 'waves' | 'nature' | 'minimal';
  
  // Mindfulness settings
  mindfulnessMode: boolean;
  reducedVisualComplexity: boolean;
  softerColors: boolean;
  slowerAnimations: boolean;
  focusMode: boolean;
  
  // Accessibility settings
  reduceMotion: boolean;
  highContrast: boolean;
  largerText: boolean;
  
  // Interaction settings
  enableHapticFeedback: boolean;
  enableSoundFeedback: boolean;
  interactionPause: boolean; // Pause ambient sounds during interactions
}

interface SensoryContextValue {
  settings: SensorySettings;
  updateSettings: (updates: Partial<SensorySettings>) => void;
  resetSettings: () => void;
  
  // Audio controls
  playAmbientSound: (trackId: string) => Promise<void>;
  stopAmbientSound: (trackId: string) => Promise<void>;
  stopAllAmbientSounds: () => void;
  setMasterVolume: (volume: number) => void;
  
  // Sound effects
  playNotificationSound: () => void;
  playSuccessSound: () => void;
  playTransitionSound: () => void;
  
  // Visual controls
  enableMindfulnessMode: (enabled: boolean) => void;
  enableFocusMode: (enabled: boolean) => void;
  
  // Interaction helpers
  pauseForInteraction: () => void;
  resumeAfterInteraction: () => void;
  
  // State
  isSupported: boolean;
  isLoading: boolean;
}

const SensoryContext = createContext<SensoryContextValue | undefined>(undefined);

const STORAGE_KEY = 'serenity-sensory-settings';

function getDefaultSettings(): SensorySettings {
  return {
    audioPreferences: audioService.getPreferences(),
    enableCalmingBackgrounds: false, // Disabled by default - user must opt-in
    backgroundIntensity: 'subtle',
    backgroundVariant: 'gradient',
    mindfulnessMode: false,
    reducedVisualComplexity: false,
    softerColors: false,
    slowerAnimations: false,
    focusMode: false,
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    largerText: false,
    enableHapticFeedback: false,
    enableSoundFeedback: false,
    interactionPause: true
  };
}

interface SensoryProviderProps {
  children: ReactNode;
}

export const SensoryProvider: React.FC<SensoryProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<SensorySettings>(getDefaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported] = useState(audioService.isAudioSupported());

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        const merged = { ...getDefaultSettings(), ...parsedSettings };
        setSettings(merged);
        
        // Update audio service with loaded preferences
        audioService.updatePreferences(merged.audioPreferences);
      }
    } catch (error) {
      console.warn('Failed to load sensory settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.warn('Failed to save sensory settings:', error);
      }
    }
  }, [settings, isLoading]);

  // Apply visual settings to document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Apply CSS custom properties for sensory settings
    root.style.setProperty('--sensory-enabled', settings.mindfulnessMode ? '1' : '0');
    root.style.setProperty('--animation-speed', settings.slowerAnimations ? '0.5' : '1');
    root.style.setProperty('--background-intensity', settings.backgroundIntensity);
    
    if (settings.softerColors) {
      root.style.setProperty('--color-saturation', '0.8');
      root.style.setProperty('--color-brightness', '1.1');
    } else {
      root.style.setProperty('--color-saturation', '1');
      root.style.setProperty('--color-brightness', '1');
    }

    // Apply body classes
    body.classList.toggle('mindfulness-mode', settings.mindfulnessMode);
    body.classList.toggle('focus-mode', settings.focusMode);
    body.classList.toggle('reduced-visual-complexity', settings.reducedVisualComplexity);
    body.classList.toggle('high-contrast', settings.highContrast);
    body.classList.toggle('larger-text', settings.largerText);
    body.classList.toggle('reduce-motion', settings.reduceMotion);

    return () => {
      // Cleanup classes on unmount
      body.classList.remove(
        'mindfulness-mode',
        'focus-mode', 
        'reduced-visual-complexity',
        'high-contrast',
        'larger-text',
        'reduce-motion'
      );
    };
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<SensorySettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      
      // Update audio service if audio preferences changed
      if (updates.audioPreferences) {
        audioService.updatePreferences(updates.audioPreferences);
        newSettings.audioPreferences = audioService.getPreferences();
      }
      
      return newSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaultSettings = getDefaultSettings();
    setSettings(defaultSettings);
    audioService.updatePreferences(defaultSettings.audioPreferences);
  }, []);

  // Audio controls
  const playAmbientSound = useCallback(async (trackId: string) => {
    if (!settings.audioPreferences.ambientEnabled) return;
    await audioService.playTrack(trackId);
  }, [settings.audioPreferences.ambientEnabled]);

  const stopAmbientSound = useCallback(async (trackId: string) => {
    await audioService.stopTrack(trackId);
  }, []);

  const stopAllAmbientSounds = useCallback(() => {
    audioService.stopAllTracks();
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    audioService.setMasterVolume(volume);
    updateSettings({
      audioPreferences: { ...settings.audioPreferences, masterVolume: volume }
    });
  }, [settings.audioPreferences, updateSettings]);

  // Sound effects
  const playNotificationSound = useCallback(() => {
    if (settings.audioPreferences.notificationSoundsEnabled) {
      soundEffects.playNotificationSound();
    }
  }, [settings.audioPreferences.notificationSoundsEnabled]);

  const playSuccessSound = useCallback(() => {
    if (settings.enableSoundFeedback) {
      soundEffects.playSuccessSound();
    }
  }, [settings.enableSoundFeedback]);

  const playTransitionSound = useCallback(() => {
    if (settings.enableSoundFeedback) {
      soundEffects.playTransitionSound();
    }
  }, [settings.enableSoundFeedback]);

  // Visual controls
  const enableMindfulnessMode = useCallback((enabled: boolean) => {
    updateSettings({ 
      mindfulnessMode: enabled,
      // Auto-enable related settings when mindfulness mode is turned on
      ...(enabled && {
        reducedVisualComplexity: true,
        softerColors: true,
        slowerAnimations: true
      })
    });
  }, [updateSettings]);

  const enableFocusMode = useCallback((enabled: boolean) => {
    updateSettings({ focusMode: enabled });
  }, [updateSettings]);

  // Interaction helpers
  const pauseForInteraction = useCallback(() => {
    if (settings.interactionPause) {
      audioService.pauseForInteraction();
    }
  }, [settings.interactionPause]);

  const resumeAfterInteraction = useCallback(() => {
    if (settings.interactionPause) {
      audioService.resumeAfterInteraction();
    }
  }, [settings.interactionPause]);

  // Haptic feedback helper
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!settings.enableHapticFeedback || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50]
    };
    
    navigator.vibrate(patterns[type]);
  }, [settings.enableHapticFeedback]);

  const contextValue: SensoryContextValue = {
    settings,
    updateSettings,
    resetSettings,
    
    // Audio controls
    playAmbientSound,
    stopAmbientSound,
    stopAllAmbientSounds,
    setMasterVolume,
    
    // Sound effects
    playNotificationSound,
    playSuccessSound,
    playTransitionSound,
    
    // Visual controls
    enableMindfulnessMode,
    enableFocusMode,
    
    // Interaction helpers
    pauseForInteraction,
    resumeAfterInteraction,
    
    // State
    isSupported,
    isLoading
  };

  return (
    <SensoryContext.Provider value={contextValue}>
      {children}
    </SensoryContext.Provider>
  );
};

// Hook to use the sensory context
export const useSensory = (): SensoryContextValue => {
  const context = useContext(SensoryContext);
  if (context === undefined) {
    throw new Error('useSensory must be used within a SensoryProvider');
  }
  return context;
};

// Convenience hooks for specific functionality
export const useAmbientAudio = () => {
  const { 
    playAmbientSound, 
    stopAmbientSound, 
    stopAllAmbientSounds, 
    setMasterVolume,
    settings 
  } = useSensory();
  
  return {
    playAmbientSound,
    stopAmbientSound,
    stopAllAmbientSounds,
    setMasterVolume,
    isEnabled: settings.audioPreferences.ambientEnabled,
    volume: settings.audioPreferences.masterVolume
  };
};

export const useMindfulnessMode = () => {
  const { enableMindfulnessMode, enableFocusMode, settings } = useSensory();
  
  return {
    enableMindfulnessMode,
    enableFocusMode,
    isMindfulnessEnabled: settings.mindfulnessMode,
    isFocusModeEnabled: settings.focusMode,
    visualSettings: {
      reducedVisualComplexity: settings.reducedVisualComplexity,
      softerColors: settings.softerColors,
      slowerAnimations: settings.slowerAnimations
    }
  };
};

export const useSoundFeedback = () => {
  const { 
    playNotificationSound, 
    playSuccessSound, 
    playTransitionSound,
    pauseForInteraction,
    resumeAfterInteraction,
    settings 
  } = useSensory();
  
  return {
    playNotificationSound,
    playSuccessSound,
    playTransitionSound,
    pauseForInteraction,
    resumeAfterInteraction,
    isEnabled: settings.enableSoundFeedback || settings.audioPreferences.soundEffectsEnabled
  };
};

export default SensoryProvider;
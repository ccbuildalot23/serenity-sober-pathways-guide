import { useCallback } from 'react';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

interface HapticFeedback {
  triggerHaptic: (style?: HapticStyle) => void;
  isSupported: boolean;
}

export const useHapticFeedback = (): HapticFeedback => {
  // Check if haptic feedback is supported
  const isSupported = typeof window !== 'undefined' && 
    'vibrate' in navigator || 
    'mozVibrate' in navigator ||
    'webkitVibrate' in navigator;

  const triggerHaptic = useCallback((style: HapticStyle = 'medium') => {
    if (!isSupported) return;

    // Map style to vibration patterns
    const patterns: Record<HapticStyle, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: 50,
      rigid: [30, 10, 30],
      soft: [10, 20, 10]
    };

    const pattern = patterns[style] || patterns.medium;

    try {
      // Try standard API
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      } 
      // Try webkit API for older iOS
      else if ('webkitVibrate' in (navigator as any)) {
        (navigator as any).webkitVibrate(pattern);
      }
      // Try Mozilla API
      else if ('mozVibrate' in (navigator as any)) {
        (navigator as any).mozVibrate(pattern);
      }

      // For iOS devices with Taptic Engine (via Capacitor)
      if (window.Capacitor && window.Capacitor.Plugins?.Haptics) {
        const hapticImpact = {
          light: 'LIGHT',
          medium: 'MEDIUM',
          heavy: 'HEAVY',
          rigid: 'HEAVY',
          soft: 'LIGHT'
        };
        
        window.Capacitor.Plugins.Haptics.impact({
          style: hapticImpact[style] || 'MEDIUM'
        });
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isSupported]);

  return {
    triggerHaptic,
    isSupported
  };
};
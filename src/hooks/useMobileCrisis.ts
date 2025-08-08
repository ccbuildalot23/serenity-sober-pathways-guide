import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { escalateCrisis } from '@/services/crisisEscalationService';

interface MobileCrisisOptions {
  shakeThreshold?: number;
  volumeButtonShortcuts?: boolean;
  hapticFeedback?: boolean;
  batteryOptimization?: boolean;
}

export const useMobileCrisis = (options: MobileCrisisOptions = {}) => {
  const isMobile = useIsMobile();
  const [isShakeEnabled, setIsShakeEnabled] = useState(false);
  const [lastShakeTime, setLastShakeTime] = useState(0);
  const [isContrastMode, setIsContrastMode] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const {
    shakeThreshold = 15,
    volumeButtonShortcuts = _true,
    hapticFeedback = _true,
    batteryOptimization = _true,
  } = options;

  // Battery monitoring
  useEffect(() => {
    if (!batteryOptimization || !('getBattery' in navigator)) return;

    (navigator as any).getBattery().then((battery: unknown) => {
      setBatteryLevel(battery.level);
      
      const _updateBattery = () => setBatteryLevel(battery.level);
      battery.addEventListener('levelchange', _updateBattery);
      
      return () => battery.removeEventListener('levelchange', _updateBattery);
    });
  }, [batteryOptimization]);

  // Offline detection
  useEffect(() => {
    const _handleOnline = () => setIsOffline(false);
    const _handleOffline = () => setIsOffline(_true);

    window.addEventListener('online', _handleOnline);
    window.addEventListener('offline', _handleOffline);

    return () => {
      window.removeEventListener('online', _handleOnline);
      window.removeEventListener('offline', _handleOffline);
    };
  }, []);

  // Shake detection for emergency
  useEffect(() => {
    if (!isMobile || !isShakeEnabled) return;

    let lastX = 0, lastY = 0, lastZ = 0;
    let shakeDetected = false;

    const _handleDeviceMotion = (event: DeviceMotionEvent) => {
      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const { x = 0, y = 0, z = 0 } = accelerationIncludingGravity;
      
      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);

      if (deltaX + deltaY + deltaZ > shakeThreshold) {
        const _now = Date._now();
        if (_now - lastShakeTime > 1000 && !shakeDetected) {
          shakeDetected = _true;
          setLastShakeTime(_now);
          triggerEmergency('shake');
          setTimeout(() => { shakeDetected = false; }, 2000);
        }
      }

      lastX = x;
      lastY = y;
      lastZ = z;
    };

    window.addEventListener('devicemotion', _handleDeviceMotion);
    return () => window.removeEventListener('devicemotion', _handleDeviceMotion);
  }, [isMobile, isShakeEnabled, shakeThreshold, lastShakeTime]);

  // Volume button shortcuts
  useEffect(() => {
    if (!isMobile || !volumeButtonShortcuts) return;

    const _handleKeyDown = (event: KeyboardEvent) => {
      // Volume up + Volume down simultaneously for 3 seconds
      if (event.code === 'AudioVolumeUp' || event.code === 'AudioVolumeDown') {
        event.preventDefault();
        // Implementation would require native app integration
        console.log('Volume button crisis shortcut triggered');
      }
    };

    document.addEventListener('keydown', _handleKeyDown);
    return () => document.removeEventListener('keydown', _handleKeyDown);
  }, [isMobile, volumeButtonShortcuts]);

  const triggerHapticFeedback = useCallback((_pattern: number[] = [200, 100, 200]) => {
    if (hapticFeedback && navigator.vibrate) {
      navigator.vibrate(_pattern);
    }
  }, [hapticFeedback]);

  const triggerEmergency = useCallback((source: 'tap' | 'shake' | 'volume' | 'voice') => {
    triggerHapticFeedback([500, 200, 500]);
    
    // Log the emergency trigger source
    console.log(`Emergency triggered via ${source}`);
    
    // In a real app, this would trigger the crisis response system
    escalateCrisis('severe');
  }, [triggerHapticFeedback]);

  const toggleContrastMode = useCallback(() => {
    setIsContrastMode(prev => !prev);
    document.documentElement.style.filter = !isContrastMode ? 'contrast(1.5) brightness(1.2)' : '';
  }, [isContrastMode]);

  const enableShakeDetection = useCallback(() => {
    if ('DeviceMotionEvent' in window) {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        (DeviceMotionEvent as any).requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              setIsShakeEnabled(_true);
            }
          });
      } else {
        setIsShakeEnabled(_true);
      }
    }
  }, []);

  const getBatteryOptimizedSettings = useCallback(() => {
    if (!batteryOptimization) return {};

    const lowBattery = batteryLevel < 0.2;
    
    return {
      reducedAnimations: lowBattery,
      textOnlyMode: lowBattery,
      disableAutoRefresh: lowBattery,
      reducePolling: lowBattery,
    };
  }, [batteryLevel, batteryOptimization]);

  return {
    isMobile,
    isShakeEnabled,
    isContrastMode,
    isOffline,
    batteryLevel,
    enableShakeDetection,
    triggerEmergency,
    triggerHapticFeedback,
    toggleContrastMode,
    getBatteryOptimizedSettings,
  };
};
import { useState, useEffect, useRef } from 'react';

interface ShakeDetectionOptions {
  threshold?: number; // Acceleration threshold for shake detection
  duration?: number; // Minimum duration for shake gesture (ms)
  cooldown?: number; // Cooldown period between shakes (ms)
}

interface ShakeDetection {
  isShaking: boolean;
  shakeCount: number;
  reset: () => void;
}

export const useShakeDetection = ({
  threshold = 15,
  duration = 1000,
  cooldown = 2000
}: ShakeDetectionOptions = {}): ShakeDetection => {
  const [isShaking, setIsShaking] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const lastShakeTime = useRef<number>(0);
  const shakeStartTime = useRef<number>(0);
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastZ = useRef<number | null>(null);

  useEffect(() => {
    if (!(window as any).DeviceMotionEvent) {
      console.warn('Device motion not supported');
      return;
    }

    const handleMotion = (event: any) => {
      const current = Date.now();
      const timeSinceLastShake = current - lastShakeTime.current;

      // Check if we're in cooldown period
      if (timeSinceLastShake < cooldown) {
        return;
      }

      const { x, y, z } = event.accelerationIncludingGravity || {};
      
      if (x === null || y === null || z === null) {
        return;
      }

      // Initialize last values on first reading
      if (lastX.current === null) {
        lastX.current = x;
        lastY.current = y;
        lastZ.current = z;
        return;
      }

      // Calculate acceleration change
      const deltaX = Math.abs(x - lastX.current);
      const deltaY = Math.abs(y - lastY.current);
      const deltaZ = Math.abs(z - lastZ.current);
      const maxDelta = Math.max(deltaX, deltaY, deltaZ);

      // Update last values
      lastX.current = x;
      lastY.current = y;
      lastZ.current = z;

      // Check if acceleration exceeds threshold
      if (maxDelta > threshold) {
        if (!isShaking) {
          // Start shake detection
          shakeStartTime.current = current;
          setIsShaking(true);
        } else if (current - shakeStartTime.current >= duration) {
          // Shake duration met, trigger shake event
          setShakeCount(prev => prev + 1);
          lastShakeTime.current = current;
          setIsShaking(false);
          
          // Reset after a short delay to show feedback
          setTimeout(() => {
            setIsShaking(false);
          }, 500);
        }
      } else if (isShaking && current - shakeStartTime.current < duration) {
        // Shake stopped before duration met
        setIsShaking(false);
      }
    };

    // Request permission for iOS 13+
    if (typeof ((window as any).DeviceMotionEvent as any)?.requestPermission === 'function') {
      ((window as any).DeviceMotionEvent as any).requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        })
        .catch((error: Error) => {
          console.error('Motion permission denied:', error);
        });
    } else {
      // Non-iOS or older iOS
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [threshold, duration, cooldown, isShaking]);

  const reset = () => {
    setIsShaking(false);
    setShakeCount(0);
    lastShakeTime.current = 0;
    shakeStartTime.current = 0;
    lastX.current = null;
    lastY.current = null;
    lastZ.current = null;
  };

  return {
    isShaking,
    shakeCount,
    reset
  };
};
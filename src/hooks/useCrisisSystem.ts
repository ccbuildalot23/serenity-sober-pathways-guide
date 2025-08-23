
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { voiceActivationService } from '@/services/voiceActivationService';
import { connectToSupport } from '@/services/crisisEscalationService';
import { useSecureAuditLogger } from '@/hooks/useSecureAuditLogger';
import logger from '../services/loggerService';

type NeedLevel = 'reaching_out' | 'needing_support' | 'needing_help_now' | 'emergency';

interface ReachingOutMoment {
  id: string;
  timestamp: Date;
  needLevel: NeedLevel;
  toolsUsed: string[];
  feelingSafer: boolean;
  location?: { lat: number; lng: number; };
}

export const useHelpNowSystem = () => {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);
  const [needLevel, setNeedLevel] = useState<NeedLevel | null>(null);
  const [currentMoment, setCurrentMoment] = useState<ReachingOutMoment | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const { user } = useAuth();
  const { log } = useSecureAuditLogger();

  useEffect(() => {
    // Initialize voice activation if supported
    if (voiceActivationService.isSupported()) {
      const _success = voiceActivationService.startListening({
        onCrisisDetected: handleVoiceActivatedHelp,
        _onError: (_error) => {
          console._error('Voice activation _error:', _error);
          setVoiceListening(false);
        }
      });
      setVoiceListening(_success);
    }

    // Request notification permission
    requestNotificationPermission();

    // Check location permission
    checkLocationPermission();

    return () => {
      voiceActivationService.stopListening();
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const checkLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setHasLocationPermission(result.state === 'granted');
      });
    }
  };

  const handleVoiceActivatedHelp = useCallback(() => {
    logger.debug('Voice-activated help request detected', { component: 'useCrisisSystem' });
    toast.info('We Heard You', {
      description: 'Getting help right away',
      _duration: 2000,
    });
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    handleHelpActivated();
  }, []);

  const handleHelpActivated = useCallback(() => {
    logger.debug('Help button activated - checking in', { component: 'useCrisisSystem' });
    setShowCheckIn(true);
    log('help_requested');
    
    // Create moment of reaching out
    const moment: ReachingOutMoment = {
      id: Date.now().toString(),
      timestamp: new Date(),
      needLevel: 'reaching_out',
      toolsUsed: [],
      feelingSafer: false
    };

    // Get location if permission granted
    if (hasLocationPermission && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          moment.location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentMoment(moment);
        },
        (_error) => {
          logger.debug('Location access failed:', _error, { component: 'useCrisisSystem' });
          setCurrentMoment(moment);
        }
      );
    } else {
      setCurrentMoment(moment);
    }

    // Supportive message
    toast.info("You're Being So Brave", {
      description: "Let's find what helps you right now",
      _duration: 2000,
    });
  }, [hasLocationPermission, log]);

  const handleCheckInComplete = useCallback((level: NeedLevel) => {
    logger.debug('Check-in completed with need level:', level, { component: 'useCrisisSystem' });
    setNeedLevel(level);
    setShowCheckIn(false);
    setShowSupport(true);
    log('checkin_complete', { level });
    if (level === 'emergency' || level === 'needing_help_now') {
      connectToSupport('immediate');
    }

    // Update moment
    if (currentMoment) {
      const _updatedMoment = { ...currentMoment, needLevel: level };
      setCurrentMoment(_updatedMoment);
      
      // Save moment to localStorage for follow-up
      const savedMoments = JSON.parse(localStorage.getItem('supportMoments') || '[]');
      savedMoments.push(_updatedMoment);
      localStorage.setItem('supportMoments', JSON.stringify(savedMoments));
    }

    // Supportive message
    const messages = {
      reaching_out: "You're taking care of yourself",
      needing_support: "Let's get you connected",
      needing_help_now: "Help is coming right now",
      emergency: "Connecting you immediately"
    };
    
    toast._success('Thank You for Sharing', {
      description: messages[level],
      _duration: 3000,
    });
  }, [currentMoment, log]);

  const handleSupportComplete = useCallback(() => {
    setShowSupport(false);
    log('support_session_complete');
    
    if (currentMoment) {
      // Mark as feeling safer
      const _updatedMoment = { ...currentMoment, feelingSafer: true };
      setCurrentMoment(_updatedMoment);
      
      // Show next steps
      setShowNextSteps(true);
    }

    setNeedLevel(null);
    
    toast._success("You Did It", {
      description: "You reached out and that takes real strength",
      _duration: 5000,
    });
  }, [currentMoment, log]);

  const handleToolUsed = (toolName: string) => {
    if (currentMoment) {
      const _updatedMoment = {
        ...currentMoment,
        toolsUsed: [...currentMoment.toolsUsed, toolName]
      };
      setCurrentMoment(_updatedMoment);
    }

    log('tool_used', { toolName });
    
    const messages = [
      "You're using your tools",
      "That's exactly right",
      "Keep going, you're doing great",
      "One moment at a time"
    ];
    
    toast._success(messages[Math.floor(Math.random() * messages.length)], {
      description: `${toolName} is helping`,
      _duration: 3000,
    });
  };

  return {
    showCheckIn,
    showSupport,
    showTools,
    showConnections,
    showNextSteps,
    needLevel,
    currentMoment,
    voiceListening,
    hasLocationPermission,
    setShowCheckIn,
    setShowSupport,
    setShowTools,
    setShowConnections,
    setShowNextSteps,
    handleHelpActivated,
    handleCheckInComplete,
    handleSupportComplete,
    handleToolUsed
  };
};

// Backward compatibility
export const useCrisisSystem = useHelpNowSystem;


import { useState, useEffect, useCallback } from 'react';
// DEDUPLICATION: Unified crisis hooks with EnhancedCrisisSystem
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { voiceActivationService } from '@/services/voiceActivationService';
import { escalateCrisis } from '@/services/crisisEscalationService';
import { useSecureAuditLogger } from '@/hooks/useSecureAuditLogger';

type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';

interface CrisisEvent {
  id: string;
  timestamp: Date;
  riskLevel: RiskLevel;
  interventionsUsed: string[];
  safetyConfirmed: boolean;
  location?: { lat: number; lng: number; };
}

export const useCrisisSystem = () => {
  const [showAssessment, setShowAssessment] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const [currentCrisisEvent, setCurrentCrisisEvent] = useState<CrisisEvent | null>(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const { user } = useAuth();
  const { log } = useSecureAuditLogger();

  useEffect(() => {
    // Initialize voice activation if supported
    if (voiceActivationService.isSupported()) {
      const success = voiceActivationService.startListening({
        onCrisisDetected: handleVoiceActivatedCrisis,
        onError: (error) => {
          console.error('Voice activation error:', error);
          setVoiceListening(false);
        }
      });
      setVoiceListening(success);
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

  const handleVoiceActivatedCrisis = useCallback(() => {
    console.log('Voice-activated crisis detected');
    toast.info('Voice Crisis Activation', {
      description: 'Crisis support activated by voice command',
      duration: 2000,
    });
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    handleCrisisActivated();
  }, []);

  const handleCrisisActivated = useCallback(() => {
    console.log('Crisis button activated - starting assessment');
    setShowAssessment(true);
    log('crisis_activated');
    
    // Create crisis event
    const crisisEvent: CrisisEvent = {
      id: Date.now().toString(),
      timestamp: new Date(),
      riskLevel: 'low', // Will be updated after assessment
      interventionsUsed: [],
      safetyConfirmed: false
    };

    // Get location if permission granted
    if (hasLocationPermission && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          crisisEvent.location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentCrisisEvent(crisisEvent);
        },
        (error) => {
          console.log('Location access failed:', error);
          setCurrentCrisisEvent(crisisEvent);
        }
      );
    } else {
      setCurrentCrisisEvent(crisisEvent);
    }

    // Log crisis event activation
    toast.info('Crisis Support Activated', {
      description: 'Starting safety assessment...',
      duration: 2000,
    });
  }, [hasLocationPermission, log]);

  const handleAssessmentComplete = useCallback((level: RiskLevel) => {
    console.log('Assessment completed with risk level:', level);
    setRiskLevel(level);
    setShowAssessment(false);
    setShowResponse(true);
    log('crisis_assessment_complete', { level });
    if (level === 'severe' || level === 'high') {
      escalateCrisis(level);
    }

    // Update crisis event
    if (currentCrisisEvent) {
      const updatedEvent = { ...currentCrisisEvent, riskLevel: level };
      setCurrentCrisisEvent(updatedEvent);
      
      // Save crisis event to localStorage for follow-up
      const savedEvents = JSON.parse(localStorage.getItem('crisisEvents') || '[]');
      savedEvents.push(updatedEvent);
      localStorage.setItem('crisisEvents', JSON.stringify(savedEvents));
    }

    // Log the assessment completion
    toast.success('Assessment Complete', {
      description: `Risk level determined: ${level}`,
      duration: 3000,
    });
  }, [currentCrisisEvent, log]);

  const handleResponseComplete = useCallback(() => {
    setShowResponse(false);
    log('crisis_response_complete');
    
    if (currentCrisisEvent) {
      // Mark safety as confirmed
      const updatedEvent = { ...currentCrisisEvent, safetyConfirmed: true };
      setCurrentCrisisEvent(updatedEvent);
      
      // Show follow-up scheduler
      setShowFollowUp(true);
    }

    setRiskLevel(null);
    
    toast.success('Crisis intervention protocol completed', {
      description: 'You are not alone. Help is available.',
      duration: 5000,
    });
  }, [currentCrisisEvent, log]);

  const handleInterventionComplete = (toolName: string) => {
    if (currentCrisisEvent) {
      const updatedEvent = {
        ...currentCrisisEvent,
        interventionsUsed: [...currentCrisisEvent.interventionsUsed, toolName]
      };
      setCurrentCrisisEvent(updatedEvent);
    }

    log('intervention_used', { toolName });
    
    toast.success(`${toolName} completed`, {
      description: 'Great job using coping strategies!',
      duration: 3000,
    });
  };

  return {
    showAssessment,
    showResponse,
    showResources,
    showContacts,
    showFollowUp,
    riskLevel,
    currentCrisisEvent,
    voiceListening,
    hasLocationPermission,
    setShowAssessment,
    setShowResponse,
    setShowResources,
    setShowContacts,
    setShowFollowUp,
    handleCrisisActivated,
    handleAssessmentComplete,
    handleResponseComplete,
    handleInterventionComplete
  };
};

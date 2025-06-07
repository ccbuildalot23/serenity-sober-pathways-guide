
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import FloatingCrisisButton from './FloatingCrisisButton';
import CrisisAssessmentModal from './CrisisAssessmentModal';
import CrisisResponseModal from './CrisisResponseModal';
import EmergencyContactsQuickAccess from '../emergency/EmergencyContactsQuickAccess';
import ProfessionalCrisisResources from '../emergency/ProfessionalCrisisResources';
import FollowUpScheduler from './FollowUpScheduler';
import { voiceActivationService } from '@/services/voiceActivationService';

type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';

interface CrisisEvent {
  id: string;
  timestamp: Date;
  riskLevel: RiskLevel;
  interventionsUsed: string[];
  safetyConfirmed: boolean;
  location?: { lat: number; lng: number; };
}

const EnhancedCrisisSystem: React.FC = () => {
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
  }, [hasLocationPermission]);

  const handleAssessmentComplete = useCallback((level: RiskLevel) => {
    console.log('Assessment completed with risk level:', level);
    setRiskLevel(level);
    setShowAssessment(false);
    setShowResponse(true);

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
  }, [currentCrisisEvent]);

  const handleResponseComplete = useCallback(() => {
    setShowResponse(false);
    
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
  }, [currentCrisisEvent]);

  const handleEmergencyContactAdded = (contact: any) => {
    toast.success(`${contact.name} added to emergency contacts`);
  };

  const handleInterventionComplete = (toolName: string) => {
    if (currentCrisisEvent) {
      const updatedEvent = {
        ...currentCrisisEvent,
        interventionsUsed: [...currentCrisisEvent.interventionsUsed, toolName]
      };
      setCurrentCrisisEvent(updatedEvent);
    }
    
    toast.success(`${toolName} completed`, {
      description: 'Great job using coping strategies!',
      duration: 3000,
    });
  };

  // Don't render if user is not authenticated
  if (!user) return null;

  return (
    <>
      {/* Floating Crisis Button */}
      <FloatingCrisisButton onCrisisActivated={handleCrisisActivated} />
      
      {/* Crisis Assessment Modal */}
      <CrisisAssessmentModal
        isOpen={showAssessment}
        onClose={() => setShowAssessment(false)}
        onAssessmentComplete={handleAssessmentComplete}
      />

      {/* Crisis Response Modal */}
      {riskLevel && (
        <CrisisResponseModal
          isOpen={showResponse}
          onClose={handleResponseComplete}
          riskLevel={riskLevel}
        />
      )}

      {/* Voice Activation Status */}
      {voiceListening && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-blue-700">Voice activation active</span>
          </div>
        </div>
      )}

      {/* Emergency Contacts Quick Access (Hidden Modal) */}
      {showContacts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Emergency Contacts</h2>
                <button
                  onClick={() => setShowContacts(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <EmergencyContactsQuickAccess
                onContactAdded={handleEmergencyContactAdded}
              />
            </div>
          </div>
        </div>
      )}

      {/* Professional Crisis Resources (Hidden Modal) */}
      {showResources && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Professional Crisis Resources</h2>
                <button
                  onClick={() => setShowResources(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <ProfessionalCrisisResources />
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Scheduler (Hidden Modal) */}
      {showFollowUp && currentCrisisEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Follow-up Schedule</h2>
                <button
                  onClick={() => setShowFollowUp(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <FollowUpScheduler
                crisisEventId={currentCrisisEvent.id}
                onFollowUpComplete={(followUp) => {
                  console.log('Follow-up completed:', followUp);
                }}
              />
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setShowFollowUp(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-2 rounded text-xs max-w-xs">
          <div>Voice: {voiceListening ? 'Active' : 'Inactive'}</div>
          <div>Location: {hasLocationPermission ? 'Granted' : 'Denied'}</div>
          <div>Crisis ID: {currentCrisisEvent?.id || 'None'}</div>
        </div>
      )}
    </>
  );
};

export default EnhancedCrisisSystem;

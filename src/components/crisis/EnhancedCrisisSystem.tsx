
import React from 'react';
// DEDUPLICATION: Replaces legacy CrisisInterventionSystem with extended security features
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedSessionSecurity } from '@/hooks/useEnhancedSessionSecurity';
import SessionWarningDialog from '@/components/security/SessionWarningDialog';
// Floating button functionality integrated directly
import CrisisAssessmentModal from './CrisisAssessmentModal';
import CrisisResponseModal from './CrisisResponseModal';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { VoiceActivationStatus } from './VoiceActivationStatus';
import { CrisisModals } from './CrisisModals';
import { CrisisDebugInfo } from './CrisisDebugInfo';

/**
 * DEDUPLICATION: Replaces `CrisisInterventionSystem`.
 * Reason: adds session security checks and advanced crisis modals.
 */

const EnhancedCrisisSystem: React.FC = () => {
  const { user, signOut } = useAuth();
  const { sessionValid, sessionWarning, extendSession } = useEnhancedSessionSecurity();
  const {
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
  } = useCrisisSystem();

  const handleEmergencyContactAdded = (contact: any) => {
    toast.success(`${contact.name} added to emergency contacts`);
  };

  const handleSessionLogout = async () => {
    await signOut();
  };

  // Don't render if user is not authenticated or session is invalid
  if (!user || !sessionValid) return null;

  return (
    <>
      {/* Session Warning Dialog */}
      <SessionWarningDialog
        open={sessionWarning}
        onExtendSession={extendSession}
        onSignOut={handleSessionLogout}
      />

      {/* Integrated Floating Crisis Button */}
      {user && (
        <div className="fixed bottom-20 right-5 z-[9999]">
          <button
            onClick={handleCrisisActivated}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-xs shadow-2xl border-2 border-red-500 transition-all duration-200 animate-pulse focus:outline-none focus:ring-4 focus:ring-red-300 active:scale-95"
            aria-label="Emergency Crisis Support - Tap for immediate help"
            role="button"
            tabIndex={0}
          >
            <span className="flex flex-col items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-[8px] mt-0.5 font-semibold">HELP</span>
            </span>
          </button>
        </div>
      )}
      
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
      <VoiceActivationStatus voiceListening={voiceListening} />

      {/* Crisis Modals */}
      <CrisisModals
        showContacts={showContacts}
        showResources={showResources}
        showFollowUp={showFollowUp}
        currentCrisisEvent={currentCrisisEvent}
        onContactsClose={() => setShowContacts(false)}
        onResourcesClose={() => setShowResources(false)}
        onFollowUpClose={() => setShowFollowUp(false)}
        onContactAdded={handleEmergencyContactAdded}
      />

      {/* Debug Info */}
      <CrisisDebugInfo
        voiceListening={voiceListening}
        hasLocationPermission={hasLocationPermission}
        currentCrisisEvent={currentCrisisEvent}
      />
    </>
  );
};

export default EnhancedCrisisSystem;

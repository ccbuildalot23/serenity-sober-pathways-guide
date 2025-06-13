
import React from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedSessionSecurity } from '@/hooks/useEnhancedSessionSecurity';
import { SessionWarningDialog } from '@/components/security/SessionWarningDialog';
import FloatingCrisisButton from './FloatingCrisisButton';
import CrisisAssessmentModal from './CrisisAssessmentModal';
import CrisisResponseModal from './CrisisResponseModal';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { VoiceActivationStatus } from './VoiceActivationStatus';
import { CrisisModals } from './CrisisModals';
import { CrisisDebugInfo } from './CrisisDebugInfo';

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

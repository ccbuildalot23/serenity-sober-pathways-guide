
import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import FloatingCrisisButton from './FloatingCrisisButton';
import CrisisAssessmentModal from './CrisisAssessmentModal';
import CrisisResponseModal from './CrisisResponseModal';

type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';

const CrisisInterventionSystem: React.FC = () => {
  const [showAssessment, setShowAssessment] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const { user } = useAuth();

  const handleCrisisActivated = useCallback(() => {
    console.log('Crisis button activated - starting assessment');
    setShowAssessment(true);
    
    // Log crisis event activation
    toast.info('Crisis Support Activated', {
      description: 'Starting safety assessment...',
      duration: 2000,
    });
  }, []);

  const handleAssessmentComplete = useCallback((level: RiskLevel) => {
    console.log('Assessment completed with risk level:', level);
    setRiskLevel(level);
    setShowAssessment(false);
    setShowResponse(true);

    // Log the assessment completion
    toast.success('Assessment Complete', {
      description: `Risk level determined: ${level}`,
      duration: 3000,
    });
  }, []);

  const handleResponseComplete = useCallback(() => {
    setShowResponse(false);
    setRiskLevel(null);
    
    toast.success('Crisis intervention protocol completed', {
      description: 'You are not alone. Help is available.',
      duration: 5000,
    });
  }, []);

  // Don't render if user is not authenticated
  if (!user) return null;

  return (
    <>
      <FloatingCrisisButton onCrisisActivated={handleCrisisActivated} />
      
      <CrisisAssessmentModal
        isOpen={showAssessment}
        onClose={() => setShowAssessment(false)}
        onAssessmentComplete={handleAssessmentComplete}
      />

      {riskLevel && (
        <CrisisResponseModal
          isOpen={showResponse}
          onClose={handleResponseComplete}
          riskLevel={riskLevel}
        />
      )}
    </>
  );
};

export default CrisisInterventionSystem;

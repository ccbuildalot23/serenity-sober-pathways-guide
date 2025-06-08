
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { voiceActivationService } from '@/services/voiceActivationService';
import { useNavigate } from 'react-router-dom';

interface PatternData {
  interventionStats: Record<string, { count: number; totalEffectiveness: number }>;
  crisisPrecursors: Array<{ mood: number; timestamp: Date; notes: string }>;
  riskScore: number;
}

interface PredictiveCrisisAlertProps {
  patterns: PatternData;
  onCrisisDetected: () => void;
  onShowInterventions: (stats: Record<string, any>) => void;
}

export const PredictiveCrisisAlert: React.FC<PredictiveCrisisAlertProps> = ({
  patterns,
  onCrisisDetected,
  onShowInterventions
}) => {
  const navigate = useNavigate();

  const handleVoiceActivation = () => {
    voiceActivationService.startListening({
      onCrisisDetected: () => {
        onCrisisDetected();
        navigate('/crisis-toolkit');
      },
      onError: (error) => {
        console.error('Voice activation failed:', error);
      }
    });
  };

  if (patterns.riskScore > 0.7) {
    return (
      <Alert className="mb-4 border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <span className="font-medium">High risk detected:</span> Based on your patterns, 
          you may be approaching a difficult time.
          <div className="mt-2 flex gap-2">
            <Button 
              size="sm" 
              variant="destructive"
              onClick={handleVoiceActivation}
            >
              Enable Voice Activation
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onShowInterventions(patterns.interventionStats)}
            >
              View What Helps
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
};

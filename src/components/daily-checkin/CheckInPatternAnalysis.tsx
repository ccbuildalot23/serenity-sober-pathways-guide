
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PredictiveCrisisAlert } from '@/components/crisis/PredictiveCrisisAlert';
import { UltraSecureCrisisDataService } from '@/services/ultraSecureCrisisDataService';
import { secureServerLogEvent } from '@/services/secureServerAuditLogService';
import { analyzePatterns } from '@/utils/patternAnalysis';

interface CheckInPatternAnalysisProps {
  onCrisisDetected: () => void;
  onShowInterventions: (stats: Record<string, any>) => void;
}

export const CheckInPatternAnalysis: React.FC<CheckInPatternAnalysisProps> = ({
  onCrisisDetected,
  onShowInterventions
}) => {
  const { user } = useAuth();

  // Pattern analysis
  const { data: crisisPatterns } = useQuery({
    queryKey: ['crisis-patterns', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const resolutions = await UltraSecureCrisisDataService.loadCrisisResolutions(user.id);
      const checkIns = await UltraSecureCrisisDataService.loadCheckInResponses(user.id);
      
      return analyzePatterns(resolutions, checkIns);
    },
    enabled: !!user?.id
  });

  // Log pattern detection for audit
  useEffect(() => {
    if (crisisPatterns && crisisPatterns.riskScore > 0.5) {
      secureServerLogEvent({
        action: 'PATTERN_DETECTION',
        details: {
          risk_level: crisisPatterns.riskScore,
          vulnerable_hours: crisisPatterns.vulnerableHours,
          precursor_count: crisisPatterns.crisisPrecursors.length,
          timestamp: new Date().toISOString()
        },
        userId: user?.id
      });
    }
  }, [crisisPatterns, user?.id]);

  if (!crisisPatterns) return null;

  return (
    <PredictiveCrisisAlert
      patterns={crisisPatterns}
      onCrisisDetected={onCrisisDetected}
      onShowInterventions={onShowInterventions}
    />
  );
};


import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { PredictiveCrisisAlert } from '@/components/crisis/PredictiveCrisisAlert';
import { UltraSecureCrisisDataService } from '@/services/ultraSecureCrisisDataService';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
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
    _queryFn: async () => {
      if (!user?.id) return null;
      
      const _resolutions = await UltraSecureCrisisDataService.loadCrisisResolutions(user.id);
      const _checkIns = await UltraSecureCrisisDataService.loadCheckInResponses(user.id);
      
      return analyzePatterns(_resolutions, _checkIns);
    },
    enabled: !!user?.id
  });

  // Log pattern detection for audit
  useEffect(() => {
    if (crisisPatterns && crisisPatterns.riskScore > 0.5) {
      EnhancedSecurityAuditService.logSecurityEvent({
        action: 'PATTERN_DETECTION',
        _details: {
          risk_level: crisisPatterns.riskScore,
          _vulnerable_hours: crisisPatterns.vulnerableHours,
          _precursor_count: crisisPatterns.crisisPrecursors.length,
          _timestamp: new Date().toISOString()
        },
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

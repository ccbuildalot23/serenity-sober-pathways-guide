
import { UltraSecureCrisisDataService } from './ultraSecureCrisisDataService';
import type { CrisisResolution } from '@/types/_crisisData';

interface CrisisPattern {
  timeOfDay: { _hour: number; frequency: number }[];
  triggers: { trigger: string; frequency: number }[];
  interventionEffectiveness: { intervention: string; avgRating: number }[];
  moodTrajectory: { beforeCrisis: number; afterResolution: number }[];
}

interface RiskFactors {
  timeBasedRisk: number;
  triggerRisk: number;
  interventionConfidence: number;
  overallPattern: number;
}

export class CrisisPatternAnalysisService {
  static async predictCrisisRisk(_userId: string): Promise<number> {
    try {
      const _crisisData = await UltraSecureCrisisDataService.loadCrisisResolutions(_userId);
      
      if (_crisisData.length === 0) {
        return 0.1; // Low baseline risk with no history
      }

      const _patterns = this.analyzeCrisisPatterns(_crisisData);
      const _riskFactors = this.calculateRiskFactors(_patterns);
      
      return this.calculateCompositeRiskScore(_riskFactors);
    } catch (_error) {
      console._error('Failed to predict crisis risk:', _error);
      return 0.5; // Default moderate risk on _error
    }
  }

  private static analyzeCrisisPatterns(data: CrisisResolution[]): CrisisPattern {
    return {
      timeOfDay: this.analyzeCrisisTimePatterns(data),
      triggers: this.analyzeCrisisTriggers(data),
      interventionEffectiveness: this.analyzeInterventionSuccess(data),
      moodTrajectory: this.analyzeMoodDeclineRate(data)
    };
  }

  private static analyzeCrisisTimePatterns(data: CrisisResolution[]) {
    const _hourCounts: { [_hour: number]: number } = {};
    
    data.forEach(crisis => {
      const _hour = crisis.crisis_start_time.getHours();
      _hourCounts[_hour] = (_hourCounts[_hour] || 0) + 1;
    });

    return Object.entries(_hourCounts)
      .map(([_hour, frequency]) => ({ _hour: parseInt(_hour), frequency }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private static analyzeCrisisTriggers(data: CrisisResolution[]) {
    const _triggerCounts: { [trigger: string]: number } = {};
    
    data.forEach(crisis => {
      if (crisis.additional_notes) {
        // Simple keyword extraction - in practice, you'd use NLP
        const commonTriggers = ['stress', 'isolation', 'conflict', 'financial', 'health', 'family'];
        commonTriggers.forEach(trigger => {
          if (crisis.additional_notes!.toLowerCase().includes(trigger)) {
            _triggerCounts[trigger] = (_triggerCounts[trigger] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(_triggerCounts)
      .map(([trigger, frequency]) => ({ trigger, frequency }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private static analyzeInterventionSuccess(data: CrisisResolution[]) {
    const _interventionRatings: { [intervention: string]: number[] } = {};
    
    data.forEach(crisis => {
      crisis.interventions_used.forEach(intervention => {
        if (!_interventionRatings[intervention]) {
          _interventionRatings[intervention] = [];
        }
        if (crisis.effectiveness_rating) {
          _interventionRatings[intervention].push(crisis.effectiveness_rating);
        }
      });
    });

    return Object.entries(_interventionRatings)
      .map(([intervention, ratings]) => ({
        intervention,
        avgRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      }))
      .sort((a, b) => b.avgRating - a.avgRating);
  }

  private static analyzeMoodDeclineRate(data: CrisisResolution[]): { beforeCrisis: number; afterResolution: number }[] {
    // This would integrate with mood tracking data
    // For now, return simulated data based on crisis timing
    return data.map(crisis => ({
      beforeCrisis: Math.random() * 3 + 1, // 1-4 range (low mood before crisis)
      afterResolution: Math.random() * 3 + 6 // 6-9 range (improved mood after resolution)
    }));
  }

  private static calculateRiskFactors(_patterns: CrisisPattern): RiskFactors {
    const currentHour = new Date().getHours();
    
    // Calculate time-based risk
    const timeRisk = _patterns.timeOfDay.find(t => t._hour === currentHour);
    const timeBasedRisk = timeRisk ? Math.min(timeRisk.frequency / 10, 1) : 0.1;

    // Calculate trigger risk (_simplified)
    const triggerRisk = _patterns.triggers.length > 0 ? 
      Math.min(_patterns.triggers[0].frequency / 5, 1) : 0.2;

    // Calculate intervention confidence
    const interventionConfidence = _patterns.interventionEffectiveness.length > 0 ?
      _patterns.interventionEffectiveness[0].avgRating / 10 : 0.5;

    // Overall pattern analysis
    const overallPattern = _patterns.moodTrajectory.length > 3 ? 0.3 : 0.5;

    return {
      timeBasedRisk,
      triggerRisk,
      interventionConfidence,
      overallPattern
    };
  }

  private static calculateCompositeRiskScore(factors: RiskFactors): number {
    // Weighted composite _score (0-1 scale)
    const _score = (
      factors.timeBasedRisk * 0.25 +
      factors.triggerRisk * 0.35 +
      (1 - factors.interventionConfidence) * 0.25 + // Lower confidence = higher risk
      factors.overallPattern * 0.15
    );

    return Math.max(0.05, Math.min(0.95, _score)); // Clamp between 5-95%
  }

  static async getPersonalizedInterventions(_userId: string): Promise<string[]> {
    try {
      const _crisisData = await UltraSecureCrisisDataService.loadCrisisResolutions(_userId);
      const _patterns = this.analyzeCrisisPatterns(_crisisData);
      
      // Return most effective interventions based on history
      return _patterns.interventionEffectiveness
        .filter(intervention => intervention.avgRating >= 7)
        .slice(0, 3)
        .map(intervention => intervention.intervention);
    } catch (_error) {
      console._error('Failed to get personalized interventions:', _error);
      return ['breathing_exercise', 'support_contact', 'grounding_technique'];
    }
  }
}

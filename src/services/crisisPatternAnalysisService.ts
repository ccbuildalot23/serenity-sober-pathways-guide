
import { UltraSecureCrisisDataService } from './ultraSecureCrisisDataService';
import type { CrisisResolution } from '@/types/crisisData';

interface CrisisPattern {
  timeOfDay: { hour: number; frequency: number }[];
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
  static async predictCrisisRisk(userId: string): Promise<number> {
    try {
      const crisisData = await UltraSecureCrisisDataService.loadCrisisResolutions(userId);
      
      if (crisisData.length === 0) {
        return 0.1; // Low baseline risk with no history
      }

      const patterns = this.analyzeCrisisPatterns(crisisData);
      const riskFactors = this.calculateRiskFactors(patterns);
      
      return this.calculateCompositeRiskScore(riskFactors);
    } catch (error) {
      console.error('Failed to predict crisis risk:', error);
      return 0.5; // Default moderate risk on error
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
    const hourCounts: { [hour: number]: number } = {};
    
    data.forEach(crisis => {
      const hour = crisis.crisis_start_time.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, frequency]) => ({ hour: parseInt(hour), frequency }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private static analyzeCrisisTriggers(data: CrisisResolution[]) {
    const triggerCounts: { [trigger: string]: number } = {};
    
    data.forEach(crisis => {
      if (crisis.additional_notes) {
        // Simple keyword extraction - in practice, you'd use NLP
        const commonTriggers = ['stress', 'isolation', 'conflict', 'financial', 'health', 'family'];
        commonTriggers.forEach(trigger => {
          if (crisis.additional_notes!.toLowerCase().includes(trigger)) {
            triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(triggerCounts)
      .map(([trigger, frequency]) => ({ trigger, frequency }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private static analyzeInterventionSuccess(data: CrisisResolution[]) {
    const interventionRatings: { [intervention: string]: number[] } = {};
    
    data.forEach(crisis => {
      crisis.interventions_used.forEach(intervention => {
        if (!interventionRatings[intervention]) {
          interventionRatings[intervention] = [];
        }
        if (crisis.effectiveness_rating) {
          interventionRatings[intervention].push(crisis.effectiveness_rating);
        }
      });
    });

    return Object.entries(interventionRatings)
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

  private static calculateRiskFactors(patterns: CrisisPattern): RiskFactors {
    const currentHour = new Date().getHours();
    
    // Calculate time-based risk
    const timeRisk = patterns.timeOfDay.find(t => t.hour === currentHour);
    const timeBasedRisk = timeRisk ? Math.min(timeRisk.frequency / 10, 1) : 0.1;

    // Calculate trigger risk (simplified)
    const triggerRisk = patterns.triggers.length > 0 ? 
      Math.min(patterns.triggers[0].frequency / 5, 1) : 0.2;

    // Calculate intervention confidence
    const interventionConfidence = patterns.interventionEffectiveness.length > 0 ?
      patterns.interventionEffectiveness[0].avgRating / 10 : 0.5;

    // Overall pattern analysis
    const overallPattern = patterns.moodTrajectory.length > 3 ? 0.3 : 0.5;

    return {
      timeBasedRisk,
      triggerRisk,
      interventionConfidence,
      overallPattern
    };
  }

  private static calculateCompositeRiskScore(factors: RiskFactors): number {
    // Weighted composite score (0-1 scale)
    const score = (
      factors.timeBasedRisk * 0.25 +
      factors.triggerRisk * 0.35 +
      (1 - factors.interventionConfidence) * 0.25 + // Lower confidence = higher risk
      factors.overallPattern * 0.15
    );

    return Math.max(0.05, Math.min(0.95, score)); // Clamp between 5-95%
  }

  static async getPersonalizedInterventions(userId: string): Promise<string[]> {
    try {
      const crisisData = await UltraSecureCrisisDataService.loadCrisisResolutions(userId);
      const patterns = this.analyzeCrisisPatterns(crisisData);
      
      // Return most effective interventions based on history
      return patterns.interventionEffectiveness
        .filter(intervention => intervention.avgRating >= 7)
        .slice(0, 3)
        .map(intervention => intervention.intervention);
    } catch (error) {
      console.error('Failed to get personalized interventions:', error);
      return ['breathing_exercise', 'support_contact', 'grounding_technique'];
    }
  }
}

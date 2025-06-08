
import { supabase } from '@/integrations/supabase/client';
import { CrisisPlanService } from './crisisPlanService';
import type { CrisisPlan } from '@/types/crisisPlan';

export class CrisisPlanManager {
  static async updateCrisisPlanReview(planId: string, userId: string): Promise<void> {
    try {
      const nextReviewDate = new Date();
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 3); // Review every 3 months

      const { error } = await supabase
        .from('crisis_plans')
        .update({
          last_reviewed: new Date().toISOString(),
          next_review_date: nextReviewDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', planId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update crisis plan review:', error);
      throw new Error('Failed to update crisis plan review');
    }
  }

  static async createDefaultCrisisPlan(userId: string): Promise<CrisisPlan> {
    const defaultPlan: CrisisPlan = {
      userId,
      personalTriggers: [],
      warningSigns: [
        "Increased isolation",
        "Sleep disturbances", 
        "Loss of appetite",
        "Difficulty concentrating",
        "Increased substance use thoughts"
      ],
      copingStrategies: [
        "Deep breathing exercises",
        "Call a support person",
        "Go to a safe space",
        "Use grounding techniques",
        "Practice mindfulness"
      ],
      supportContacts: [],
      safeEnvironment: {
        safeSpaces: ["Living room", "Friend's house"],
        itemsToRemove: [],
        environmentalChanges: []
      },
      professionalContacts: {
        emergencyServices: { name: "Emergency Services", phone: "911" }
      },
      medications: {
        current: [],
        asNeeded: [],
        restrictions: []
      },
      personalMotivations: [
        "My family needs me",
        "I have goals to achieve",
        "Recovery is possible",
        "I deserve to live"
      ],
      recoveryGoals: [],
      createdBy: 'self',
      lastReviewed: new Date(),
      nextReviewDate: (() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        return date;
      })()
    };

    return CrisisPlanService.saveCrisisPlan(defaultPlan);
  }
}

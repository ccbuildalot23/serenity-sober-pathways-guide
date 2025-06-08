
import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';

export interface CrisisPlan {
  id?: string;
  userId: string;
  personalTriggers: string[];
  warningSigns: string[];
  copingStrategies: string[];
  supportContacts: {
    name: string;
    relationship: string;
    phone: string;
    priority: number;
  }[];
  safeEnvironment: {
    safeSpaces: string[];
    itemsToRemove: string[];
    environmentalChanges: string[];
  };
  professionalContacts: {
    therapist?: { name: string; phone: string; };
    psychiatrist?: { name: string; phone: string; };
    emergencyServices: { name: string; phone: string; };
  };
  medications: {
    current: string[];
    asNeeded: string[];
    restrictions: string[];
  };
  personalMotivations: string[];
  recoveryGoals: string[];
  createdBy: 'self' | 'therapist_review' | 'collaborative';
  lastReviewed: Date;
  nextReviewDate: Date;
}

interface CrisisPlanRow {
  id: string;
  user_id: string;
  plan_encrypted: string;
  created_by: string;
  last_reviewed: string;
  next_review_date: string;
  created_at: string;
  updated_at: string;
}

export class EncryptedCrisisPlanService {
  static async saveCrisisPlan(plan: CrisisPlan): Promise<CrisisPlan> {
    try {
      // Encrypt sensitive data
      const sensitiveData = {
        personalTriggers: plan.personalTriggers,
        warningSigns: plan.warningSigns,
        copingStrategies: plan.copingStrategies,
        supportContacts: plan.supportContacts,
        safeEnvironment: plan.safeEnvironment,
        professionalContacts: plan.professionalContacts,
        medications: plan.medications,
        personalMotivations: plan.personalMotivations,
        recoveryGoals: plan.recoveryGoals
      };

      const encryptedPlan = await serverSideEncryption.encrypt(JSON.stringify(sensitiveData));

      const { data, error } = await supabase
        .from('crisis_plans')
        .upsert({
          id: plan.id || undefined,
          user_id: plan.userId,
          plan_encrypted: encryptedPlan,
          created_by: plan.createdBy,
          last_reviewed: plan.lastReviewed.toISOString(),
          next_review_date: plan.nextReviewDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...plan,
        id: (data as CrisisPlanRow).id
      };
    } catch (error) {
      console.error('Failed to save crisis plan:', error);
      throw new Error('Failed to save crisis plan');
    }
  }

  static async loadCrisisPlan(userId: string): Promise<CrisisPlan | null> {
    try {
      const { data, error } = await supabase
        .from('crisis_plans')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      const planRow = data as CrisisPlanRow;

      // Decrypt the plan
      const decryptedData = await serverSideEncryption.decrypt(planRow.plan_encrypted);
      const planData = JSON.parse(decryptedData);

      return {
        id: planRow.id,
        userId: planRow.user_id,
        ...planData,
        createdBy: planRow.created_by as 'self' | 'therapist_review' | 'collaborative',
        lastReviewed: new Date(planRow.last_reviewed),
        nextReviewDate: new Date(planRow.next_review_date)
      };
    } catch (error) {
      console.error('Failed to load crisis plan:', error);
      throw new Error('Failed to load crisis plan');
    }
  }

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

    return this.saveCrisisPlan(defaultPlan);
  }

  static async deleteCrisisPlan(planId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('crisis_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete crisis plan:', error);
      throw new Error('Failed to delete crisis plan');
    }
  }
}

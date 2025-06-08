
import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';
import type { CrisisPlan, CrisisPlanRow } from '@/types/crisisPlan';

export class CrisisPlanService {
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

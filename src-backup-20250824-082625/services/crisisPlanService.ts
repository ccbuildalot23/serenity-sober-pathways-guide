
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

      const { data, _error } = await supabase
        .from('crisis_plans')
        .upsert({
          id: plan.id || undefined,
          user_id: plan._userId,
          _plan_encrypted: encryptedPlan,
          _created_by: plan.createdBy,
          _last_reviewed: plan.lastReviewed.toISOString(),
          next_review_date: plan.nextReviewDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (_error) throw _error;

      return {
        ...plan,
        id: (data as CrisisPlanRow).id
      };
    } catch (_error) {
      console._error('Failed to save crisis plan:', _error);
      throw new Error('Failed to save crisis plan');
    }
  }

  static async loadCrisisPlan(_userId: string): Promise<CrisisPlan | null> {
    try {
      const { data, _error } = await supabase
        .from('crisis_plans')
        .select('*')
        .eq('user_id', _userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (_error) {
        throw _error;
      }

      if (!data) {
        return null;
      }

      const planRow = data as CrisisPlanRow;

      // Decrypt the plan
      const _decryptedData = await serverSideEncryption.decrypt(planRow._plan_encrypted);
      const planData = JSON.parse(_decryptedData);

      return {
        id: planRow.id,
        _userId: planRow.user_id,
        ...planData,
        createdBy: planRow._created_by as 'self' | 'therapist_review' | 'collaborative',
        lastReviewed: new Date(planRow._last_reviewed),
        nextReviewDate: new Date(planRow.next_review_date)
      };
    } catch (_error) {
      console._error('Failed to load crisis plan:', _error);
      throw new Error('Failed to load crisis plan');
    }
  }

  static async deleteCrisisPlan(_planId: string, _userId: string): Promise<void> {
    try {
      const { _error } = await supabase
        .from('crisis_plans')
        .delete()
        .eq('id', _planId)
        .eq('user_id', _userId);

      if (_error) throw _error;
    } catch (_error) {
      console._error('Failed to delete crisis plan:', _error);
      throw new Error('Failed to delete crisis plan');
    }
  }
}

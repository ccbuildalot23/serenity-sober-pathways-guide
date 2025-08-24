
import { CrisisPlanService } from './crisisPlanService';
import { CrisisPlanManager } from './crisisPlanManager';
import type { CrisisPlan } from '@/types/crisisPlan';

// Re-export for backward compatibility
export type { CrisisPlan } from '@/types/crisisPlan';

export class EncryptedCrisisPlanService {
  static async saveCrisisPlan(plan: CrisisPlan): Promise<CrisisPlan> {
    return CrisisPlanService.saveCrisisPlan(plan);
  }

  static async loadCrisisPlan(userId: string): Promise<CrisisPlan | null> {
    return CrisisPlanService.loadCrisisPlan(userId);
  }

  static async updateCrisisPlanReview(planId: string, userId: string): Promise<void> {
    return CrisisPlanManager.updateCrisisPlanReview(planId, userId);
  }

  static async createDefaultCrisisPlan(userId: string): Promise<CrisisPlan> {
    return CrisisPlanManager.createDefaultCrisisPlan(userId);
  }

  static async deleteCrisisPlan(planId: string, userId: string): Promise<void> {
    return CrisisPlanService.deleteCrisisPlan(planId, userId);
  }
}

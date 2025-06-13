
import { CheckinResponses } from '@/types/dailyCheckIn';
import { toast } from 'sonner';

export const checkinValidation = {
  validateSectionCompletion: (section: string, responses: CheckinResponses): boolean => {
    switch (section) {
      case 'mood':
        return responses.mood !== null;
      
      case 'wellness':
        return responses.energy !== null && 
               responses.hope !== null && 
               responses.sobriety_confidence !== null && 
               responses.recovery_importance !== null && 
               responses.recovery_strength !== null;
      
      case 'assessments':
        return responses.phq2_q1 !== null && 
               responses.phq2_q2 !== null && 
               responses.gad2_q1 !== null && 
               responses.gad2_q2 !== null;
      
      default:
        return false;
    }
  },

  canComplete: (completedSections: Set<string>): boolean => {
    return completedSections.size === 3 && 
           completedSections.has('mood') && 
           completedSections.has('wellness') && 
           completedSections.has('assessments');
  },

  validateCompletion: (completedSections: Set<string>): boolean => {
    const missing = [];
    if (!completedSections.has('mood')) missing.push('Mood');
    if (!completedSections.has('wellness')) missing.push('Wellness');
    if (!completedSections.has('assessments')) missing.push('Assessments');
    
    if (missing.length > 0) {
      toast.error(`Please complete the following sections: ${missing.join(', ')}`, {
        description: "All sections must be filled out before submitting your check-in.",
        duration: 5000
      });
      return false;
    }
    return true;
  }
};

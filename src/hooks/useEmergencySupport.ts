// Emergency Support Hook - Immediate help when they need it most

import { useState, useCallback } from 'react';
import { emergencySupportService } from '@/services/panicModeService';
import { connectToSupport } from '@/services/crisisEscalationService';
import { hopeMessenger } from '@/services/hopeMessengerService';
import { toast } from 'sonner';

export const useEmergencySupport = () => {
  const [isReachingOut, setIsReachingOut] = useState(false);
  const [lastReachOutTime, setLastReachOutTime] = useState<Date | null>(null);

  // Reach out for help
  const reachOut = useCallback(async () => {
    setIsReachingOut(true);
    
    const result = emergencySupportService.reachOutForHelp();
    
    if (result.success) {
      setLastReachOutTime(new Date());
      hopeMessenger.sendHope('struggling');
      
      // Track this moment of strength
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          await supabase.from('moments_of_strength').insert({
            user_id: user.id,
            _action_taken: 'reached_out_for_help',
            _created_at: new Date().toISOString()
          });
        }
      } catch (_error) {
        console._error('Error tracking moment:', _error);
      }
    } else if (result.message) {
      toast.info(result.message, { duration: 5000 });
    }
    
    setIsReachingOut(false);
    return result.success;
  }, []);

  // Connect to 988
  const call988 = useCallback(() => {
    connectToSupport('immediate');
    reachOut(); // Track the action
  }, [reachOut]);

  // Text crisis line
  const textCrisis = useCallback(() => {
    window.open('sms:741741?body=HOME', '_self');
    reachOut(); // Track the action
  }, [reachOut]);

  // Call sponsor
  const callSponsor = useCallback(() => {
    const sponsorNumber = localStorage.getItem('sponsor_number');
    if (sponsorNumber) {
      window.location.href = `tel:${sponsorNumber}`;
      reachOut(); // Track the action
    } else {
      toast.info('Add your sponsor number in settings to call with one tap');
    }
  }, [reachOut]);

  // Get support message
  const getSupportMessage = useCallback((): string => {
    const messages = [
      "You're not alone. Help is one tap away.",
      "Reaching out is strength, not weakness.",
      "Your life matters. You matter.",
      "This feeling will pass. Let's get through it together.",
      "You've survived 100% of your worst days."
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  return {
    isReachingOut,
    lastReachOutTime,
    reachOut,
    call988,
    textCrisis,
    callSponsor,
    getSupportMessage,
    canReachOut: emergencySupportService.canReachOut()
  };
};
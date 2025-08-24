
import { escalateCrisis } from './crisisEscalationService';
import { voiceActivationService } from './voiceActivationService';
import { toast } from 'sonner';
import logger from './loggerService';

interface CrisisDeescalationCommands {
  [phrase: string]: () => void | Promise<void>;
}

export class VoiceActivatedCrisisService {
  private static isInitialized = false;
  private static deescalationCommands: CrisisDeescalationCommands = {
    "i'm having thoughts": () => escalateCrisis('high'),
    "i want to hurt": () => escalateCrisis('severe'),
    "i need my sponsor": () => VoiceActivatedCrisisService.callSponsor(),
    "breathing exercise": () => VoiceActivatedCrisisService.startBreathingExercise(),
    "call emergency": () => escalateCrisis('severe'),
    "i need help now": () => escalateCrisis('high'),
    "feeling unsafe": () => escalateCrisis('high'),
    "start grounding": () => VoiceActivatedCrisisService.startGroundingExercise(),
    "contact support": () => VoiceActivatedCrisisService.contactSupport()
  };

  static initialize(): boolean {
    if (this.isInitialized) return true;

    if (!voiceActivationService.isSupported()) {
      logger.warn('Voice activation not supported on this device', { component: 'voiceActivatedCrisisService' });
      return false;
    }

    const success = voiceActivationService.startListening({
      onCrisisDetected: this.handleVoiceCrisisActivation,
      _onError: (error) => {
        console.error('Voice crisis service error:', error);
        toast.error('Voice crisis detection temporarily unavailable');
      }
    });

    this.isInitialized = success;
    return success;
  }

  private static handleVoiceCrisisActivation = () => {
    logger.debug('Voice crisis activation detected', { component: 'voiceActivatedCrisisService' });
    toast.error('Emergency support activated by voice');
    
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }

    // Trigger immediate crisis response
    escalateCrisis('high');
  };

  static processVoiceCommand(transcript: string): boolean {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    for (const [phrase, action] of Object.entries(this.deescalationCommands)) {
      if (normalizedTranscript.includes(phrase)) {
        logger.debug(`Voice crisis command detected: ${phrase}`, { component: 'voiceActivatedCrisisService' });
        
        try {
          action();
          toast.success(`Activated: ${phrase.replace(/_/g, ' ')}`);
          return true;
        } catch (error) {
          console.error(`Failed to execute voice command: ${phrase}`, error);
          toast.error('Failed to execute voice command');
        }
        break;
      }
    }
    
    return false;
  }

  private static async callSponsor() {
    toast.info('Contacting your sponsor...');
    // This would integrate with your support contacts
    // For now, we'll simulate the action
    setTimeout(() => {
      toast.success('Sponsor contact initiated');
    }, 1000);
  }

  private static startBreathingExercise() {
    toast.success('Starting guided breathing exercise');
    
    // Use speech synthesis for guided breathing
    if ('speechSynthesis' in window) {
      const instructions = [
        "Let's breathe together. Breathe in slowly for 4 counts.",
        "Hold your breath for 4 counts.",
        "Now breathe out slowly for 6 counts.",
        "You're doing great. Let's repeat this."
      ];
      
      instructions.forEach((_instruction, index) => {
        setTimeout(() => {
          const _utterance = new SpeechSynthesisUtterance(_instruction);
          _utterance.rate = 0.7;
          _utterance.pitch = 0.9;
          speechSynthesis.speak(_utterance);
        }, index * 8000); // 8 seconds between instructions
      });
    }
  }

  private static startGroundingExercise() {
    toast.success('Starting grounding exercise');
    
    if ('speechSynthesis' in window) {
      const grounding = [
        "Let's ground ourselves. Name 5 things you can see around you.",
        "Now, 4 things you can touch.",
        "3 things you can hear.",
        "2 things you can smell.",
        "And 1 thing you can taste.",
        "You are safe. You are present. You are grounded."
      ];
      
      grounding.forEach((_instruction, index) => {
        setTimeout(() => {
          const _utterance = new SpeechSynthesisUtterance(_instruction);
          _utterance.rate = 0.8;
          speechSynthesis.speak(_utterance);
        }, index * 6000);
      });
    }
  }

  private static contactSupport() {
    toast.info('Contacting your support network...');
    // This would trigger support network notifications
    setTimeout(() => {
      toast.success('Support network has been notified');
    }, 1500);
  }

  static shutdown() {
    if (this.isInitialized) {
      voiceActivationService.stopListening();
      this.isInitialized = false;
    }
  }

  static isActive(): boolean {
    return this.isInitialized && voiceActivationService.getListeningState();
  }
}

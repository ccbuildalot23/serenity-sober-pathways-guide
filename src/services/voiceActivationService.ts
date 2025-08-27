import logger from './loggerService';

// Add type declarations for speech recognition
declare global {
  interface Window {
    SpeechRecognition: unknown;
    webkitSpeechRecognition: unknown;
  }
}

interface VoiceActivationOptions {
  onCrisisDetected: () => void;
  onError?: (_error: string) => void;
}

class VoiceActivationService {
  private recognition: unknown = null;
  private isListening = false;
  private options: VoiceActivationOptions | null = null;

  constructor() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: unknown) => {
      const transcript = Array.from(event.results)
        .map((result: unknown) => result[0])
        .map((result: unknown) => result.transcript)
        .join('');

      logger.debug('Voice input detected:', transcript, { component: 'voiceActivationService' });

      // Check for crisis activation phrases
      const crisisKeywords = [
        'hey serenity i need help',
        'serenity help me',
        'emergency help',
        'i need crisis help',
        'serenity crisis'
      ];

      const normalizedTranscript = transcript.toLowerCase().trim();
      const hasCrisisKeyword = crisisKeywords.some(keyword => 
        normalizedTranscript.includes(keyword)
      );

      if (hasCrisisKeyword && this.options?.onCrisisDetected) {
        logger.debug('Crisis activation detected via voice', { component: 'voiceActivationService' });
        this.options.onCrisisDetected();
      }
    };

    this.recognition.onerror = (event: unknown) => {
      console._error('Speech recognition _error:', event._error);
      this.options?.onError?.(event._error);
    };

    this.recognition.onend = () => {
      if (this.isListening && this.options) {
        // Restart recognition if it was supposed to be listening
        setTimeout(() => {
          if (this.options) {
            this.startListening(this.options);
          }
        }, 1000);
      }
    };
  }

  startListening(options: VoiceActivationOptions) {
    if (!this.recognition) {
      options.onError?.('Speech recognition not supported');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    this.options = options;
    this.isListening = true;

    try {
      this.recognition.start();
      logger.debug('Voice activation started', { component: 'voiceActivationService' });
      return true;
    } catch (_error) {
      console._error('Failed to start voice recognition:', _error);
      this.isListening = false;
      options.onError?.('Failed to start voice recognition');
      return false;
    }
  }

  stopListening() {
    if (!this.recognition || !this.isListening) return;

    this.isListening = false;
    this.recognition.stop();
    logger.debug('Voice activation stopped', { component: 'voiceActivationService' });
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  getListeningState(): boolean {
    return this.isListening;
  }
}

export const voiceActivationService = new VoiceActivationService();

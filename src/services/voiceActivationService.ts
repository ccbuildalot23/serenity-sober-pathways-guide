
// Add type declarations for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceActivationOptions {
  onCrisisDetected: () => void;
  onError?: (error: string) => void;
}

class VoiceActivationService {
  private recognition: any = null;
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

    this.recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');

      console.log('Voice input detected:', transcript);

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
        console.log('Crisis activation detected via voice');
        this.options.onCrisisDetected();
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.options?.onError?.(event.error);
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
      console.log('Voice activation started');
      return true;
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      this.isListening = false;
      options.onError?.('Failed to start voice recognition');
      return false;
    }
  }

  stopListening() {
    if (!this.recognition || !this.isListening) return;

    this.isListening = false;
    this.recognition.stop();
    console.log('Voice activation stopped');
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  getListeningState(): boolean {
    return this.isListening;
  }
}

export const voiceActivationService = new VoiceActivationService();

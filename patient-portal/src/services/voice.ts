import Voice from 'react-native-voice';
import Tts from 'react-native-tts';
import {Platform, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VoiceCommand {
  phrase: string;
  action: () => void;
  description?: string;
}

export interface VoiceConfig {
  language: string;
  rate: number;
  pitch: number;
  volume: number;
  voiceId?: string;
  enabled: boolean;
  continuousListening: boolean;
  voiceActivation: boolean;
  noiseReduction: boolean;
}

export interface SpeechRecognitionOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSpeechResults?: (results: string[]) => void;
  onSpeechError?: (error: any) => void;
  onError?: (error: any) => void;
}

export class VoiceService {
  private static commands: VoiceCommand[] = [];
  private static isListening = false;
  private static isInitialized = false;
  private static config: VoiceConfig = {
    language: 'en-US',
    rate: 0.5,
    pitch: 1.0,
    volume: 1.0,
    enabled: false,
    continuousListening: false,
    voiceActivation: false,
    noiseReduction: true,
  };

  private static recognitionCallbacks: SpeechRecognitionOptions = {};

  /**
   * Initialize voice services
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load voice configuration
      await this.loadConfig();

      // Initialize Text-to-Speech
      await this.initializeTts();

      // Initialize Speech Recognition
      await this.initializeSpeechRecognition();

      this.isInitialized = true;
      console.log('Voice service initialized');
    } catch (error) {
      console.error('Failed to initialize voice service:', error);
      throw error;
    }
  }

  /**
   * Load voice configuration from storage
   */
  private static async loadConfig(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem('voice_config');
      if (savedConfig) {
        this.config = {...this.config, ...JSON.parse(savedConfig)};
      }
    } catch (error) {
      console.error('Failed to load voice config:', error);
    }
  }

  /**
   * Save voice configuration to storage
   */
  private static async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('voice_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save voice config:', error);
    }
  }

  /**
   * Initialize Text-to-Speech
   */
  private static async initializeTts(): Promise<void> {
    try {
      // Set default TTS settings
      Tts.setDefaultLanguage(this.config.language);
      Tts.setDefaultRate(this.config.rate);
      Tts.setDefaultPitch(this.config.pitch);

      // Get available voices
      const voices = await Tts.voices();
      console.log('Available TTS voices:', voices);

      // Set preferred voice if available
      if (this.config.voiceId) {
        const voice = voices.find(v => v.id === this.config.voiceId);
        if (voice) {
          Tts.setDefaultVoice(voice.id);
        }
      }

      // Set up TTS event listeners
      Tts.addEventListener('tts-start', this.onTtsStart);
      Tts.addEventListener('tts-finish', this.onTtsFinish);
      Tts.addEventListener('tts-cancel', this.onTtsCancel);
      Tts.addEventListener('tts-error', this.onTtsError);

      console.log('TTS initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TTS:', error);
      throw error;
    }
  }

  /**
   * Initialize Speech Recognition
   */
  private static async initializeSpeechRecognition(): Promise<void> {
    try {
      // Check if speech recognition is available
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        console.log('Speech recognition not available on this device');
        return;
      }

      // Set up speech recognition event listeners
      Voice.onSpeechStart = this.onSpeechStart;
      Voice.onSpeechEnd = this.onSpeechEnd;
      Voice.onSpeechError = this.onSpeechError;
      Voice.onSpeechResults = this.onSpeechResults;
      Voice.onSpeechPartialResults = this.onSpeechPartialResults;
      Voice.onSpeechVolumeChanged = this.onSpeechVolumeChanged;

      console.log('Speech recognition initialized successfully');
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      throw error;
    }
  }

  /**
   * Register voice commands
   */
  static async registerCommands(commands: VoiceCommand[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.commands = [...this.commands, ...commands];
    console.log(`Registered ${commands.length} voice commands`);
  }

  /**
   * Clear all voice commands
   */
  static clearCommands(): void {
    this.commands = [];
    console.log('Voice commands cleared');
  }

  /**
   * Start listening for voice commands
   */
  static async startListening(): Promise<void> {
    if (!this.config.enabled || this.isListening) {
      return;
    }

    try {
      await Voice.start(this.config.language);
      this.isListening = true;
      console.log('Started listening for voice commands');
    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  }

  /**
   * Stop listening for voice commands
   */
  static async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      await Voice.stop();
      this.isListening = false;
      console.log('Stopped listening for voice commands');
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  }

  /**
   * Start continuous listening
   */
  static async startContinuousListening(callbacks?: SpeechRecognitionOptions): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.recognitionCallbacks = callbacks || {};
    this.config.continuousListening = true;
    await this.saveConfig();

    try {
      await this.startListening();
    } catch (error) {
      console.error('Failed to start continuous listening:', error);
    }
  }

  /**
   * Stop continuous listening
   */
  static async stopContinuousListening(): Promise<void> {
    this.config.continuousListening = false;
    await this.saveConfig();
    await this.stopListening();
  }

  /**
   * Speak text using TTS
   */
  static async speak(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    language?: string;
  }): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const settings = {
        rate: options?.rate || this.config.rate,
        pitch: options?.pitch || this.config.pitch,
        volume: options?.volume || this.config.volume,
        language: options?.language || this.config.language,
      };

      await Tts.speak(text, settings);
      console.log('Speaking:', text);
    } catch (error) {
      console.error('Failed to speak text:', error);
    }
  }

  /**
   * Stop TTS
   */
  static async stopSpeaking(): Promise<void> {
    try {
      await Tts.stop();
    } catch (error) {
      console.error('Failed to stop speaking:', error);
    }
  }

  /**
   * Get voice configuration
   */
  static getConfig(): VoiceConfig {
    return {...this.config};
  }

  /**
   * Update voice configuration
   */
  static async updateConfig(newConfig: Partial<VoiceConfig>): Promise<void> {
    this.config = {...this.config, ...newConfig};
    await this.saveConfig();

    // Apply TTS settings immediately
    if (newConfig.language) {
      Tts.setDefaultLanguage(newConfig.language);
    }
    if (newConfig.rate) {
      Tts.setDefaultRate(newConfig.rate);
    }
    if (newConfig.pitch) {
      Tts.setDefaultPitch(newConfig.pitch);
    }

    console.log('Voice config updated:', this.config);
  }

  /**
   * Get available voices
   */
  static async getAvailableVoices(): Promise<any[]> {
    try {
      return await Tts.voices();
    } catch (error) {
      console.error('Failed to get available voices:', error);
      return [];
    }
  }

  /**
   * Set voice
   */
  static async setVoice(voiceId: string): Promise<void> {
    try {
      await Tts.setDefaultVoice(voiceId);
      this.config.voiceId = voiceId;
      await this.saveConfig();
    } catch (error) {
      console.error('Failed to set voice:', error);
    }
  }

  /**
   * Process speech recognition results
   */
  private static processSpeechResults(results: string[]): void {
    if (!results || results.length === 0) return;

    const spokenText = results[0].toLowerCase();
    console.log('Speech recognized:', spokenText);

    // Find matching command
    const matchingCommand = this.commands.find(command =>
      spokenText.includes(command.phrase.toLowerCase())
    );

    if (matchingCommand) {
      console.log('Executing voice command:', matchingCommand.phrase);
      try {
        matchingCommand.action();
      } catch (error) {
        console.error('Failed to execute voice command:', error);
      }
    } else {
      console.log('No matching voice command found for:', spokenText);
    }

    // Restart listening if continuous mode is enabled
    if (this.config.continuousListening && !this.isListening) {
      setTimeout(() => {
        this.startListening().catch(error => {
          console.error('Failed to restart listening:', error);
        });
      }, 1000);
    }
  }

  // Speech Recognition Event Handlers
  private static onSpeechStart = (event: any) => {
    console.log('Speech started');
    this.recognitionCallbacks.onSpeechStart?.();
  };

  private static onSpeechEnd = (event: any) => {
    console.log('Speech ended');
    this.isListening = false;
    this.recognitionCallbacks.onSpeechEnd?.();
  };

  private static onSpeechError = (event: any) => {
    console.error('Speech error:', event);
    this.isListening = false;
    this.recognitionCallbacks.onSpeechError?.(event);
    this.recognitionCallbacks.onError?.(event);
  };

  private static onSpeechResults = (event: any) => {
    console.log('Speech results:', event);
    this.recognitionCallbacks.onSpeechResults?.(event.value);
    this.processSpeechResults(event.value);
  };

  private static onSpeechPartialResults = (event: any) => {
    console.log('Speech partial results:', event);
  };

  private static onSpeechVolumeChanged = (event: any) => {
    // console.log('Speech volume:', event);
  };

  // TTS Event Handlers
  private static onTtsStart = (event: any) => {
    console.log('TTS started');
  };

  private static onTtsFinish = (event: any) => {
    console.log('TTS finished');
  };

  private static onTtsCancel = (event: any) => {
    console.log('TTS cancelled');
  };

  private static onTtsError = (event: any) => {
    console.error('TTS error:', event);
  };

  /**
   * Test voice recognition
   */
  static async testRecognition(): Promise<void> {
    try {
      Alert.alert(
        'Voice Recognition Test',
        'Speak something after pressing OK. The app will try to recognize your speech.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await this.startListening();
              setTimeout(async () => {
                await this.stopListening();
              }, 5000);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Voice recognition test failed:', error);
      Alert.alert('Error', 'Voice recognition test failed. Please check your microphone permissions.');
    }
  }

  /**
   * Test text-to-speech
   */
  static async testTts(): Promise<void> {
    try {
      await this.speak('Hello! This is a text to speech test. Can you hear me clearly?');
    } catch (error) {
      console.error('TTS test failed:', error);
      Alert.alert('Error', 'Text-to-speech test failed.');
    }
  }

  /**
   * Clean up voice services
   */
  static cleanup(): void {
    try {
      Voice.destroy();
      Tts.removeAllListeners();
      this.isInitialized = false;
      this.isListening = false;
      console.log('Voice service cleaned up');
    } catch (error) {
      console.error('Failed to cleanup voice service:', error);
    }
  }

  /**
   * Enable emergency voice commands
   */
  static enableEmergencyVoiceCommands(): void {
    const emergencyCommands: VoiceCommand[] = [
      {
        phrase: 'emergency',
        action: () => {
          // TODO: Trigger emergency alert
          console.log('Emergency voice command triggered');
        },
        description: 'Trigger emergency alert',
      },
      {
        phrase: 'help me',
        action: () => {
          // TODO: Open crisis support
          console.log('Help voice command triggered');
        },
        description: 'Open crisis support',
      },
      {
        phrase: 'call support',
        action: () => {
          // TODO: Call emergency contact
          console.log('Call support voice command triggered');
        },
        description: 'Call emergency contact',
      },
    ];

    this.registerCommands(emergencyCommands);
  }
}

// Initialize voice services when app starts
export const initializeVoiceCommands = async () => {
  try {
    await VoiceService.initialize();
  } catch (error) {
    console.error('Failed to initialize voice commands:', error);
  }
};
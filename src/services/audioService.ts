/**
 * Audio Service for ASMR and Calming Sensory Features
 * Implements Web Audio API with performance optimization and fallbacks
 */

export interface AudioTrack {
  id: string;
  name: string;
  category: 'nature' | 'noise' | 'ambient' | 'notification';
  url: string;
  loop?: boolean;
  volume?: number;
}

export interface AudioPreferences {
  masterVolume: number;
  ambientEnabled: boolean;
  soundEffectsEnabled: boolean;
  notificationSoundsEnabled: boolean;
  fadeInDuration: number;
  fadeOutDuration: number;
  preferredTracks: string[];
}

class AudioServiceClass {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private audioSources: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private isSupported = false;
  private preferences: AudioPreferences;

  // Default audio tracks
  private readonly defaultTracks: AudioTrack[] = [
    // Nature sounds
    { id: 'rain', name: 'Gentle Rain', category: 'nature', url: '/audio/rain.mp3', loop: true },
    { id: 'ocean', name: 'Ocean Waves', category: 'nature', url: '/audio/ocean.mp3', loop: true },
    { id: 'forest', name: 'Forest Sounds', category: 'nature', url: '/audio/forest.mp3', loop: true },
    { id: 'birds', name: 'Morning Birds', category: 'nature', url: '/audio/birds.mp3', loop: true },
    
    // Noise options
    { id: 'white-noise', name: 'White Noise', category: 'noise', url: '/audio/white-noise.mp3', loop: true },
    { id: 'brown-noise', name: 'Brown Noise', category: 'noise', url: '/audio/brown-noise.mp3', loop: true },
    { id: 'pink-noise', name: 'Pink Noise', category: 'noise', url: '/audio/pink-noise.mp3', loop: true },
    
    // Ambient
    { id: 'meditation', name: 'Meditation Bowl', category: 'ambient', url: '/audio/meditation.mp3', loop: true },
    { id: 'wind-chimes', name: 'Wind Chimes', category: 'ambient', url: '/audio/chimes.mp3', loop: true },
    
    // Notification sounds
    { id: 'soft-chime', name: 'Soft Chime', category: 'notification', url: '/audio/soft-chime.mp3' },
    { id: 'gentle-bell', name: 'Gentle Bell', category: 'notification', url: '/audio/gentle-bell.mp3' },
    { id: 'completion-chime', name: 'Completion', category: 'notification', url: '/audio/completion.mp3' },
    { id: 'transition-sound', name: 'Transition', category: 'notification', url: '/audio/transition.mp3' }
  ];

  constructor() {
    this.preferences = this.loadPreferences();
    this.initializeAudioContext();
  }

  private loadPreferences(): AudioPreferences {
    try {
      const stored = localStorage.getItem('serenity-audio-preferences');
      if (stored) {
        return { ...this.getDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load audio preferences:', error);
    }
    return this.getDefaultPreferences();
  }

  private getDefaultPreferences(): AudioPreferences {
    return {
      masterVolume: 0.7,
      ambientEnabled: false, // Disabled by default - user must opt-in
      soundEffectsEnabled: false,
      notificationSoundsEnabled: false,
      fadeInDuration: 2000, // 2 seconds
      fadeOutDuration: 1500, // 1.5 seconds
      preferredTracks: ['rain', 'ocean']
    };
  }

  private async initializeAudioContext() {
    try {
      // Check for Web Audio API support
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.connect(this.audioContext.destination);
        this.masterGainNode.gain.value = this.preferences.masterVolume;
        this.isSupported = true;
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.isSupported = false;
    }
  }

  public async loadAudioBuffer(track: AudioTrack): Promise<AudioBuffer | null> {
    if (!this.isSupported || !this.audioContext) {
      return null;
    }

    try {
      // Check if already loaded
      if (this.audioBuffers.has(track.id)) {
        return this.audioBuffers.get(track.id)!;
      }

      // Load audio file
      const response = await fetch(track.url);
      if (!response.ok) {
        console.warn(`Failed to load audio file: ${track.url}`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.audioBuffers.set(track.id, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Error loading audio track ${track.id}:`, error);
      return null;
    }
  }

  public async playTrack(trackId: string, volume = 1.0): Promise<void> {
    if (!this.isSupported || !this.audioContext || !this.masterGainNode) {
      return;
    }

    try {
      const track = this.defaultTracks.find(t => t.id === trackId);
      if (!track) {
        console.warn(`Track not found: ${trackId}`);
        return;
      }

      // Stop existing playback of this track
      this.stopTrack(trackId);

      // Load buffer if needed
      const buffer = await this.loadAudioBuffer(track);
      if (!buffer) {
        return;
      }

      // Resume audio context if suspended (required for user interaction)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create source and gain nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.loop = track.loop || false;

      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(this.masterGainNode);

      // Set initial volume and fade in
      const targetVolume = volume * (track.volume || 1.0);
      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        targetVolume,
        this.audioContext.currentTime + (this.preferences.fadeInDuration / 1000)
      );

      // Store references
      this.audioSources.set(trackId, source);
      this.gainNodes.set(trackId, gainNode);

      // Start playback
      source.start();

      // Clean up when finished (for non-looping tracks)
      if (!track.loop) {
        source.onended = () => {
          this.cleanupTrack(trackId);
        };
      }
    } catch (error) {
      console.warn(`Error playing track ${trackId}:`, error);
    }
  }

  public async stopTrack(trackId: string): Promise<void> {
    if (!this.isSupported || !this.audioContext) {
      return;
    }

    try {
      const source = this.audioSources.get(trackId);
      const gainNode = this.gainNodes.get(trackId);

      if (source && gainNode) {
        // Fade out
        const currentTime = this.audioContext.currentTime;
        const fadeOutTime = this.preferences.fadeOutDuration / 1000;
        
        gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutTime);
        
        // Stop after fade out
        setTimeout(() => {
          try {
            source.stop();
          } catch (error) {
            // Source might already be stopped
          }
          this.cleanupTrack(trackId);
        }, this.preferences.fadeOutDuration);
      }
    } catch (error) {
      console.warn(`Error stopping track ${trackId}:`, error);
    }
  }

  private cleanupTrack(trackId: string): void {
    this.audioSources.delete(trackId);
    this.gainNodes.delete(trackId);
  }

  public setMasterVolume(volume: number): void {
    if (!this.isSupported || !this.masterGainNode) {
      return;
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGainNode.gain.linearRampToValueAtTime(
      clampedVolume,
      this.audioContext!.currentTime + 0.1
    );

    this.preferences.masterVolume = clampedVolume;
    this.savePreferences();
  }

  public setTrackVolume(trackId: string, volume: number): void {
    if (!this.isSupported) {
      return;
    }

    const gainNode = this.gainNodes.get(trackId);
    if (gainNode && this.audioContext) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      gainNode.gain.linearRampToValueAtTime(
        clampedVolume,
        this.audioContext.currentTime + 0.1
      );
    }
  }

  public updatePreferences(newPreferences: Partial<AudioPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();

    // Apply master volume if changed
    if (newPreferences.masterVolume !== undefined) {
      this.setMasterVolume(newPreferences.masterVolume);
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('serenity-audio-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save audio preferences:', error);
    }
  }

  public getPreferences(): AudioPreferences {
    return { ...this.preferences };
  }

  public getAvailableTracks(): AudioTrack[] {
    return [...this.defaultTracks];
  }

  public isTrackPlaying(trackId: string): boolean {
    return this.audioSources.has(trackId);
  }

  public stopAllTracks(): void {
    const trackIds = Array.from(this.audioSources.keys());
    trackIds.forEach(trackId => this.stopTrack(trackId));
  }

  public isAudioSupported(): boolean {
    return this.isSupported;
  }

  // Pause all ambient sounds during important interactions
  public pauseForInteraction(): void {
    const ambientTracks = this.defaultTracks
      .filter(track => ['nature', 'noise', 'ambient'].includes(track.category))
      .map(track => track.id);

    ambientTracks.forEach(trackId => {
      const gainNode = this.gainNodes.get(trackId);
      if (gainNode && this.audioContext) {
        gainNode.gain.linearRampToValueAtTime(
          0.2, // Reduce to 20% volume
          this.audioContext.currentTime + 0.3
        );
      }
    });
  }

  public resumeAfterInteraction(): void {
    const ambientTracks = this.defaultTracks
      .filter(track => ['nature', 'noise', 'ambient'].includes(track.category))
      .map(track => track.id);

    ambientTracks.forEach(trackId => {
      const gainNode = this.gainNodes.get(trackId);
      if (gainNode && this.audioContext) {
        const track = this.defaultTracks.find(t => t.id === trackId);
        const targetVolume = (track?.volume || 1.0);
        gainNode.gain.linearRampToValueAtTime(
          targetVolume,
          this.audioContext.currentTime + 0.8
        );
      }
    });
  }

  // Generate procedural noise for fallback when files aren't available
  public generateWhiteNoise(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const duration = 10; // 10 seconds of noise
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const output = buffer.getChannelData(channel);
      for (let i = 0; i < output.length; i++) {
        output[i] = Math.random() * 2 - 1; // White noise
      }
    }

    return buffer;
  }
}

export const audioService = new AudioServiceClass();
export default audioService;
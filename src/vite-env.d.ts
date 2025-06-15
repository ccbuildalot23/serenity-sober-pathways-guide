
/// <reference types="vite/client" />

declare global {
  interface Window {
    confetti: any;
    AudioContext: any;
    webkitAudioContext: any;
    debugLog: Array<{
      timestamp: string;
      category: string;
      message: string;
      data?: any;
    }>;
  }
}

export {};

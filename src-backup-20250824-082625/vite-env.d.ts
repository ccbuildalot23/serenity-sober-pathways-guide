
/// <reference types="vite/client" />

declare global {
  interface Window {
    confetti: unknown;
    AudioContext: unknown;
    webkitAudioContext: unknown;
    debugLog: Array<{
      timestamp: string;
      category: string;
      message: string;
      data?: unknown;
    }>;
  }
}

export {};

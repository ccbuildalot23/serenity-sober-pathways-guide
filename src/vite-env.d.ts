
/// <reference types="vite/client" />

declare global {
  interface Window {
    confetti: any;
    AudioContext: any;
    webkitAudioContext: any;
  }
}

export {};

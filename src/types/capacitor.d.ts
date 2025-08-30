declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
      Plugins?: {
        Haptics?: {
          impact: (options: { style: string }) => Promise<void>;
          notification: (options: { type: string }) => Promise<void>;
          vibrate: () => Promise<void>;
          selectionStart: () => Promise<void>;
          selectionChanged: () => Promise<void>;
          selectionEnd: () => Promise<void>;
        };
        App?: {
          addListener: (event: string, callback: (info: any) => void) => Promise<{ remove: () => void }>;
          exitApp: () => Promise<void>;
          getInfo: () => Promise<any>;
          getState: () => Promise<any>;
          minimizeApp: () => Promise<void>;
        };
        Device?: {
          getInfo: () => Promise<any>;
          getBatteryInfo: () => Promise<any>;
          getLanguageCode: () => Promise<any>;
        };
        Network?: {
          getStatus: () => Promise<any>;
          addListener: (event: string, callback: (status: any) => void) => Promise<{ remove: () => void }>;
        };
        Storage?: {
          get: (options: { key: string }) => Promise<{ value: string | null }>;
          set: (options: { key: string; value: string }) => Promise<void>;
          remove: (options: { key: string }) => Promise<void>;
          clear: () => Promise<void>;
        };
      };
    };
  }
}

export {};
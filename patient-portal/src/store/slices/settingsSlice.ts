import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface NotificationSettings {
  medicationReminders: boolean;
  appointmentReminders: boolean;
  checkinReminders: boolean;
  crisisAlerts: boolean;
  peerMessages: boolean;
}

interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
  screenReader: boolean;
  voiceOver: boolean;
  reduceMotion: boolean;
}

interface PrivacySettings {
  shareAnalytics: boolean;
  locationServices: boolean;
  crashReporting: boolean;
  dataCollection: boolean;
}

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  privacy: PrivacySettings;
  hapticFeedback: boolean;
  voiceCommands: boolean;
  autoSync: boolean;
  offlineMode: boolean;
}

const initialState: SettingsState = {
  theme: 'system',
  language: 'en',
  notifications: {
    medicationReminders: true,
    appointmentReminders: true,
    checkinReminders: true,
    crisisAlerts: true,
    peerMessages: true,
  },
  accessibility: {
    largeText: false,
    highContrast: false,
    screenReader: false,
    voiceOver: false,
    reduceMotion: false,
  },
  privacy: {
    shareAnalytics: false,
    locationServices: true,
    crashReporting: true,
    dataCollection: false,
  },
  hapticFeedback: true,
  voiceCommands: false,
  autoSync: true,
  offlineMode: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    updateNotifications: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notifications = {...state.notifications, ...action.payload};
    },
    updateAccessibility: (state, action: PayloadAction<Partial<AccessibilitySettings>>) => {
      state.accessibility = {...state.accessibility, ...action.payload};
    },
    updatePrivacy: (state, action: PayloadAction<Partial<PrivacySettings>>) => {
      state.privacy = {...state.privacy, ...action.payload};
    },
    setHapticFeedback: (state, action: PayloadAction<boolean>) => {
      state.hapticFeedback = action.payload;
    },
    setVoiceCommands: (state, action: PayloadAction<boolean>) => {
      state.voiceCommands = action.payload;
    },
    setAutoSync: (state, action: PayloadAction<boolean>) => {
      state.autoSync = action.payload;
    },
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.offlineMode = action.payload;
    },
    resetSettings: () => initialState,
  },
});

export const {
  setTheme,
  setLanguage,
  updateNotifications,
  updateAccessibility,
  updatePrivacy,
  setHapticFeedback,
  setVoiceCommands,
  setAutoSync,
  setOfflineMode,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Emergency: {
    triggerType?: 'user' | 'automatic' | 'voice';
    context?: string;
  };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  BiometricSetup: undefined;
  PinSetup: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  CheckIn: undefined;
  Crisis: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type DrawerParamList = {
  MainTabs: undefined;
  Medication: undefined;
  Appointments: undefined;
  Analytics: undefined;
  SafetyPlan: undefined;
  Resources: undefined;
};

export type CheckinStackParamList = {
  CheckinHome: undefined;
  MoodCheckin: {
    checkinId?: string;
  };
  AnxietyCheckin: {
    checkinId: string;
  };
  SleepCheckin: {
    checkinId: string;
  };
  SubstanceCheckin: {
    checkinId: string;
  };
  CheckinComplete: {
    checkinId: string;
    celebrationType?: 'milestone' | 'streak' | 'achievement';
  };
};

export type CrisisStackParamList = {
  CrisisHome: undefined;
  EmergencyContacts: undefined;
  CrisisResources: undefined;
  EmergencyHistory: undefined;
};

export type MessagingStackParamList = {
  ConversationList: undefined;
  ChatRoom: {
    roomId: string;
    roomName: string;
    isGroup?: boolean;
  };
  PeerSupport: undefined;
  ProviderChat: {
    providerId: string;
    providerName: string;
  };
};

export type MedicationStackParamList = {
  MedicationHome: undefined;
  AddMedication: undefined;
  EditMedication: {
    medicationId: string;
  };
  MedicationSchedule: undefined;
  MedicationHistory: undefined;
  MedicationReminders: undefined;
};

export type AppointmentStackParamList = {
  AppointmentHome: undefined;
  ScheduleAppointment: undefined;
  AppointmentDetails: {
    appointmentId: string;
  };
  AppointmentHistory: undefined;
  ProviderDetails: {
    providerId: string;
  };
};

export type AnalyticsStackParamList = {
  AnalyticsHome: undefined;
  MoodTrends: undefined;
  SleepAnalysis: undefined;
  MedicationAdherence: undefined;
  ProgressMilestones: undefined;
  TriggerPatterns: undefined;
};

export type SafetyPlanStackParamList = {
  SafetyPlanHome: undefined;
  CreateSafetyPlan: undefined;
  EditSafetyPlan: {
    planId: string;
  };
  CopingStrategies: undefined;
  SupportContacts: undefined;
  SafeEnvironment: undefined;
};

export type ResourcesStackParamList = {
  ResourcesHome: undefined;
  Articles: undefined;
  Videos: undefined;
  Exercises: undefined;
  AudioContent: undefined;
  BookmarkedContent: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  SecuritySettings: undefined;
  NotificationSettings: undefined;
  AccessibilitySettings: undefined;
  PrivacySettings: undefined;
  ThemeSettings: undefined;
  VoiceSettings: undefined;
  BiometricSettings: undefined;
};

export interface NotificationSettings {
  time: string;
  freq: number;
  toggles: {
    checkIn: boolean;
    affirm: boolean;
    support: boolean;
    spiritual: boolean;
  };
}

export interface NotificationMessage {
  title: string;
  body: string;
  actions?: { action: string; title: string; icon?: string }[];
}

export type NotificationType = 'checkIn' | 'affirm' | 'support' | 'spiritual';

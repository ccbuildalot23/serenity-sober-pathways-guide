
export interface RealtimeAlert {
  id: string;
  type: 'crisis' | 'milestone' | 'support' | 'system';
  senderId: string;
  senderName: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  timestamp: string;
  location?: string;
}

export interface RealtimePresence {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'in-crisis';
  lastSeen: string;
}

export interface RealtimeChannelConfig {
  config?: {
    broadcast?: {
      self?: boolean;
      ack?: boolean;
    };
    presence?: {
      key?: string;
    };
  };
}

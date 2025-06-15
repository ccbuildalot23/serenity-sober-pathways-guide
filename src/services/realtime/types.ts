
export interface RealtimeAlert {
  id: string;
  type: 'crisis' | 'check-in' | 'status-update';
  senderId: string;
  senderName: string;
  message: string;
  urgency: 'high' | 'medium' | 'low';
  location?: string;
  timestamp: string;
}

export interface RealtimePresence {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'in-crisis';
  lastSeen: string;
}

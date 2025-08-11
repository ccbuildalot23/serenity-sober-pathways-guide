// Emergency Fallback System - Ensures app works even if database is completely broken
// This provides localStorage-based alternatives for critical functionality

export interface LocalCheckin {
  id: string;
  date: string;
  mood: number;
  energy: number;
  hope: number;
  sobriety_confidence: number;
  recovery_importance: number;
  recovery_strength: number;
  support_needed: boolean;
  notes: string;
  created_at: string;
}

export interface LocalSupportContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  is_emergency_contact: boolean;
  permissions: {
    view_mood: boolean;
    view_checkins: boolean;
    crisis_alerts: boolean;
    milestone_alerts: boolean;
  };
  created_at: string;
}

export interface LocalUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

class EmergencyFallback {
  private readonly CHECKINS_KEY = 'emergency_checkins';
  private readonly CONTACTS_KEY = 'emergency_contacts';
  private readonly USER_KEY = 'emergency_user';
  private readonly STREAK_KEY = 'emergency_streak';

  // Check-in Management
  saveCheckin(checkin: Omit<LocalCheckin, 'id' | 'created_at'>): LocalCheckin {
    const checkins = this.getCheckins();
    const newCheckin: LocalCheckin = {
      ...checkin,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    
    checkins.push(newCheckin);
    localStorage.setItem(this.CHECKINS_KEY, JSON.stringify(checkins));
    
    // Update streak
    this.updateStreak();
    
    return newCheckin;
  }

  getCheckins(): LocalCheckin[] {
    try {
      const stored = localStorage.getItem(this.CHECKINS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  getCheckinsByDate(date: string): LocalCheckin[] {
    return this.getCheckins().filter(c => c.date === date);
  }

  getTotalCheckins(): number {
    return this.getCheckins().length;
  }

  getLastCheckin(): LocalCheckin | null {
    const checkins = this.getCheckins();
    return checkins.length > 0 ? checkins[checkins.length - 1] : null;
  }

  // Support Network Management
  saveContact(contact: Omit<LocalSupportContact, 'id' | 'created_at'>): LocalSupportContact {
    const contacts = this.getContacts();
    const newContact: LocalSupportContact = {
      ...contact,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    
    contacts.push(newContact);
    localStorage.setItem(this.CONTACTS_KEY, JSON.stringify(contacts));
    
    return newContact;
  }

  getContacts(): LocalSupportContact[] {
    try {
      const stored = localStorage.getItem(this.CONTACTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  updateContact(id: string, updates: Partial<LocalSupportContact>): LocalSupportContact | null {
    const contacts = this.getContacts();
    const index = contacts.findIndex(c => c.id === id);
    
    if (index === -1) return null;
    
    contacts[index] = { ...contacts[index], ...updates };
    localStorage.setItem(this.CONTACTS_KEY, JSON.stringify(contacts));
    
    return contacts[index];
  }

  deleteContact(id: string): boolean {
    const contacts = this.getContacts();
    const filtered = contacts.filter(c => c.id !== id);
    
    if (filtered.length === contacts.length) return false;
    
    localStorage.setItem(this.CONTACTS_KEY, JSON.stringify(filtered));
    return true;
  }

  getEmergencyContacts(): LocalSupportContact[] {
    return this.getContacts().filter(c => c.is_emergency_contact);
  }

  // User Management
  saveUser(user: Omit<LocalUser, 'id' | 'created_at'>): LocalUser {
    const newUser: LocalUser = {
      ...user,
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(newUser));
    return newUser;
  }

  getUser(): LocalUser | null {
    try {
      const stored = localStorage.getItem(this.USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  // Streak Management
  private updateStreak(): void {
    const checkins = this.getCheckins();
    const sortedCheckins = checkins.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let currentDate = new Date(today);
    
    for (const checkin of sortedCheckins) {
      const checkinDate = new Date(checkin.date);
      const daysDiff = Math.floor((currentDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        streak++;
        currentDate = checkinDate;
      } else {
        break;
      }
    }
    
    localStorage.setItem(this.STREAK_KEY, streak.toString());
  }

  getStreak(): number {
    try {
      const stored = localStorage.getItem(this.STREAK_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  }

  // Data Export/Import
  exportData(): string {
    const data = {
      checkins: this.getCheckins(),
      contacts: this.getContacts(),
      user: this.getUser(),
      streak: this.getStreak(),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.checkins) {
        localStorage.setItem(this.CHECKINS_KEY, JSON.stringify(data.checkins));
      }
      
      if (data.contacts) {
        localStorage.setItem(this.CONTACTS_KEY, JSON.stringify(data.contacts));
      }
      
      if (data.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      }
      
      if (data.streak) {
        localStorage.setItem(this.STREAK_KEY, data.streak.toString());
      }
      
      return true;
    } catch {
      return false;
    }
  }

  // Clear all data
  clearAllData(): void {
    localStorage.removeItem(this.CHECKINS_KEY);
    localStorage.removeItem(this.CONTACTS_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.STREAK_KEY);
  }
}

export const emergencyFallback = new EmergencyFallback();

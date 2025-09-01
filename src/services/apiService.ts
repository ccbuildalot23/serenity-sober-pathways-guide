/**
 * API Service for Backend Communication
 * Handles all API calls to the backend server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage if available
    this.loadToken();
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('auth_token');
      this.token = session;
    }
  }

  private saveToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok && response.status === 401) {
      // Token expired or invalid
      this.clearToken();
      window.location.href = '/auth';
      throw new Error('Authentication required');
    }

    return response.json();
  }

  // ==================
  // AUTH METHODS
  // ==================

  async login(email: string, password: string) {
    try {
      const response = await this.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.token) {
        this.saveToken(response.token);
        
        // Create Supabase-compatible session for compatibility
        const session = {
          access_token: response.token,
          token_type: 'bearer',
          expires_in: 86400,
          refresh_token: `refresh_${response.token}`,
          user: {
            id: response.user.id,
            email: response.user.email,
            user_metadata: {
              full_name: response.user.name,
              userType: response.user.role
            },
            app_metadata: {
              provider: 'email',
              providers: ['email']
            },
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };

        // Store in localStorage for Supabase compatibility
        if (typeof window !== 'undefined') {
          localStorage.setItem('supabase.auth.token', JSON.stringify(session));
          localStorage.setItem('sb-tqyiqstpvwztvofrxpuf-auth-token', JSON.stringify(session));
        }

        return {
          data: { user: session.user, session },
          error: null
        };
      }

      return {
        data: null,
        error: { message: 'Login failed' }
      };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Login failed' }
      };
    }
  }

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Continue with local logout even if server fails
    }
    
    this.clearToken();
    
    // Clear Supabase sessions
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-tqyiqstpvwztvofrxpuf-auth-token');
    }
    
    return { error: null };
  }

  // ==================
  // CHECKIN METHODS
  // ==================

  async createCheckIn(data: {
    mood: string;
    anxiety_level: number;
    sleep_hours: number;
    medication_taken: boolean;
    notes?: string;
  }) {
    return this.request('/api/checkins', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getCheckIns(limit = 30, offset = 0) {
    return this.request(`/api/checkins?limit=${limit}&offset=${offset}`);
  }

  // ==================
  // CRISIS METHODS
  // ==================

  async createCrisisAlert(data: {
    severity?: string;
    location_lat?: number;
    location_lng?: number;
    location_address?: string;
    message?: string;
  }) {
    return this.request('/api/crisis/alert', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async resolveCrisisAlert(alertId: string, resolution_notes: string) {
    return this.request(`/api/crisis/alert/${alertId}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ resolution_notes })
    });
  }

  // ==================
  // SUPPORT NETWORK
  // ==================

  async getSupportNetwork() {
    return this.request('/api/support/network');
  }

  // ==================
  // NOTIFICATIONS
  // ==================

  async getNotifications() {
    return this.request('/api/notifications');
  }

  async markNotificationRead(notificationId: string) {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  // ==================
  // WEBSOCKET
  // ==================

  connectWebSocket(onMessage: (data: any) => void) {
    const ws = new WebSocket(`ws://localhost:3001`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      
      // Authenticate WebSocket connection
      if (this.token) {
        ws.send(JSON.stringify({
          type: 'authenticate',
          token: this.token
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(onMessage), 5000);
    };

    return ws;
  }
}

export const apiService = new ApiService();
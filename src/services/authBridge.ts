/**
 * Authentication Bridge Service
 * Provides hybrid authentication using Supabase for OAuth and local backend for sessions
 */

import { supabase } from '../integrations/supabase/client';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
  token: string;
  session?: any;
}

interface LocalAuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

class AuthBridgeService {
  private backendUrl = 'http://localhost:3001';
  private currentToken: string | null = null;

  /**
   * Hybrid login - tries Supabase first, falls back to local auth
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log('[AuthBridge] Attempting login for:', email);
    
    // Try local backend first for MVP (more reliable)
    try {
      const localAuth = await this.localAuth(email, password);
      if (localAuth) {
        console.log('[AuthBridge] Local auth successful');
        this.currentToken = localAuth.token;
        localStorage.setItem('auth_token', localAuth.token);
        localStorage.setItem('auth_user', JSON.stringify(localAuth.user));
        return localAuth;
      }
    } catch (localError) {
      console.log('[AuthBridge] Local auth failed, trying Supabase:', localError);
    }

    // Try Supabase as fallback
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user && data.session) {
        // Sync with local backend
        const synced = await this.syncWithBackend(data.user, data.session);
        return synced;
      }
    } catch (supabaseError) {
      console.error('[AuthBridge] Supabase auth failed:', supabaseError);
    }

    throw new Error('Authentication failed. Please check your credentials.');
  }

  /**
   * Local authentication directly with backend
   */
  private async localAuth(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Local authentication failed');
    }

    const data: LocalAuthResponse = await response.json();
    
    return {
      user: data.user,
      token: data.token,
      session: { access_token: data.token },
    };
  }

  /**
   * Sync Supabase user with local backend
   */
  private async syncWithBackend(supabaseUser: any, session: any): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.backendUrl}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: supabaseUser.id,
          email: supabaseUser.email,
          metadata: supabaseUser.user_metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync with backend');
      }

      const backendData = await response.json();
      
      return {
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: backendData.user?.name || supabaseUser.user_metadata?.full_name,
          role: backendData.user?.role || 'patient',
        },
        token: backendData.token || session.access_token,
        session: session,
      };
    } catch (error) {
      console.error('[AuthBridge] Sync failed, using Supabase data only:', error);
      return {
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name,
          role: 'patient',
        },
        token: session.access_token,
        session: session,
      };
    }
  }

  /**
   * Logout from both systems
   */
  async logout(): Promise<void> {
    // Clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentToken = null;

    // Logout from backend
    if (this.currentToken) {
      try {
        await fetch(`${this.backendUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.currentToken}`,
          },
        });
      } catch (error) {
        console.error('[AuthBridge] Backend logout error:', error);
      }
    }

    // Logout from Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[AuthBridge] Supabase logout error:', error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthResponse['user'] | null> {
    // Check local storage first
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error('[AuthBridge] Failed to parse stored user:', e);
      }
    }

    // Check Supabase session
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name,
        role: user.user_metadata?.role || 'patient',
      };
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = localStorage.getItem('auth_token');
    if (token) {
      return true;
    }

    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  }

  /**
   * Get auth token for API calls
   */
  getAuthToken(): string | null {
    return localStorage.getItem('auth_token') || this.currentToken;
  }

  /**
   * Register new user (MVP - local only)
   */
  async register(email: string, password: string, fullName: string, role: string = 'patient'): Promise<AuthResponse> {
    const response = await fetch(`${this.backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    
    // Auto-login after registration
    return this.login(email, password);
  }
}

// Export singleton instance
export const authBridge = new AuthBridgeService();
export default authBridge;
/**
 * AWS Cognito Authentication Service
 * Handles authentication with AWS Cognito and Lambda backend
 */

const AWS_API_URL = import.meta.env.VITE_AWS_API_URL || 'https://hiheb8cthc.execute-api.us-east-1.amazonaws.com/dev';
const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_hr5sXkYaQ';
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || 'g7j335pgf0ei0n9vc12idde7d';

interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  emailVerified?: boolean;
}

class AWSAuthService {
  private tokens: AuthTokens | null = null;
  private tokenExpiresAt: number = 0;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadTokens();
    this.startTokenRefreshTimer();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aws_auth_tokens');
      if (stored) {
        try {
          this.tokens = JSON.parse(stored);
          const expiresAt = localStorage.getItem('aws_token_expires_at');
          this.tokenExpiresAt = expiresAt ? parseInt(expiresAt) : 0;
        } catch (e) {
          console.error('Failed to load auth tokens:', e);
        }
      }
    }
  }

  private saveTokens(tokens: AuthTokens) {
    this.tokens = tokens;
    this.tokenExpiresAt = Date.now() + (tokens.expiresIn * 1000);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('aws_auth_tokens', JSON.stringify(tokens));
      localStorage.setItem('aws_token_expires_at', this.tokenExpiresAt.toString());
    }
    
    this.startTokenRefreshTimer();
  }

  private clearTokens() {
    this.tokens = null;
    this.tokenExpiresAt = 0;
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aws_auth_tokens');
      localStorage.removeItem('aws_token_expires_at');
      localStorage.removeItem('aws_user_profile');
    }
  }

  private startTokenRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (this.tokens && this.tokenExpiresAt > Date.now()) {
      // Refresh 5 minutes before expiration
      const refreshIn = this.tokenExpiresAt - Date.now() - (5 * 60 * 1000);
      
      if (refreshIn > 0) {
        this.refreshTimer = setTimeout(() => {
          this.refreshTokens();
        }, refreshIn);
      }
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth token for protected endpoints
    if (this.tokens && !endpoint.includes('/auth/')) {
      headers['Authorization'] = `Bearer ${this.tokens.accessToken}`;
    }

    const response = await fetch(`${AWS_API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
  }

  async signUp(email: string, password: string, metadata?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    phone?: string;
  }) {
    try {
      const response = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          ...metadata
        })
      });

      if (response.success) {
        return {
          user: { id: response.userSub, email },
          error: null
        };
      }

      return {
        user: null,
        error: new Error(response.error || 'Registration failed')
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        user: null,
        error
      };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.success && response.tokens) {
        this.saveTokens(response.tokens);
        
        // Fetch user profile
        const user = await this.getUser();
        
        return {
          session: { access_token: response.tokens.accessToken },
          user,
          error: null
        };
      }

      // Handle MFA or other challenges
      if (response.challenge) {
        return {
          session: null,
          user: null,
          error: new Error(`Challenge required: ${response.challenge}`)
        };
      }

      return {
        session: null,
        user: null,
        error: new Error(response.error || 'Login failed')
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        session: null,
        user: null,
        error
      };
    }
  }

  async signOut() {
    try {
      if (this.tokens) {
        await this.request('/auth/logout', {
          method: 'POST'
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      this.clearTokens();
    }

    return { error: null };
  }

  async verifyEmail(email: string, code: string) {
    try {
      const response = await this.request('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code })
      });

      if (response.success) {
        return { error: null };
      }

      return { error: new Error(response.error || 'Verification failed') };
    } catch (error) {
      console.error('Email verification error:', error);
      return { error };
    }
  }

  async resetPasswordRequest(email: string) {
    try {
      const response = await this.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      if (response.success) {
        return { error: null };
      }

      return { error: new Error(response.error || 'Password reset request failed') };
    } catch (error) {
      console.error('Password reset request error:', error);
      return { error };
    }
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    try {
      const response = await this.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, newPassword })
      });

      if (response.success) {
        return { error: null };
      }

      return { error: new Error(response.error || 'Password reset failed') };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error };
    }
  }

  async refreshTokens() {
    if (!this.tokens?.refreshToken) {
      return { error: new Error('No refresh token available') };
    }

    try {
      const response = await this.request('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.tokens.refreshToken })
      });

      if (response.success && response.tokens) {
        const newTokens = {
          ...this.tokens,
          accessToken: response.tokens.accessToken,
          idToken: response.tokens.idToken,
          expiresIn: response.tokens.expiresIn
        };
        
        this.saveTokens(newTokens);
        return { error: null };
      }

      return { error: new Error(response.error || 'Token refresh failed') };
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      return { error };
    }
  }

  async getUser(): Promise<UserProfile | null> {
    // Check cache first
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('aws_user_profile');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Failed to parse cached user profile:', e);
        }
      }
    }

    if (!this.tokens) {
      return null;
    }

    try {
      const response = await this.request('/auth/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        }
      });

      if (response.success && response.user) {
        const user: UserProfile = response.user;
        
        // Cache user profile
        if (typeof window !== 'undefined') {
          localStorage.setItem('aws_user_profile', JSON.stringify(user));
        }
        
        return user;
      }

      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  async getSession() {
    if (!this.tokens) {
      return { data: { session: null }, error: null };
    }

    // Check if token needs refresh
    if (this.tokenExpiresAt <= Date.now()) {
      const { error } = await this.refreshTokens();
      if (error) {
        return { data: { session: null }, error };
      }
    }

    return {
      data: {
        session: {
          access_token: this.tokens.accessToken,
          expires_at: Math.floor(this.tokenExpiresAt / 1000)
        }
      },
      error: null
    };
  }

  isAuthenticated(): boolean {
    return !!this.tokens && this.tokenExpiresAt > Date.now();
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  // Compatibility methods for easy migration from Supabase
  
  auth = {
    signUp: async (options: { email: string; password: string; options?: { data?: any } }) => {
      return this.signUp(options.email, options.password, options.options?.data);
    },
    
    signInWithPassword: async (options: { email: string; password: string }) => {
      return this.signIn(options.email, options.password);
    },
    
    signOut: async () => {
      return this.signOut();
    },
    
    getSession: async () => {
      return this.getSession();
    },
    
    getUser: async () => {
      const user = await this.getUser();
      return { data: { user }, error: null };
    },
    
    resetPasswordForEmail: async (email: string) => {
      return this.resetPasswordRequest(email);
    },
    
    updateUser: async (attributes: any) => {
      // TODO: Implement user profile update
      console.warn('updateUser not yet implemented for AWS Cognito');
      return { data: null, error: new Error('Not implemented') };
    }
  };
}

// Export singleton instance
export const awsAuth = new AWSAuthService();

// Export for compatibility with existing code
export default awsAuth;
/**
 * Unified Auth Service
 * Switches between AWS Cognito (production) and local auth (development)
 */

import { awsAuth } from './awsAuthService';
import { localAuth } from './localAuthService';

// Determine which auth to use - Use AWS Cognito in production
const USE_AWS_AUTH = import.meta.env.VITE_USE_AWS_AUTH !== 'false';
const USE_LOCAL_AUTH = !USE_AWS_AUTH && import.meta.env.DEV;

class AuthService {
  private provider: any;
  
  constructor() {
    if (USE_LOCAL_AUTH) {
      this.provider = localAuth;
      console.log('🔐 Using LOCAL authentication (development)');
    } else {
      this.provider = awsAuth.auth;
      console.log('🔐 Using AWS Cognito authentication');
    }
  }
  
  async signInWithPassword(credentials: { email: string; password: string }) {
    if (USE_LOCAL_AUTH) {
      return await localAuth.signIn(credentials.email, credentials.password);
    }
    return await awsAuth.signIn(credentials.email, credentials.password);
  }
  
  async signUp(credentials: { email: string; password: string; options?: any }) {
    if (USE_LOCAL_AUTH) {
      // For local auth, sign up is the same as sign in for test users
      return await localAuth.signIn(credentials.email, credentials.password);
    }
    return await awsAuth.signUp(credentials.email, credentials.password, credentials.options?.data);
  }
  
  async signOut() {
    return await this.provider.signOut();
  }
  
  async getSession() {
    return await this.provider.getSession();
  }
  
  async getUser() {
    return await this.provider.getUser();
  }
  
  async resetPasswordForEmail(email: string) {
    if (USE_LOCAL_AUTH) {
      return await localAuth.resetPasswordForEmail(email);
    }
    return await supabase.auth.resetPasswordForEmail(email);
  }
  
  async updateUser(attributes: any) {
    if (USE_LOCAL_AUTH) {
      return await localAuth.updateUser(attributes);
    }
    return await supabase.auth.updateUser(attributes);
  }
  
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (USE_LOCAL_AUTH) {
      // Mock implementation for local auth
      const checkAuth = async () => {
        const { data: { session } } = await this.getSession();
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      };
      
      // Check immediately
      checkAuth();
      
      // Check periodically
      const interval = setInterval(checkAuth, 5000);
      
      return {
        data: { subscription: { unsubscribe: () => clearInterval(interval) } },
        error: null
      };
    }
    
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
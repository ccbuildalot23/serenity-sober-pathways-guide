/**
 * Unified Auth Service
 * Switches between local auth (development) and Supabase (production)
 */

import { supabase } from '@/integrations/supabase/client';
import { localAuth } from './localAuthService';
import { apiService } from './apiService';

// Determine which auth to use
const USE_LOCAL_AUTH = import.meta.env.DEV || import.meta.env.VITE_USE_LOCAL_AUTH === 'true';
const USE_BACKEND_API = true; // Always use backend API when available

class AuthService {
  private provider: any;
  
  constructor() {
    this.provider = USE_LOCAL_AUTH ? localAuth : supabase.auth;
    console.log(`🔐 Using ${USE_LOCAL_AUTH ? 'LOCAL' : 'SUPABASE'} authentication`);
  }
  
  async signInWithPassword(credentials: { email: string; password: string }) {
    if (USE_BACKEND_API) {
      return await apiService.login(credentials.email, credentials.password);
    }
    if (USE_LOCAL_AUTH) {
      return await localAuth.signIn(credentials.email, credentials.password);
    }
    return await supabase.auth.signInWithPassword(credentials);
  }
  
  async signUp(credentials: { email: string; password: string; options?: any }) {
    if (USE_LOCAL_AUTH) {
      // For local auth, sign up is the same as sign in for test users
      return await localAuth.signIn(credentials.email, credentials.password);
    }
    return await supabase.auth.signUp(credentials);
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
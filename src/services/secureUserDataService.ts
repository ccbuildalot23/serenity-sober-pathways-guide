
import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityAuditService } from './enhancedSecurityAuditService';

/**
 * Secure User Data Service
 * Handles user data operations with proper security logging and RLS compliance
 */
export class SecureUserDataService {
  static async createUserProfile(profileData: {
    full_name?: string;
    recovery_start_date?: string;
    timezone?: string;
  }): Promise<any> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to create profile');
      }

      // Log the profile creation attempt
      await EnhancedSecurityAuditService.logDataAccessEvent('profiles', 'INSERT', 1);

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id, // Required for RLS policy
          email: user.email,
          ...profileData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        await EnhancedSecurityAuditService.logRLSViolation('profiles', 'INSERT', { error: error.message });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to create user profile:', error);
      throw error;
    }
  }

  static async updateUserProfile(updates: Record<string, any>): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated to update profile');
      }

      await EnhancedSecurityAuditService.logDataAccessEvent('profiles', 'UPDATE', 1);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id) // RLS will ensure user can only update their own profile
        .select()
        .single();

      if (error) {
        await EnhancedSecurityAuditService.logRLSViolation('profiles', 'UPDATE', { error: error.message });
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  static async getUserProfile(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        await EnhancedSecurityAuditService.logRLSViolation('profiles', 'SELECT', { error: error.message });
        throw error;
      }

      if (data) {
        await EnhancedSecurityAuditService.logDataAccessEvent('profiles', 'SELECT', 1);
      }

      return data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }
}

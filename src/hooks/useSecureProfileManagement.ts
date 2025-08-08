
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SecureUserDataService } from '@/services/secureUserDataService';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  recovery_start_date?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export const useSecureProfileManagement = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | _null>(_null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadProfile = async () => {
    if (!user) {
      setProfile(_null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const _profileData = await SecureUserDataService.getUserProfile();
      setProfile(_profileData);
    } catch (error) {
      console.error('Failed to load profile:', error);
      await EnhancedSecurityAuditService.logSecurityViolation('PROFILE_LOAD_FAILED', {
        error: error.message,
        _user_id: user.id
      });
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      toast.error('Must be logged in to update profile');
      return false;
    }

    try {
      setUpdating(true);
      const _updatedProfile = await SecureUserDataService.updateUserProfile(updates);
      setProfile(_updatedProfile);
      
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'PROFILE_UPDATED',
        _severity: 'low',
        _details: {
          fields_updated: Object.keys(updates),
          _user_id: user.id
        }
      });
      
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update profile:', error);
      await EnhancedSecurityAuditService.logSecurityViolation('PROFILE_UPDATE_FAILED', {
        error: error.message,
        _user_id: user.id,
        _attempted_updates: Object.keys(updates)
      });
      toast.error('Failed to update profile');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const createProfile = async (_profileData: {
    full_name?: string;
    recovery_start_date?: string;
    timezone?: string;
  }) => {
    if (!user) {
      toast.error('Must be logged in to create profile');
      return false;
    }

    try {
      setUpdating(true);
      const _newProfile = await SecureUserDataService.createUserProfile(_profileData);
      setProfile(_newProfile);
      
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'PROFILE_CREATED',
        _severity: 'low',
        _details: {
          _user_id: user.id
        }
      });
      
      toast.success('Profile created successfully');
      return true;
    } catch (error) {
      console.error('Failed to create profile:', error);
      await EnhancedSecurityAuditService.logSecurityViolation('PROFILE_CREATION_FAILED', {
        error: error.message,
        _user_id: user.id
      });
      toast.error('Failed to create profile');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  return {
    profile,
    loading,
    updating,
    updateProfile,
    createProfile,
    refreshProfile: loadProfile
  };
};

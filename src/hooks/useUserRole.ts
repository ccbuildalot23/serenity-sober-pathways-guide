// MVP Hook for User Role Management - Requirement #1: Three-user permission system

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/userRoles';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityAuditService } from '@/services/enhancedSecurityAuditService';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const determineUserRole = async () => {
      setLoading(true);
      
      try {
        if (user?.id) {
          // Query the database for the user's role using the secure function
          const { data, error } = await supabase.rpc('get_current_user_role');
          
          if (error) {
            console.error('Error fetching user role:', error);
            await EnhancedSecurityAuditService.logSecurityViolation('ROLE_FETCH_FAILED', {
              error: error.message,
              user_id: user.id
            });
            setRole('patient'); // Safe default
          } else if (data) {
            setRole(data as UserRole);
            await EnhancedSecurityAuditService.logDataAccessEvent('user_roles', 'SELECT', 1);
          } else {
            // No role found, default to patient
            setRole('patient');
          }
        } else {
          setRole('patient');
        }
      } catch (error) {
        console.error('Error determining user role:', error);
        await EnhancedSecurityAuditService.logSecurityViolation('ROLE_DETERMINATION_FAILED', {
          error: error.message,
          user_id: user?.id
        });
        setRole('patient'); // Safe default
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      determineUserRole();
    } else {
      setLoading(false);
    }
  }, [user]);

  const switchRole = async (newRole: UserRole) => {
    // SECURITY: Role switching should only be allowed for authorized users
    // This is disabled in production for security
    if (import.meta.env.DEV) {
      setRole(newRole);
      localStorage.setItem('mvp_user_role', newRole);
      
      if (user) {
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'ROLE_SWITCH_ATTEMPTED',
          severity: 'medium',
          details: {
            from_role: role,
            to_role: newRole,
            user_id: user.id,
            environment: 'development'
          }
        });
      }
    } else {
      console.warn('Role switching is disabled in production for security');
    }
  };

  return {
    role,
    loading,
    switchRole,
    isPatient: role === 'patient',
    isProvider: role === 'provider',
    isSupportMember: role === 'support_member'
  };
};
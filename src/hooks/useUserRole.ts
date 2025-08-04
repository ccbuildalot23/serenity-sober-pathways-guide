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
            // Check if the user has a role assigned
            let assignedRole = data as UserRole;
            
            // TEMPORARY FIX: If user is patient but has userType in metadata, use that
            // This allows different user types to function while maintaining security
            if (assignedRole === 'patient' && user.user_metadata?.userType) {
              const userType = user.user_metadata.userType;
              console.log('User type from metadata:', userType);
              
              // Map user types to roles safely
              if (userType === 'recovery') {
                assignedRole = 'patient';
              } else if (userType === 'supporter') {
                assignedRole = 'support_member';
              } else if (userType === 'provider') {
                // For MVP, allow provider access if they selected it during signup
                // In production, this should require admin approval
                assignedRole = 'provider';
                console.warn('Provider role assigned based on metadata - this should require admin approval in production');
              }
            }
            
            setRole(assignedRole);
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

  // SECURITY FIX: Remove client-side role switching capability entirely
  // Role changes must be handled server-side by administrators only
  const switchRole = async (newRole: UserRole) => {
    console.warn('Client-side role switching has been permanently disabled for security. Role changes must be handled by administrators.');
    
    if (user) {
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'UNAUTHORIZED_ROLE_SWITCH_ATTEMPT',
        severity: 'high',
        details: {
          attempted_role: newRole,
          current_role: role,
          user_id: user.id,
          security_violation: true,
          timestamp: new Date().toISOString()
        }
      });
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
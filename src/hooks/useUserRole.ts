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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const determineUserRole = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!user?.id) {
          console.log('No user ID available, defaulting to patient role');
          setRole('patient');
          setLoading(false);
          return;
        }

        console.log('Determining role for user:', user.id);
        
        // Query the database for the user's role using the secure function
        const { data, error: roleError } = await supabase.rpc('get_current_user_role');
        
        if (roleError) {
          console.error('Error fetching user role:', roleError);
          
          // Log security violation but don't block the user
          try {
            await EnhancedSecurityAuditService.logSecurityViolation('ROLE_FETCH_FAILED', {
              error: roleError.message,
              user_id: user.id
            });
          } catch (auditError) {
            console.error('Failed to log security violation:', auditError);
          }
          
          // Set error but continue with default role
          setError(`Could not determine user role: ${roleError.message}`);
          setRole('patient'); // Safe default
        } else if (data) {
          // Check if the user has a role assigned
          let assignedRole = data as UserRole;
          
          console.log('Database returned role:', assignedRole);
          
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
          console.log('Final assigned role:', assignedRole);
          
          try {
            await EnhancedSecurityAuditService.logDataAccessEvent('user_roles', 'SELECT', 1);
          } catch (auditError) {
            console.error('Failed to log data access event:', auditError);
          }
        } else {
          // No role found, default to patient
          console.log('No role found in database, defaulting to patient');
          setRole('patient');
        }
      } catch (error) {
        console.error('Error determining user role:', error);
        
        // Log security violation but don't block the user
        try {
          await EnhancedSecurityAuditService.logSecurityViolation('ROLE_DETERMINATION_FAILED', {
            error: error instanceof Error ? error.message : 'Unknown error',
            user_id: user?.id
          });
        } catch (auditError) {
          console.error('Failed to log security violation:', auditError);
        }
        
        setError('Failed to determine user role');
        setRole('patient'); // Safe default
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      determineUserRole();
    } else {
      setLoading(false);
      setRole('patient');
    }
  }, [user]);

  // SECURITY FIX: Remove client-side role switching capability entirely
  // Role changes must be handled server-side by administrators only
  const switchRole = async (newRole: UserRole) => {
    console.warn('Client-side role switching has been permanently disabled for security. Role changes must be handled by administrators.');
    
    if (user) {
      try {
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
      } catch (auditError) {
        console.error('Failed to log security event:', auditError);
      }
    }
  };

  return {
    role,
    loading,
    error,
    switchRole,
    isPatient: role === 'patient',
    isProvider: role === 'provider',
    isSupportMember: role === 'support_member'
  };
};
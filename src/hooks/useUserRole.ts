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
            
            // Check if it's a missing function error
            if (error.message?.includes('function') || error.code === '42883') {
              console.warn('Database function get_current_user_role not found, attempting direct query');
              
              // Try direct query as fallback
              const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .single();
              
              if (roleError && roleError.code !== 'PGRST116') {
                console.error('Direct role query failed:', roleError);
                // Try to auto-assign patient role
                const { error: insertError } = await supabase
                  .from('user_roles')
                  .insert({ user_id: user.id, role: 'patient' });
                
                if (!insertError) {
                  console.log('Auto-assigned patient role to user');
                  setRole('patient');
                } else {
                  console.error('Failed to auto-assign role:', insertError);
                  setRole('patient'); // Still default to patient
                }
              } else if (roleData) {
                setRole(roleData.role as UserRole);
              } else {
                // No role found, auto-assign patient
                const { error: insertError } = await supabase
                  .from('user_roles')
                  .insert({ user_id: user.id, role: 'patient' });
                
                if (!insertError) {
                  console.log('Auto-assigned patient role to user');
                }
                setRole('patient');
              }
            } else {
              // Other errors, log and default to patient
              await EnhancedSecurityAuditService.logSecurityViolation('ROLE_FETCH_FAILED', {
                error: error.message,
                user_id: user.id
              });
              setRole('patient');
            }
          } else if (data) {
            setRole(data as UserRole);
            await EnhancedSecurityAuditService.logDataAccessEvent('user_roles', 'SELECT', 1);
          } else {
            // No role found, auto-assign patient
            console.log('No role found for user, auto-assigning patient role');
            const { error: insertError } = await supabase
              .from('user_roles')
              .insert({ user_id: user.id, role: 'patient' });
            
            if (!insertError) {
              console.log('Auto-assigned patient role to user');
            }
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
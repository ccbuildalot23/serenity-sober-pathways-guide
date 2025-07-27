// MVP Hook for User Role Management - Requirement #1: Three-user permission system

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/userRoles';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const determineUserRole = async () => {
      setLoading(true);
      
      try {
        // MVP: Simple role determination based on email domain
        // In production, this would query the database
        if (user?.email) {
          if (user.email.includes('@provider.') || user.email.includes('@clinic.') || user.email.includes('@hospital.')) {
            setRole('provider');
          } else if (user.email.includes('@support.') || user.email.includes('@family.')) {
            setRole('support_member');
          } else {
            setRole('patient');
          }
        } else {
          // Default to patient for MVP
          setRole('patient');
        }
      } catch (error) {
        console.error('Error determining user role:', error);
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

  const switchRole = (newRole: UserRole) => {
    // MVP: Allow role switching for testing
    // In production, this would require proper authorization
    setRole(newRole);
    localStorage.setItem('mvp_user_role', newRole);
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
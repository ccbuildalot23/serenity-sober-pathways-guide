// Simplified User Role Management

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/userRoles';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('patient');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const determineUserRole = () => {
      setLoading(true);
      
      if (!user) {
        setRole('patient');
        setLoading(false);
        return;
      }

      // Simple role determination from user metadata
      // This was set during signup and stored in Supabase
      const userType = user.user_metadata?.userType || 'recovery';
      
      let assignedRole: UserRole = 'patient';
      
      switch(userType) {
        case 'recovery':
          assignedRole = 'patient';
          break;
        case 'supporter':
          assignedRole = 'support_member';
          break;
        case 'provider':
          assignedRole = 'provider';
          break;
        default:
          assignedRole = 'patient';
      }
      
      console.log(`User role determined: ${assignedRole} (from userType: ${userType})`);
      setRole(assignedRole);
      setLoading(false);
    };

    determineUserRole();
  }, [user]);

  // Simplified canAccess function
  const canAccess = (requiredRole: UserRole): boolean => {
    if (loading) return false;
    
    // Provider can access everything
    if (role === 'provider') return true;
    
    // Support member can access support and patient features
    if (role === 'support_member' && (requiredRole === 'support_member' || requiredRole === 'patient')) {
      return true;
    }
    
    // Patient can only access patient features
    return role === requiredRole;
  };

  // Simple switchRole for testing (disabled in production)
  const switchRole = (newRole: UserRole) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Switching role from ${role} to ${newRole} (dev only)`);
      setRole(newRole);
    }
  };

  return {
    role,
    loading,
    error: null, // Removed error state for simplicity
    canAccess,
    switchRole
  };
};
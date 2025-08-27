// Simplified User Role Management

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/userRoles';
import logger from '../services/loggerService';

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
      
      let _assignedRole: UserRole = 'patient';
      
      switch(userType) {
        case 'recovery':
          _assignedRole = 'patient';
          break;
        case 'supporter':
          _assignedRole = 'support_member';
          break;
        case 'provider':
          _assignedRole = 'provider';
          break;
        case 'admin':
          _assignedRole = 'admin';
          break;
        default:
          _assignedRole = 'patient';
      }
      
      logger.debug(`User role determined: ${_assignedRole} (from userType: ${userType}, { component: 'useUserRole' });`);
      setRole(_assignedRole);
      setLoading(false);
    };

    determineUserRole();
  }, [user]);

  // Simplified canAccess function
  const canAccess = (requiredRole: UserRole): boolean => {
    if (loading) return false;
    
    // Admin can access everything
    if (role === 'admin') return true;
    
    // Provider can access everything except admin
    if (role === 'provider' && requiredRole !== 'admin') return true;
    
    // Support member can access support and patient features
    if (role === 'support_member' && (requiredRole === 'support_member' || requiredRole === 'patient')) {
      return true;
    }
    
    // Patient can only access patient features
    return role === requiredRole;
  };

  // Simple switchRole for testing (disabled in production)
  const switchRole = (_newRole: UserRole) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Switching role from ${role} to ${_newRole} (dev only, { component: 'useUserRole' });`);
      setRole(_newRole);
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
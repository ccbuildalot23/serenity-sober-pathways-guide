import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requiredRole, 
  redirectTo = '/auth' 
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Check for token in localStorage
    const token = localStorage.getItem('auth_token');
    if (!token && !loading) {
      // No token, redirect to login
      window.location.href = redirectTo;
    }
  }, [loading, redirectTo]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-serenity-accent" />
      </div>
    );
  }

  // Check authentication
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRole) {
    const userRole = user.user_metadata?.userType || 'patient';
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!allowedRoles.includes(userRole)) {
      // Redirect to appropriate dashboard based on role
      const roleRedirects: Record<string, string> = {
        patient: '/patient/dashboard',
        provider: '/provider/dashboard',
        supporter: '/supporter/dashboard',
        admin: '/admin/dashboard'
      };
      
      return <Navigate to={roleRedirects[userRole] || '/patient/dashboard'} replace />;
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

// Public route wrapper - redirects to dashboard if already authenticated
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-serenity-accent" />
      </div>
    );
  }

  if (user) {
    const userRole = user.user_metadata?.userType || 'patient';
    const dashboardRoutes: Record<string, string> = {
      patient: '/patient/dashboard',
      provider: '/provider/dashboard',
      supporter: '/supporter/dashboard',
      admin: '/admin/dashboard'
    };
    
    return <Navigate to={dashboardRoutes[userRole] || '/patient/dashboard'} replace />;
  }

  return <>{children}</>;
}
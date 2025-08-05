// Dashboard Router - Routes users to appropriate dashboard based on role

import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import PatientDashboard from '@/pages/PatientDashboard';
import SupportDashboard from '@/pages/SupportDashboard';
import ProviderDashboard from '@/pages/ProviderDashboard';
import SupporterDashboard from '@/components/supporter/SupporterDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const DashboardRouter = () => {
  const { role, loading, error } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state but still allow access to dashboard
  if (error) {
    console.warn('Role determination error:', error);
  }

  // Route based on determined role
  switch (role) {
    case 'patient':
      return (
        <>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error} - You're being shown the patient dashboard as a fallback.
              </AlertDescription>
            </Alert>
          )}
          <PatientDashboard />
        </>
      );
    case 'support_member':
      return (
        <>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error} - You're being shown the supporter dashboard as a fallback.
              </AlertDescription>
            </Alert>
          )}
          <SupporterDashboard />
        </>
      );
    case 'provider':
      return (
        <>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error} - You're being shown the provider dashboard as a fallback.
              </AlertDescription>
            </Alert>
          )}
          <ProviderDashboard />
        </>
      );
    default:
      // Fallback to patient dashboard for any unknown roles
      return (
        <>
          <Alert className="mb-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unknown user role: {role}. You're being shown the patient dashboard as a fallback.
            </AlertDescription>
          </Alert>
          <PatientDashboard />
        </>
      );
  }
};

export default DashboardRouter;
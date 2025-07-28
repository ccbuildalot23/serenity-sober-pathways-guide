// Dashboard Router - Routes users to appropriate dashboard based on role

import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import PatientDashboard from '@/pages/PatientDashboard';
import SupportDashboard from '@/pages/SupportDashboard';
import ProviderDashboard from '@/pages/ProviderDashboard';

const DashboardRouter = () => {
  const { role, loading } = useUserRole();

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

  switch (role) {
    case 'patient':
      return <PatientDashboard />;
    case 'support_member':
      return <SupportDashboard />;
    case 'provider':
      return <ProviderDashboard />;
    default:
      return <PatientDashboard />;
  }
};

export default DashboardRouter;
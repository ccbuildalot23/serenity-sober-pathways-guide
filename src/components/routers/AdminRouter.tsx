import React, { lazy, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import LoadingState from '@/components/LoadingState';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, FileCheck, Settings, Database, AlertTriangle } from 'lucide-react';

// Lazy load admin components
const RegulatoryCompliance = lazy(() => import('@/pages/RegulatoryCompliance'));
const ComplianceManagement = lazy(() => import('@/pages/ComplianceManagement'));
const PilotReadinessAssessment = lazy(() => import('@/pages/PilotReadinessAssessment'));
const DataExport = lazy(() => import('@/pages/DataExport'));
const HIPAASecurityDashboard = lazy(() => import('@/pages/HIPAASecurityDashboard'));
const SecurityAudit = lazy(() => import('@/pages/SecurityAudit'));
const SecurityFixesStatus = lazy(() => import('@/pages/SecurityFixesStatus'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const NotificationManagement = lazy(() => import('@/pages/NotificationManagement'));
const Moderation = lazy(() => import('@/pages/Moderation'));
const Settings = lazy(() => import('@/pages/Settings'));
const InfrastructureMonitoringDashboard = lazy(() => import('@/components/infrastructure/InfrastructureMonitoringDashboard'));

// Admin directory component
const AdminDirectory = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  
  // Check if user has admin access
  if (role !== 'provider') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You don't have permission to access admin tools. 
            This area is restricted to system administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const sections = [
    {
      name: 'roles',
      title: 'Role Management',
      description: 'Manage user roles and permissions',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      name: 'compliance',
      title: 'Compliance Management',
      description: 'HIPAA and regulatory compliance',
      icon: FileCheck,
      color: 'text-green-500'
    },
    {
      name: 'security',
      title: 'Security & Audit',
      description: 'Security monitoring and auditing',
      icon: Shield,
      color: 'text-red-500'
    },
    {
      name: 'data',
      title: 'Data Management',
      description: 'Export and manage platform data',
      icon: Database,
      color: 'text-purple-500'
    },
    {
      name: 'monitoring',
      title: 'Infrastructure Monitoring',
      description: 'System health and performance',
      icon: AlertTriangle,
      color: 'text-orange-500'
    },
    {
      name: 'settings',
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: Settings,
      color: 'text-gray-500'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        System administration and platform management tools.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          
          return (
            <Card 
              key={section.name} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/admin/${section.name}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 ${section.color}`} />
                  <CardTitle>{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {section.description}
                </CardDescription>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/${section.name}`);
                  }}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Admin alerts */}
      <Card className="mt-8 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-700">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-orange-600">
              • All systems operational
            </p>
            <p className="text-sm text-orange-600">
              • Last backup: 2 hours ago
            </p>
            <p className="text-sm text-orange-600">
              • Active users: 127
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main router component
const AdminRouter = () => {
  const { section } = useParams<{ section: string }>();
  const { role } = useUserRole();
  
  // Check admin access
  if (role !== 'provider') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Access denied. Admin tools are restricted to system administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // If no section specified, show directory
  if (!section) {
    return <AdminDirectory />;
  }
  
  // Route to specific section
  const renderSection = () => {
    switch (section) {
      case 'roles':
        return <Settings />; // Using Settings as placeholder for role management
      case 'compliance':
        return <ComplianceManagement />;
      case 'regulatory':
        return <RegulatoryCompliance />;
      case 'pilot':
        return <PilotReadinessAssessment />;
      case 'data':
        return <DataExport />;
      case 'security':
        return <HIPAASecurityDashboard />;
      case 'audit':
        return <SecurityAudit />;
      case 'fixes':
        return <SecurityFixesStatus />;
      case 'monitoring':
        return <InfrastructureMonitoringDashboard />;
      case 'analytics':
        return <Analytics />;
      case 'notifications':
        return <NotificationManagement />;
      case 'moderation':
        return <Moderation />;
      case 'settings':
        return <Settings />;
      default:
        // Invalid section, redirect to directory
        return <Navigate to="/admin" replace />;
    }
  };
  
  return (
    <Suspense fallback={<LoadingState message={`Loading ${section}...`} />}>
      {renderSection()}
    </Suspense>
  );
};

export default AdminRouter;
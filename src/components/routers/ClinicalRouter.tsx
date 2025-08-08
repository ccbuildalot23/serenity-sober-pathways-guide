import React, { lazy, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import LoadingState from '@/components/LoadingState';
import { useUserRole } from '@/hooks/useUserRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, Stethoscope, Phone, Users, Briefcase } from 'lucide-react';

// Lazy load clinical components
const ClinicalProtocols = lazy(() => import('@/pages/ClinicalProtocols'));
const CrisisIntervention = lazy(() => import('@/pages/CrisisIntervention'));
const MobileCrisis = lazy(() => import('@/pages/MobileCrisis'));
const PeerSupervision = lazy(() => import('@/pages/PeerSupervision'));
const PracticeManagement = lazy(() => import('@/pages/PracticeManagement'));

// Clinical directory component
const ClinicalDirectory = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  
  // Check if user has access
  if (role !== 'provider' && role !== 'support_member') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You don't have permission to access clinical tools. 
            This area is restricted to healthcare providers and support members.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const modules = [
    {
      name: 'protocols',
      title: 'Clinical Protocols',
      description: 'Evidence-based treatment protocols',
      icon: FileText,
      color: 'text-blue-500',
      requiredRole: 'provider'
    },
    {
      name: 'intervention',
      title: 'Crisis Intervention',
      description: 'Emergency intervention procedures',
      icon: Stethoscope,
      color: 'text-red-500',
      requiredRole: 'provider'
    },
    {
      name: 'mobile-crisis',
      title: 'Mobile Crisis Response',
      description: 'Mobile crisis team coordination',
      icon: Phone,
      color: 'text-purple-500',
      requiredRole: 'provider'
    },
    {
      name: 'supervision',
      title: 'Peer Supervision',
      description: 'Clinical supervision and mentoring',
      icon: Users,
      color: 'text-green-500',
      requiredRole: 'provider'
    },
    {
      name: 'practice',
      title: 'Practice Management',
      description: 'Manage your clinical practice',
      icon: Briefcase,
      color: 'text-indigo-500',
      requiredRole: 'provider'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Clinical Tools</h1>
      <p className="text-muted-foreground mb-8">
        Professional tools for healthcare providers and clinical support staff.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          const hasAccess = role === 'provider' || 
            (role === 'support_member' && module.requiredRole !== 'provider');
          
          return (
            <Card 
              key={module.name} 
              className={`transition-shadow ${hasAccess ? 'hover:shadow-lg cursor-pointer' : 'opacity-50'}`}
              onClick={() => hasAccess && navigate(`/clinical/${module.name}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 ${module.color}`} />
                  <CardTitle>{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {module.description}
                </CardDescription>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={!hasAccess}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasAccess) navigate(`/clinical/${module.name}`);
                  }}
                >
                  {hasAccess ? 'Open Module' : 'Provider Only'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Main router component
const ClinicalRouter = () => {
  const { module } = useParams<{ module: string }>();
  const { role } = useUserRole();
  
  // Check base access
  if (role !== 'provider' && role !== 'support_member') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Access denied. Clinical tools are restricted to healthcare providers.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // If no module specified, show directory
  if (!module) {
    return <ClinicalDirectory />;
  }
  
  // Route to specific module
  const renderModule = () => {
    switch (module) {
      case 'protocols':
        return <ClinicalProtocols />;
      case 'intervention':
        return <CrisisIntervention />;
      case 'mobile-crisis':
        return <MobileCrisis />;
      case 'supervision':
        return <PeerSupervision />;
      case 'practice':
        return <PracticeManagement />;
      default:
        // Invalid module, redirect to directory
        return <Navigate to="/clinical" replace />;
    }
  };
  
  return (
    <Suspense fallback={<LoadingState message={`Loading ${module} module...`} />}>
      {renderModule()}
    </Suspense>
  );
};

export default ClinicalRouter;
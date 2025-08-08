import React, { lazy, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import LoadingState from '@/components/LoadingState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, AlertCircle, HeartHandshake, Phone } from 'lucide-react';

// Lazy load support components
const PeerSupport = lazy(() => import('@/pages/PeerSupport'));
const CrisisSupport = lazy(() => import('@/pages/CrisisSupport'));
const ComprehensiveSupportPage = lazy(() => import('@/pages/ComprehensiveSupportPage'));
const VoiceSupport = lazy(() => import('@/pages/VoiceSupport'));
const Community = lazy(() => import('@/pages/Community'));

// Support directory component
const SupportDirectory = () => {
  const navigate = useNavigate();
  
  const supportTypes = [
    {
      name: 'peer',
      title: 'Peer Support',
      description: 'Connect with others in recovery',
      icon: MessageCircle,
      color: 'text-blue-500'
    },
    {
      name: 'crisis',
      title: 'Crisis Support',
      description: '24/7 crisis intervention resources',
      icon: AlertCircle,
      color: 'text-red-500'
    },
    {
      name: 'comprehensive',
      title: 'Comprehensive Support',
      description: 'Full spectrum recovery support',
      icon: HeartHandshake,
      color: 'text-green-500'
    },
    {
      name: 'voice',
      title: 'Voice Support',
      description: 'Talk with support specialists',
      icon: Phone,
      color: 'text-purple-500'
    },
    {
      name: 'community',
      title: 'Community Forums',
      description: 'Join recovery community discussions',
      icon: MessageCircle,
      color: 'text-indigo-500'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Support Services</h1>
      <p className="text-muted-foreground mb-8">
        Find the support you need, when you need it. We're here for you 24/7.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {supportTypes.map((support) => {
          const Icon = support.icon;
          return (
            <Card 
              key={support.name} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/support/${support.name}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 ${support.color}`} />
                  <CardTitle>{support.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {support.description}
                </CardDescription>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/support/${support.name}`);
                  }}
                >
                  Access Support
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Emergency banner */}
      <Card className="mt-8 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Need Immediate Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">
            If you're experiencing a crisis or emergency, please reach out immediately.
          </p>
          <div className="flex gap-4">
            <Button 
              variant="destructive"
              onClick={() => navigate('/crisis-help')}
            >
              Crisis Help
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/support/crisis')}
            >
              Crisis Resources
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main router component
const SupportRouter = () => {
  const { type } = useParams<{ type: string }>();
  
  // If no type specified, show directory
  if (!type) {
    return <SupportDirectory />;
  }
  
  // Route to specific support type
  const renderSupport = () => {
    switch (type) {
      case 'peer':
        return <PeerSupport />;
      case 'crisis':
        return <CrisisSupport />;
      case 'comprehensive':
        return <ComprehensiveSupportPage />;
      case 'voice':
        return <VoiceSupport />;
      case 'community':
        return <Community />;
      default:
        // Invalid type, redirect to directory
        return <Navigate to="/support" replace />;
    }
  };
  
  return (
    <Suspense fallback={<LoadingState message={`Loading ${type} support...`} />}>
      {renderSupport()}
    </Suspense>
  );
};

export default SupportRouter;
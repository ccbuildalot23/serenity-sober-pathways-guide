import React, { lazy, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import LoadingState from '@/components/LoadingState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Target, Users, Calendar, Shield } from 'lucide-react';

// Lazy load tools for better performance
const Motivation = lazy(() => import('@/pages/Motivation'));
const AccountabilityPartners = lazy(() => import('@/pages/AccountabilityPartners'));
const RecoveryPlanning = lazy(() => import('@/pages/RecoveryPlanning'));
const RecoveryStrengthPage = lazy(() => import('@/pages/RecoveryStrengthening'));

// Tools directory component
const ToolsDirectory = () => {
  const navigate = useNavigate();
  
  const tools = [
    {
      name: 'motivation',
      title: 'Motivation Tools',
      description: 'Daily inspiration and goal tracking',
      icon: Target,
      color: 'text-blue-500'
    },
    {
      name: 'accountability',
      title: 'Accountability Partners',
      description: 'Connect with your support network',
      icon: Users,
      color: 'text-green-500'
    },
    {
      name: 'planning',
      title: 'Recovery Planning',
      description: 'Create and track your recovery plan',
      icon: Calendar,
      color: 'text-purple-500'
    },
    {
      name: 'recovery-strengthening',
      title: 'Recovery Strengthening',
      description: 'Tools to strengthen your recovery',
      icon: Shield,
      color: 'text-red-500'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Recovery Tools</h1>
      <p className="text-muted-foreground mb-8">
        Choose from our comprehensive suite of recovery tools designed to support your journey.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card 
              key={tool.name} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/tools/${tool.name}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 ${tool.color}`} />
                  <CardTitle>{tool.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  {tool.description}
                </CardDescription>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/tools/${tool.name}`);
                  }}
                >
                  Open Tool
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
const ToolsRouter = () => {
  const { toolName } = useParams<{ toolName: string }>();
  
  // If no tool specified, show directory
  if (!toolName) {
    return <ToolsDirectory />;
  }
  
  // Route to specific tool
  const renderTool = () => {
    switch (toolName) {
      case 'motivation':
        return <Motivation />;
      case 'accountability':
        return <AccountabilityPartners />;
      case 'planning':
        return <RecoveryPlanning />;
      case 'recovery-strengthening':
        return <RecoveryStrengthPage />;
      default:
        // Invalid tool name, redirect to directory
        return <Navigate to="/tools" replace />;
    }
  };
  
  return (
    <Suspense fallback={<LoadingState message={`Loading ${toolName} tool...`} />}>
      {renderTool()}
    </Suspense>
  );
};

export default ToolsRouter;
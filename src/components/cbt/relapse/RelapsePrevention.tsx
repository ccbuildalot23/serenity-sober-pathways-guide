
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, Users, BookOpen } from 'lucide-react';

const RelapsePrevention: React.FC = () => {
  const [activeModule, setActiveModule] = useState('mapping');

  const modules = [
    {
      id: 'mapping',
      title: 'High-Risk Situation Mapper',
      description: 'Identify triggers: people, places, things, emotions, and times',
      icon: MapPin,
      difficulty: 'Intermediate',
      duration: '20-30 min'
    },
    {
      id: 'action-plan',
      title: 'Emergency Action Plan',
      description: 'Build comprehensive crisis response strategies',
      icon: AlertTriangle,
      difficulty: 'Advanced',
      duration: '30-45 min'
    },
    {
      id: 'network',
      title: 'Support Network Visualizer',
      description: 'Map your recovery support system and contact methods',
      icon: Users,
      difficulty: 'Beginner',
      duration: '15-20 min'
    },
    {
      id: 'journal',
      title: 'Recovery Story Journal',
      description: 'Reflect on your journey with guided prompts',
      icon: BookOpen,
      difficulty: 'Beginner',
      duration: '10-30 min'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold serenity-navy mb-2">
          Relapse Prevention Mastery
        </h2>
        <p className="text-gray-600">
          Identify triggers and build comprehensive prevention strategies
        </p>
      </div>

      {/* Module Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {modules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Card
              key={module.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeModule === module.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveModule(module.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {module.difficulty}
                        </Badge>
                        <span className="text-xs text-gray-500">{module.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Content placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>
            {modules.find(mod => mod.id === activeModule)?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-8">
            Relapse prevention content would be implemented here with interactive
            mapping tools, action plan builders, and progress tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelapsePrevention;


import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Shield, Eye, Handshake } from 'lucide-react';

const CommunicationSkills: React.FC = () => {
  const [activeModule, setActiveModule] = useState('assertiveness');

  const modules = [
    {
      id: 'assertiveness',
      title: 'Assertiveness Training Simulator',
      description: 'Practice assertive communication with realistic scenarios',
      icon: MessageSquare,
      difficulty: 'Intermediate',
      duration: '15-25 min'
    },
    {
      id: 'boundaries',
      title: 'Boundary Setting Workshop',
      description: 'Learn to set healthy boundaries with practice scripts',
      icon: Shield,
      difficulty: 'Intermediate',
      duration: '20-30 min'
    },
    {
      id: 'disclosure',
      title: 'Recovery Disclosure Guide',
      description: 'Navigate sharing your recovery story in different situations',
      icon: Eye,
      difficulty: 'Advanced',
      duration: '15-20 min'
    },
    {
      id: 'conflict',
      title: 'Conflict Resolution Toolkit',
      description: 'Healthy strategies for managing disagreements',
      icon: Handshake,
      difficulty: 'Intermediate',
      duration: '20-30 min'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold serenity-navy mb-2">
          Communication Skills Academy
        </h2>
        <p className="text-gray-600">
          Practice assertiveness, boundaries, and healthy relationships
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
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-yellow-600" />
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
            Communication skills training would be implemented here with
            interactive scenarios, practice exercises, and skill assessment tools.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunicationSkills;

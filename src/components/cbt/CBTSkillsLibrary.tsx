
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Calendar, Heart, Shield, Users, Trophy } from 'lucide-react';
import CognitiveRestructuring from './cognitive/CognitiveRestructuring';
import BehavioralActivation from './behavioral/BehavioralActivation';
import MindfulnessTraining from './mindfulness/MindfulnessTraining';
import RelapsePrevention from './relapse/RelapsePrevention';
import CommunicationSkills from './communication/CommunicationSkills';
import LearningProgress from './progress/LearningProgress';

interface SkillModule {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  progress: number;
  badgesEarned: number;
  totalBadges: number;
  color: string;
}

const CBTSkillsLibrary: React.FC = () => {
  const [activeModule, setActiveModule] = useState('cognitive');

  const skillModules: SkillModule[] = [
    {
      id: 'cognitive',
      title: 'Cognitive Restructuring',
      description: 'Master thought patterns and overcome cognitive distortions',
      icon: Brain,
      progress: 65,
      badgesEarned: 3,
      totalBadges: 8,
      color: 'bg-blue-500'
    },
    {
      id: 'behavioral',
      title: 'Behavioral Activation',
      description: 'Build healthy habits and meaningful activity scheduling',
      icon: Calendar,
      progress: 45,
      badgesEarned: 2,
      totalBadges: 6,
      color: 'bg-green-500'
    },
    {
      id: 'mindfulness',
      title: 'Mindfulness & Distress Tolerance',
      description: 'Develop present-moment awareness and crisis coping skills',
      icon: Heart,
      progress: 30,
      badgesEarned: 1,
      totalBadges: 7,
      color: 'bg-purple-500'
    },
    {
      id: 'relapse',
      title: 'Relapse Prevention',
      description: 'Identify triggers and build comprehensive prevention strategies',
      icon: Shield,
      progress: 20,
      badgesEarned: 1,
      totalBadges: 5,
      color: 'bg-red-500'
    },
    {
      id: 'communication',
      title: 'Communication Skills',
      description: 'Practice assertiveness, boundaries, and healthy relationships',
      icon: Users,
      progress: 55,
      badgesEarned: 2,
      totalBadges: 6,
      color: 'bg-yellow-500'
    }
  ];

  const totalProgress = Math.round(
    skillModules.reduce((sum, module) => sum + module.progress, 0) / skillModules.length
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold serenity-navy mb-2">
          CBT Skills Training Library
        </h1>
        <p className="text-gray-600 mb-4">
          Evidence-based tools for cognitive behavioral therapy and recovery
        </p>
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium">Overall Progress: {totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="w-32" />
        </div>
      </div>

      {/* Module Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {skillModules.map((module) => {
          const IconComponent = module.icon;
          return (
            <Card
              key={module.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                activeModule === module.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveModule(module.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="secondary">
                    {module.badgesEarned}/{module.totalBadges} badges
                  </Badge>
                </div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{module.progress}%</span>
                  </div>
                  <Progress value={module.progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Module Content */}
      <Tabs value={activeModule} onValueChange={setActiveModule}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="cognitive">Cognitive</TabsTrigger>
          <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
          <TabsTrigger value="mindfulness">Mindfulness</TabsTrigger>
          <TabsTrigger value="relapse">Relapse</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="cognitive" className="mt-6">
          <CognitiveRestructuring />
        </TabsContent>

        <TabsContent value="behavioral" className="mt-6">
          <BehavioralActivation />
        </TabsContent>

        <TabsContent value="mindfulness" className="mt-6">
          <MindfulnessTraining />
        </TabsContent>

        <TabsContent value="relapse" className="mt-6">
          <RelapsePrevention />
        </TabsContent>

        <TabsContent value="communication" className="mt-6">
          <CommunicationSkills />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <LearningProgress modules={skillModules} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CBTSkillsLibrary;


import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, Heart, Sparkles } from 'lucide-react';
import ActivityScheduler from './ActivityScheduler';
import ActivityRating from './ActivityRating';
import SMARTGoals from './SMARTGoals';
import ValuesCardSort from './ValuesCardSort';

const BehavioralActivation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('scheduler');

  const tools = [
    {
      id: 'scheduler',
      title: 'Activity Scheduler',
      description: 'Plan meaningful activities using drag-and-drop calendar',
      icon: Calendar,
      difficulty: 'Beginner',
      duration: '15-30 min'
    },
    {
      id: 'rating',
      title: 'Activity Rating',
      description: 'Rate activities for mastery and pleasure to guide future planning',
      icon: Heart,
      difficulty: 'Beginner',
      duration: '5-10 min'
    },
    {
      id: 'goals',
      title: 'SMART Goals Wizard',
      description: 'Create specific, measurable goals focused on recovery',
      icon: Target,
      difficulty: 'Intermediate',
      duration: '20-30 min'
    },
    {
      id: 'values',
      title: 'Values Card Sort',
      description: 'Identify your core values to guide meaningful activities',
      icon: Sparkles,
      difficulty: 'Beginner',
      duration: '10-15 min'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold serenity-navy mb-2">
          Behavioral Activation Toolkit
        </h2>
        <p className="text-gray-600">
          Build healthy habits and schedule meaningful activities
        </p>
      </div>

      {/* Tool Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <Card
              key={tool.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeTab === tool.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveTab(tool.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {tool.difficulty}
                        </Badge>
                        <span className="text-xs text-gray-500">{tool.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {tool.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Tool Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
          <TabsTrigger value="rating">Rating</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduler" className="mt-6">
          <ActivityScheduler />
        </TabsContent>

        <TabsContent value="rating" className="mt-6">
          <ActivityRating />
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <SMARTGoals />
        </TabsContent>

        <TabsContent value="values" className="mt-6">
          <ValuesCardSort />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BehavioralActivation;

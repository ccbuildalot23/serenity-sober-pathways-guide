
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Brain, Thermometer, Zap } from 'lucide-react';

const MindfulnessTraining: React.FC = () => {
  const [activeExercise, setActiveExercise] = useState('meditation');

  const exercises = [
    {
      id: 'meditation',
      title: 'Guided Meditation Library',
      description: 'Progressive muscle relaxation, body scans, and breathing exercises',
      icon: Heart,
      difficulty: 'Beginner',
      duration: '5-30 min'
    },
    {
      id: 'tipp',
      title: 'TIPP Skills Trainer',
      description: 'Temperature, Intense exercise, Paced breathing, Paired relaxation',
      icon: Thermometer,
      difficulty: 'Intermediate',
      duration: '2-15 min'
    },
    {
      id: 'distraction',
      title: 'Distraction Tool Wheel',
      description: 'Healthy distraction techniques organized by category',
      icon: Brain,
      difficulty: 'Beginner',
      duration: '5-20 min'
    },
    {
      id: 'crisis',
      title: 'Crisis Tolerance Skills',
      description: 'Emergency coping strategies for intense emotions',
      icon: Zap,
      difficulty: 'Advanced',
      duration: '1-10 min'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold serenity-navy mb-2">
          Mindfulness & Distress Tolerance
        </h2>
        <p className="text-gray-600">
          Develop present-moment awareness and crisis coping skills
        </p>
      </div>

      {/* Exercise Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {exercises.map((exercise) => {
          const IconComponent = exercise.icon;
          return (
            <Card
              key={exercise.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeExercise === exercise.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setActiveExercise(exercise.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{exercise.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {exercise.difficulty}
                        </Badge>
                        <span className="text-xs text-gray-500">{exercise.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {exercise.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Content placeholder - in a real implementation, each would have full components */}
      <Card>
        <CardHeader>
          <CardTitle>
            {exercises.find(ex => ex.id === activeExercise)?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-8">
            Mindfulness training content would be implemented here with guided audio,
            interactive exercises, and progress tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MindfulnessTraining;

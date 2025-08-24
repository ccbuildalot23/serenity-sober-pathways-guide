import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Users, ArrowLeftRight } from 'lucide-react';
import ThoughtRecordBuilder from './ThoughtRecordBuilder';
import DistortionDetective from './DistortionDetective';
import FriendReframing from './FriendReframing';
import ThoughtComparison from './ThoughtComparison';

const CognitiveRestructuring: React.FC = () => {
  const [activeExercise, setActiveExercise] = useState('thought-record');

  const exercises = [
    {
      id: 'thought-record',
      title: 'Thought Record Builder',
      description: 'Track and analyze your automatic thoughts with structured guidance',
      icon: BookOpen,
      difficulty: 'Beginner',
      duration: '10-15 min',
      badge: 'Thought Tracker'
    },
    {
      id: 'distortion-detective',
      title: 'Cognitive Distortion Detective',
      description: 'Learn to identify and challenge thinking patterns that fuel distress',
      icon: Search,
      difficulty: 'Intermediate',
      duration: '15-20 min',
      badge: 'Pattern Detective'
    },
    {
      id: 'friend-reframing',
      title: 'Friend Perspective Exercise',
      description: 'Practice compassionate self-talk by imagining advice to a friend',
      icon: Users,
      difficulty: 'Beginner',
      duration: '5-10 min',
      badge: 'Compassionate Voice'
    },
    {
      id: 'thought-comparison',
      title: 'Side-by-Side Comparison',
      description: 'Compare unhelpful thoughts with balanced alternatives',
      icon: ArrowLeftRight,
      difficulty: 'Intermediate',
      duration: '10-15 min',
      badge: 'Balance Master'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold serenity-navy mb-2">
          Cognitive Restructuring Mastery
        </h2>
        <p className="text-gray-600">
          Learn to identify, challenge, and change unhelpful thinking patterns
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
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-blue-600" />
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
                  <Badge variant="secondary" className="text-xs">
                    {exercise.badge}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  {exercise.description}
                </CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Exercise Content */}
      <div className="bg-white rounded-lg border">
        {activeExercise === 'thought-record' && <ThoughtRecordBuilder />}
        {activeExercise === 'distortion-detective' && <DistortionDetective />}
        {activeExercise === 'friend-reframing' && <FriendReframing />}
        {activeExercise === 'thought-comparison' && <ThoughtComparison />}
      </div>
    </div>
  );
};

export default CognitiveRestructuring;

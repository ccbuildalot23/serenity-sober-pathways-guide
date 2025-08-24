import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Plus } from 'lucide-react';

export const RecoveryGoals: React.FC = () => {
  const mockGoals = [
    { id: 1, title: 'Daily Check-ins', progress: 70, category: 'wellness', priority: 'high' },
    { id: 2, title: 'Meditation Practice', progress: 40, category: 'mindfulness', priority: 'medium' },
    { id: 3, title: 'Exercise 3x Week', progress: 60, category: 'health', priority: 'high' }
  ];

  return (
    <Card className="animate-slide-up hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Recovery Goals
          <Badge variant="outline" className="ml-auto dark:border-gray-600 dark:text-gray-300">
            {mockGoals.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockGoals.map((goal, index) => (
            <div key={goal.id} className="space-y-2 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{goal.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                    {goal.category} • {goal.priority} priority
                  </p>
                </div>
                <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                  {goal.progress}%
                </Badge>
              </div>
              <div className="relative">
                <Progress value={goal.progress} className="h-2 bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" className="w-full mt-4 hover:scale-105 transition-transform dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" />
            Add New Goal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecoveryGoals;


import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';

interface WeeklyGoalsProps {
  goals: {
    completed: number;
    total: number;
  };
}

export const WeeklyGoals: React.FC<WeeklyGoalsProps> = ({ goals }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Weekly Goals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Complete daily check-ins</span>
            <Badge variant={goals.completed >= 3 ? "default" : "secondary"}>
              {goals.completed}/{goals.total}
            </Badge>
          </div>
          <Progress value={(goals.completed / goals.total) * 100} />
          <p className="text-sm text-gray-600">
            {goals.total - goals.completed} more to complete this week
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

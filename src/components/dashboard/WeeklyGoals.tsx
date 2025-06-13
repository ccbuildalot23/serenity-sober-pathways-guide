
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Plus } from 'lucide-react';
import { useRecoveryGoals } from '@/hooks/useRecoveryGoals';

export const WeeklyGoals: React.FC = () => {
  const { goals, loading, getActiveGoals, getGoalsNeedingAttention } = useRecoveryGoals();
  
  const activeGoals = getActiveGoals();
  const urgentGoals = getGoalsNeedingAttention();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recovery Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeGoals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recovery Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No active goals yet</p>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Goal
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Recovery Goals
          <Badge variant="outline" className="ml-auto">
            {activeGoals.length} Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {urgentGoals.length > 0 && (
            <div className="border-l-4 border-orange-500 pl-4 mb-4">
              <h4 className="font-medium text-orange-700 dark:text-orange-400 mb-2">
                Goals Needing Attention
              </h4>
              <div className="space-y-2">
                {urgentGoals.slice(0, 2).map((goal) => (
                  <div key={goal.id} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{goal.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {goal.progress}%
                      </Badge>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeGoals.slice(0, 3).map((goal) => (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{goal.title}</h4>
                  <p className="text-xs text-muted-foreground capitalize">
                    {goal.category} • {goal.priority} priority
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {goal.progress}%
                </Badge>
              </div>
              <Progress value={goal.progress} className="h-2" />
            </div>
          ))}
          
          {activeGoals.length > 3 && (
            <Button variant="ghost" size="sm" className="w-full">
              View All {activeGoals.length} Goals
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Calendar } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    streak: number;
    checkIns: number;
    goals: {
      completed: number;
      total: number;
    };
  };
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <TrendingUp className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
          <div className="text-2xl font-bold">{stats.streak}</div>
          <div className="text-sm text-gray-600">Day Streak</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <Calendar className="h-8 w-8 mx-auto text-blue-600 mb-2" />
          <div className="text-2xl font-bold">{stats.checkIns}</div>
          <div className="text-sm text-gray-600">Check-ins</div>
        </CardContent>
      </Card>
    </div>
  );
};

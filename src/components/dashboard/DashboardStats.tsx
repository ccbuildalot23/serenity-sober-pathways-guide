
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardStatsProps {
  stats: {
    streak: number;
    checkIns: number;
    goals: { completed: number; total: number };
  };
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-[#10B981]">{stats.streak}</div>
          <div className="text-sm text-gray-600">Day Streak</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-[#1E3A8A]">{stats.checkIns}</div>
          <div className="text-sm text-gray-600">Check-ins</div>
        </CardContent>
      </Card>
    </div>
  );
};

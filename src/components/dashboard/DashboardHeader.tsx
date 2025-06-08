
import React from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface DashboardHeaderProps {
  userEmail?: string;
  streak: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userEmail, streak }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="text-center flex-1">
        <h1 className="text-2xl font-bold text-[#1E3A8A]">
          Welcome back, {userEmail?.split('@')[0]}!
        </h1>
        <p className="text-gray-600">
          Today is day <span className="font-semibold text-[#10B981]">{streak}</span> of your journey
        </p>
      </div>
      <ThemeToggle />
    </div>
  );
};


import React from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { KeyboardShortcutsInfo } from './KeyboardShortcutsInfo';

interface DashboardHeaderProps {
  userEmail?: string;
  userName?: string;
  streak: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  userEmail, 
  userName,
  streak 
}) => {
  const displayName = userName || userEmail?.split('@')[0] || 'Friend';

  return (
    <div className="flex items-center justify-between">
      <div className="text-center flex-1">
        <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-400">
          Welcome back, {displayName}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Today is day <span className="font-semibold text-emerald-600 dark:text-emerald-400">{streak}</span> of your journey
        </p>
      </div>
      <div className="flex items-center gap-2">
        <KeyboardShortcutsInfo />
        <ThemeToggle />
      </div>
    </div>
  );
};

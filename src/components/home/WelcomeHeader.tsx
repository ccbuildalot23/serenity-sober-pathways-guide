import React from 'react';

interface WelcomeHeaderProps {
  name?: string;
  streak: number;
  checkIns: number;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ name, streak, checkIns }) => {
  const displayName = name || 'Friend';
  return (
    <div className="text-center space-y-1">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back, {displayName}!</h1>
      <p className="text-gray-600 dark:text-gray-300">
        {streak} day streak • {checkIns} check-ins
      </p>
    </div>
  );
};

export default WelcomeHeader;

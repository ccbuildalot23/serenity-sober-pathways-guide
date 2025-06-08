
import React from 'react';

interface ProgressDotsProps {
  current: number;
  total: number;
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({ current, total }) => {
  return (
    <div className="flex space-x-3">
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            index <= current
              ? 'bg-emerald-500'
              : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );
};

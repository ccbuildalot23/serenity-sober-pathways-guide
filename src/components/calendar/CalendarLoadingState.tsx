
import React from 'react';

const CalendarLoadingState: React.FC = () => {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-64 bg-gray-200 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

export default CalendarLoadingState;

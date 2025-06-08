
import React from 'react';

const CalendarLegend: React.FC = () => {
  return (
    <div className="mt-4 flex items-center justify-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-red-500 rounded-full" />
        <span>Crisis (1-3)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-amber-500 rounded-full" />
        <span>Struggling (4-5)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-blue-500 rounded-full" />
        <span>Stable (6-7)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 bg-emerald-500 rounded-full" />
        <span>Thriving (8-10)</span>
      </div>
    </div>
  );
};

export default CalendarLegend;

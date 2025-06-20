import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

const CalendarLegend: React.FC = () => {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Understanding Your Journey</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" />
              <div className="absolute -top-1 -right-1 text-xs">✨</div>
            </div>
            <div>
              <span className="font-medium text-emerald-700 dark:text-emerald-300">Thriving</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 block">8-10</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" />
              <div className="absolute -top-1 -right-1 text-xs">💪</div>
            </div>
            <div>
              <span className="font-medium text-blue-700 dark:text-blue-300">Growing</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 block">6-7</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-4 h-4 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" />
              <div className="absolute -top-1 -right-1 text-xs">🌱</div>
            </div>
            <div>
              <span className="font-medium text-amber-700 dark:text-amber-300">Building</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 block">4-5</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-4 h-4 bg-gradient-to-r from-rose-400 to-rose-600 rounded-full" />
              <div className="absolute -top-1 -right-1 text-xs">🌅</div>
            </div>
            <div>
              <span className="font-medium text-rose-700 dark:text-rose-300">New Day</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 block">1-3</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 text-center">
          Every mood is valid. Every day is progress. You're exactly where you need to be. 💜
        </p>
      </CardContent>
    </Card>
  );
};

export default CalendarLegend;


import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Sparkles } from 'lucide-react';

const CalendarLoadingState: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        {/* Loading Header */}
        <Card className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Your Recovery Journey</h1>
                <p className="text-blue-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Loading your progress...
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold animate-pulse">...</div>
                <div className="text-sm text-blue-100">day streak</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading Calendar Grid */}
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 42 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-gray-200 rounded animate-pulse"
                  ></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarLoadingState;

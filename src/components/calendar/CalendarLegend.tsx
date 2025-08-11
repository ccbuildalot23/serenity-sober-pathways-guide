import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';

const CalendarLegend: React.FC = () => {
  const moodLevels = [
    { level: 'Excellent', range: '8-10', color: 'bg-emerald-500', emoji: '✨' },
    { level: 'Good', range: '6-7', color: 'bg-blue-500', emoji: '💪' },
    { level: 'Okay', range: '4-5', color: 'bg-amber-500', emoji: '🌱' },
    { level: 'Struggling', range: '1-3', color: 'bg-red-500', emoji: '🌅' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Mood Legend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {moodLevels.map((mood) => (
            <div key={mood.level} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${mood.color}`}></div>
              <div className="text-sm">
                <div className="font-medium">{mood.emoji} {mood.level}</div>
                <div className="text-muted-foreground">{mood.range}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarLegend;

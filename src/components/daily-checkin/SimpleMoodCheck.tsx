// Simple Mood Check - Just three options, no scales
// Sometimes simple is what we need when we're struggling

import React from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, Sun, CloudRain } from 'lucide-react';
import type { MoodToday } from '@/services/simpleCheckinService';

interface SimpleMoodCheckProps {
  mood: MoodToday | null;
  onMoodSelect: (mood: MoodToday) => void;
}

export const SimpleMoodCheck: React.FC<SimpleMoodCheckProps> = ({ mood, onMoodSelect }) => {
  const moodOptions = [
    {
      value: 'struggling' as MoodToday,
      label: 'Struggling',
      icon: CloudRain,
      color: 'bg-blue-600 hover:bg-blue-700',
      message: "It's okay to not be okay"
    },
    {
      value: 'managing' as MoodToday,
      label: 'Managing', 
      icon: Cloud,
      color: 'bg-purple-600 hover:bg-purple-700',
      message: "One moment at a time"
    },
    {
      value: 'good' as MoodToday,
      label: 'Good',
      icon: Sun,
      color: 'bg-green-600 hover:bg-green-700',
      message: "Celebrate the good days"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">How are you today?</h3>
        <p className="text-gray-400 text-sm">Just pick the one that feels right</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {moodOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = mood === option.value;
          
          return (
            <Button
              key={option.value}
              onClick={() => onMoodSelect(option.value)}
              className={`
                h-24 flex flex-col items-center justify-center gap-2 transition-all
                ${isSelected 
                  ? `${option.color} text-white ring-2 ring-white ring-offset-2 ring-offset-gray-900` 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }
              `}
            >
              <Icon className="w-8 h-8" />
              <span className="font-semibold">{option.label}</span>
              {isSelected && (
                <span className="text-xs opacity-90">{option.message}</span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

// Backward compatibility
export { SimpleMoodCheck as MoodSection };
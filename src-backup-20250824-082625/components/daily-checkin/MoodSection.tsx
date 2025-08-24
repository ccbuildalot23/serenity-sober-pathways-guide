
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import RangeSlider from './RangeSlider';

interface MoodSectionProps {
  mood: number | null;
  onMoodChange: (value: number) => void;
}

export const MoodSection: React.FC<MoodSectionProps> = ({ mood, onMoodChange }) => {
  const handleMoodChange = (value: number) => {
    onMoodChange(value);
  };

  const getMoodLabel = (rating: number) => {
    if (rating <= 2) return { text: "Very Low", color: "bg-red-100 text-red-800" };
    if (rating <= 4) return { text: "Low", color: "bg-orange-100 text-orange-800" };
    if (rating <= 6) return { text: "Okay", color: "bg-yellow-100 text-yellow-800" };
    if (rating <= 8) return { text: "Good", color: "bg-green-100 text-green-800" };
    return { text: "Excellent", color: "bg-emerald-100 text-emerald-800" };
  };

  const quickMoodOptions = [
    { value: 2, emoji: '😢', label: 'Struggling', color: 'bg-red-500 hover:bg-red-600' },
    { value: 4, emoji: '😔', label: 'Low', color: 'bg-orange-500 hover:bg-orange-600' },
    { value: 6, emoji: '😐', label: 'Okay', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { value: 8, emoji: '😊', label: 'Good', color: 'bg-green-500 hover:bg-green-600' },
    { value: 10, emoji: '🌟', label: 'Great!', color: 'bg-emerald-500 hover:bg-emerald-600' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">How are you feeling today?</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">Quick tap or use the detailed scale below.</p>
      </div>

      {/* One-Tap Emotional Scale */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Mood Check:</h4>
        <div className="grid grid-cols-5 gap-2">
          {quickMoodOptions.map((option) => (
            <Button
              key={option.value}
              variant="outline"
              size="sm"
              onClick={() => handleMoodChange(option.value)}
              data-testid={`mood-${option.value <= 4 ? 'negative' : option.value <= 6 ? 'neutral' : 'positive'}`}
              className={`p-3 h-auto flex flex-col items-center space-y-1 border-2 transition-all ${
                mood === option.value 
                  ? `${option.color} text-white border-transparent` 
                  : 'hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <span className="text-lg">{option.emoji}</span>
              <span className="text-xs font-medium">{option.label}</span>
              <span className="text-xs opacity-75">{option.value}/10</span>
            </Button>
          ))}
        </div>
        {mood && (
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Selected: {quickMoodOptions.find(o => o.value === mood)?.label || 'Custom'} ({mood}/10)
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Detailed Scale:</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 px-1">
            <span>Not Great (1)</span>
            <span>Great! (10)</span>
          </div>
        
        <div className="relative">
          <RangeSlider
            min={1}
            max={10}
            value={mood || 5}
            onChange={(e) => handleMoodChange(parseInt(e.target.value))}
            className="w-full"
            aria-label="Mood rating from 1 to 10"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i + 1}>{i + 1}</span>
            ))}
          </div>
        </div>
        
          {mood && (
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">
                Your mood today: <Badge variant="secondary">{mood}/10</Badge>
              </div>
              <Badge className={getMoodLabel(mood).color}>
                {getMoodLabel(mood).text}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

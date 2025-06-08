
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface MoodSectionProps {
  mood: number | null;
  onMoodChange: (value: number) => void;
}

export const MoodSection: React.FC<MoodSectionProps> = ({ mood, onMoodChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">How are you feeling today?</h3>
      <p className="text-gray-600">Tap the slider to rate your overall mood.</p>
      <div className="flex items-center justify-between">
        <span>Not Great</span>
        <span>Great!</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={mood || 5}
        onChange={(e) => onMoodChange(parseInt(e.target.value))}
        className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
      />
      {mood && (
        <div className="text-center">
          Your mood today: <Badge variant="secondary">{mood}/10</Badge>
        </div>
      )}
    </div>
  );
};

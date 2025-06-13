
import React from 'react';
import { Badge } from '@/components/ui/badge';

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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold mb-2">How are you feeling today?</h3>
        <p className="text-gray-600 mb-4">Rate your overall mood on a scale from 1 to 10.</p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-500 px-1">
          <span>Not Great (1)</span>
          <span>Great! (10)</span>
        </div>
        
        <div className="relative">
          <input
            type="range"
            min="1"
            max="10"
            value={mood || 5}
            onChange={(e) => handleMoodChange(parseInt(e.target.value))}
            className="w-full h-3 bg-blue-100 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md"
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
  );
};


import React, { useState } from 'react';
import { Heart, TrendingUp, Book } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';

interface CardProps {
  onNext: () => void;
  onPrevious: () => void;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  isAnimating: boolean;
}

export const DailyCheckInCard: React.FC<CardProps> = () => {
  const [selectedMood, setSelectedMood] = useState(7);

  return (
    <div className="text-center space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
          <Heart className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-blue-900">
          Daily Check-ins
        </h2>
        <p className="text-gray-600">
          Track your progress with simple, meaningful daily practices
        </p>
      </div>

      {/* Mood Scale Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">How are you feeling today?</h3>
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((mood) => (
            <button
              key={mood}
              onClick={() => setSelectedMood(mood)}
              className={`w-8 h-8 rounded-full font-medium text-sm transition-all ${
                selectedMood === mood
                  ? 'bg-blue-600 text-white transform scale-110'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500">1 = Struggling, 10 = Thriving</p>
      </div>

      {/* Features Preview */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <span className="text-gray-700">Track triggers and patterns</span>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <Book className="w-5 h-5 text-emerald-500" />
          <span className="text-gray-700">Daily gratitude practice</span>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <Heart className="w-5 h-5 text-emerald-500" />
          <span className="text-gray-700">Celebrate small wins</span>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-blue-800 text-sm">
          Just 2 minutes each day can help you spot patterns and celebrate progress.
        </p>
      </div>
    </div>
  );
};

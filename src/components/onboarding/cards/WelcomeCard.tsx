
import React from 'react';
import { OnboardingData } from '../OnboardingFlow';

interface CardProps {
  onNext: () => void;
  onPrevious: () => void;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  isAnimating: boolean;
}

export const WelcomeCard: React.FC<CardProps> = ({ onNext }) => {
  return (
    <div className="text-center space-y-8">
      {/* App Logo */}
      <div className="space-y-4">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-900 to-emerald-500 rounded-full flex items-center justify-center">
          <span className="text-white text-3xl font-bold">S</span>
        </div>
        <h1 className="text-3xl font-bold text-blue-900">Serenity</h1>
      </div>

      {/* Tagline */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Your Recovery Journey Starts Here
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">
          A safe, private space designed to support your daily recovery with tools backed by clinical research and lived experience.
        </p>
      </div>

      {/* Welcome Message */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <p className="text-blue-900 font-medium">
          We're honored to be part of your journey. Let's take a few moments to personalize your experience.
        </p>
      </div>
    </div>
  );
};

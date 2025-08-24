
import React from 'react';
import { Users, UserPlus, Heart, Phone } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';

interface CardProps {
  onNext: () => void;
  onPrevious: () => void;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  isAnimating: boolean;
}

export const BuildCircleCard: React.FC<CardProps> = () => {
  return (
    <div className="text-center space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-blue-900">
          Build Your Circle
        </h2>
        <p className="text-gray-600">
          Recovery is stronger with support from people who care
        </p>
      </div>

      {/* Support Categories */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium">👤</span>
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-800">Sponsor</p>
            <p className="text-sm text-gray-600">Your recovery mentor</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-emerald-600 font-medium">👨‍👩‍👧</span>
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-800">Family</p>
            <p className="text-sm text-gray-600">Your closest support system</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-600 font-medium">🤝</span>
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-800">Recovery Friends</p>
            <p className="text-sm text-gray-600">People who understand your journey</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-medium">🩺</span>
          </div>
          <div className="text-left">
            <p className="font-medium text-gray-800">Therapist/Counselor</p>
            <p className="text-sm text-gray-600">Professional support</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
          <Phone className="w-5 h-5 text-blue-600" />
          <span className="text-blue-800 text-sm">One-tap calling and texting</span>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
          <Heart className="w-5 h-5 text-blue-600" />
          <span className="text-blue-800 text-sm">Daily connection reminders</span>
        </div>
      </div>
    </div>
  );
};

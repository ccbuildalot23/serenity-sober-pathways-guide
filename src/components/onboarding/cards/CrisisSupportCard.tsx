
import React from 'react';
import { Phone, MessageCircle, Users } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';

interface CardProps {
  onNext: () => void;
  onPrevious: () => void;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  isAnimating: boolean;
}

export const CrisisSupportCard: React.FC<CardProps> = () => {
  return (
    <div className="text-center space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <Phone className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-blue-900">
          Crisis Support
        </h2>
        <p className="text-xl text-gray-700 font-medium">
          Get help in 2 taps
        </p>
      </div>

      {/* SOS Button Demo */}
      <div className="space-y-4">
        <div className="bg-red-50 p-6 rounded-lg border-2 border-red-200">
          <button className="w-24 h-24 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center mx-auto transition-transform hover:scale-105">
            <span className="text-white font-bold text-lg">SOS</span>
          </button>
          <p className="text-red-800 mt-3 font-medium">Emergency Help Button</p>
        </div>
      </div>

      {/* Support Options */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <Phone className="w-5 h-5 text-blue-600" />
          <span className="text-gray-700">Call 988 Crisis Lifeline instantly</span>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <span className="text-gray-700">Text crisis support line</span>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <Users className="w-5 h-5 text-blue-600" />
          <span className="text-gray-700">Contact your support network</span>
        </div>
      </div>

      {/* Important Message */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-blue-800 text-sm">
          <strong>You're not alone.</strong> Help is always available, and asking for support is a sign of strength.
        </p>
      </div>
    </div>
  );
};

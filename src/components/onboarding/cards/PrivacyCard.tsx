
import React from 'react';
import { Lock } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';

interface CardProps {
  onNext: () => void;
  onPrevious: () => void;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  isAnimating: boolean;
}

export const PrivacyCard: React.FC<CardProps> = () => {
  return (
    <div className="text-center space-y-8">
      {/* Lock Icon */}
      <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <Lock className="w-10 h-10 text-emerald-600" />
      </div>

      {/* Header */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-blue-900">
          Privacy First
        </h2>
        <p className="text-xl text-gray-700 font-medium">
          Your data stays on your device. Anonymous by default.
        </p>
      </div>

      {/* Privacy Points */}
      <div className="space-y-4 text-left">
        <div className="flex items-start space-x-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
          <p className="text-gray-700">
            <strong>Local Storage:</strong> Your personal data never leaves your device unless you choose to share it.
          </p>
        </div>
        <div className="flex items-start space-x-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
          <p className="text-gray-700">
            <strong>Anonymous Mode:</strong> Use the app without any identifying information.
          </p>
        </div>
        <div className="flex items-start space-x-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
          <p className="text-gray-700">
            <strong>Your Control:</strong> Export, delete, or modify your data anytime.
          </p>
        </div>
        <div className="flex items-start space-x-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
          <p className="text-gray-700">
            <strong>No Tracking:</strong> We don't sell data or track you across other websites.
          </p>
        </div>
      </div>

      {/* Trust Message */}
      <div className="bg-emerald-50 p-4 rounded-lg">
        <p className="text-emerald-800 text-sm">
          Recovery requires trust. We've built this app to earn and protect yours.
        </p>
      </div>
    </div>
  );
};

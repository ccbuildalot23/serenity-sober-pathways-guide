
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface SafetyWarningProps {
  onProceed: () => void;
  onCancel: () => void;
  loading: boolean;
}

export const SafetyWarning: React.FC<SafetyWarningProps> = ({ 
  onProceed, 
  onCancel, 
  loading 
}) => (
  <div className="p-8">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-amber-100 rounded-full">
        <AlertCircle className="w-6 h-6 text-amber-600" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-800">Gentle Reminder</h2>
    </div>
    
    <p className="text-gray-600 mb-8 leading-relaxed">
      This exercise will guide you through a reflection on potential consequences of relapse. 
      The content may bring up strong emotions as it's personalized to your recovery journey.
    </p>
    
    <div className="p-4 bg-blue-50 rounded-lg mb-8">
      <p className="text-blue-800 font-medium mb-2">Are you in a safe space to continue?</p>
      <p className="text-blue-700 text-sm">
        Make sure you're somewhere comfortable and have time to process your feelings.
      </p>
    </div>
    
    <div className="flex gap-3">
      <button
        onClick={onProceed}
        disabled={loading}
        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Preparing...' : 'Yes, I\'m Ready'}
      </button>
      <button
        onClick={onCancel}
        className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
      >
        Take Me to Grounding
      </button>
    </div>
  </div>
);

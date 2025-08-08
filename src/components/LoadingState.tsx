import React from 'react';
import { Heart, Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  showEncouragement?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "Loading...", 
  showEncouragement = true 
}) => {
  const encouragingMessages = [
    "You're taking steps toward healing 🌱",
    "Your recovery journey matters 💙",  
    "Loading your support tools ⭐",
    "Preparing resources that understand you 🤝",
    "Getting everything ready for you 🕊️",
    "Building your safe space 🛡️"
  ];

  const randomEncouragement = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      {/* Loading Animation */}
      <div className="relative">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        {showEncouragement && (
          <Heart className="w-4 h-4 text-red-400 absolute -top-1 -right-1 animate-pulse" />
        )}
      </div>
      
      {/* Primary Message */}
      <p className="text-gray-700 font-medium text-center">
        {message}
      </p>
      
      {/* Encouraging Subtext */}
      {showEncouragement && (
        <p className="text-sm text-gray-500 text-center max-w-xs italic">
          {randomEncouragement}
        </p>
      )}
      
      {/* Breathing Animation Hint for Anxiety */}
      <div className="flex items-center space-x-2 text-xs text-gray-400">
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
        <span>Take a deep breath while you wait</span>
        <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>
    </div>
  );
};

export default LoadingState;
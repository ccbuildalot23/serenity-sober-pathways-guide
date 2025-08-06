import React from 'react';
import { Loader2, Heart, Brain, Users } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  variant?: 'default' | 'card' | 'fullscreen' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  variant = 'default',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mx-auto mb-4`} />
          <p className="text-gray-600 font-medium">{message}</p>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mb-4`} />
        <p className="text-gray-600">{message}</p>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
        <span className="text-gray-600">{message}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mb-4`} />
      <p className="text-gray-600">{message}</p>
    </div>
  );
};

// Skeleton loaders for different content types
export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="space-y-3">
      <div className="h-3 bg-gray-200 rounded"></div>
      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
    </div>
  </div>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonDashboard: React.FC = () => (
  <div className="space-y-6 p-6">
    {/* Header skeleton */}
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
    
    {/* Stats cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      ))}
    </div>
    
    {/* Content skeleton */}
    <SkeletonList count={2} />
  </div>
);

// Content-specific loading states
export const TherapyLoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8">
    <Brain className="w-12 h-12 text-primary mb-4 animate-pulse" />
    <p className="text-gray-600 font-medium">Loading therapy resources...</p>
    <p className="text-sm text-gray-500 mt-2">Preparing your personalized content</p>
  </div>
);

export const CommunityLoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8">
    <Users className="w-12 h-12 text-primary mb-4 animate-pulse" />
    <p className="text-gray-600 font-medium">Connecting to community...</p>
    <p className="text-sm text-gray-500 mt-2">Finding support members</p>
  </div>
);

export const RecoveryLoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8">
    <Heart className="w-12 h-12 text-primary mb-4 animate-pulse" />
    <p className="text-gray-600 font-medium">Loading recovery tools...</p>
    <p className="text-sm text-gray-500 mt-2">Your journey continues</p>
  </div>
);

// Progress indicator for multi-step processes
interface ProgressLoadingProps {
  currentStep: number;
  totalSteps: number;
  message?: string;
}

export const ProgressLoading: React.FC<ProgressLoadingProps> = ({ 
  currentStep, 
  totalSteps, 
  message = 'Processing...' 
}) => (
  <div className="flex flex-col items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
    <p className="text-gray-600 font-medium mb-2">{message}</p>
    <div className="w-64 bg-gray-200 rounded-full h-2">
      <div 
        className="bg-primary h-2 rounded-full transition-all duration-300"
        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
      />
    </div>
    <p className="text-sm text-gray-500 mt-2">
      Step {currentStep} of {totalSteps}
    </p>
  </div>
);

// Success state component
interface SuccessStateProps {
  message: string;
  description?: string;
  onContinue?: () => void;
}

export const SuccessState: React.FC<SuccessStateProps> = ({ 
  message, 
  description,
  onContinue 
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
      <Heart className="w-8 h-8 text-green-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{message}</h3>
    {description && (
      <p className="text-gray-600 mb-4">{description}</p>
    )}
    {onContinue && (
      <button
        onClick={onContinue}
        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Continue
      </button>
    )}
  </div>
);
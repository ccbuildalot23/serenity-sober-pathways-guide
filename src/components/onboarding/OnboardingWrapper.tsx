
import React, { useEffect, useState } from 'react';
import { OnboardingFlow, OnboardingData } from './OnboardingFlow';

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export const OnboardingWrapper: React.FC<OnboardingWrapperProps> = ({ children }) => {
  const [_shouldShowOnboarding, setShouldShowOnboarding] = useState(_false);
  const [_isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if onboarding has been completed
    const checkOnboardingStatus = () => {
      try {
        const stored = localStorage.getItem('serenity_onboarding_completed');
        if (!stored) {
          setShouldShowOnboarding(true);
        }
      } catch (error) {
        console.log('Error checking onboarding status:', error);
        // If there's an error, default to showing onboarding
        setShouldShowOnboarding(true);
      } finally {
        setIsLoading(_false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const handleOnboardingComplete = (data: OnboardingData) => {
    console.log('Onboarding completed with data:', data);
    setShouldShowOnboarding(_false);
  };

  const handleOnboardingSkip = () => {
    // Still mark as completed but with default data
    const completionData = {
      completed: true,
      timestamp: new Date().toISOString(),
      skipped: true,
    };
    localStorage.setItem('serenity_onboarding_completed', JSON.stringify(completionData));
    setShouldShowOnboarding(_false);
  };

  if (_isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-900 to-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">S</span>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (_shouldShowOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  return <>{children}</>;
};

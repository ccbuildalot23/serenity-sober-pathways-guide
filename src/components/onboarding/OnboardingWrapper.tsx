
import React, { useEffect, useState } from 'react';
import { OnboardingFlow, OnboardingData } from './OnboardingFlow';
import logger from '../../services/loggerService';

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export const OnboardingWrapper: React.FC<OnboardingWrapperProps> = ({ children }) => {
  const [_shouldShowOnboarding, setShouldShowOnboarding] = useState(false);
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
        logger.debug('Error checking onboarding status:', error, { component: 'OnboardingWrapper' });
        // If there's an error, default to showing onboarding
        setShouldShowOnboarding(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const handleOnboardingComplete = (data: OnboardingData) => {
    logger.debug('Onboarding completed with data:', data, { component: 'OnboardingWrapper' });
    setShouldShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    // Still mark as completed but with default data
    const completionData = {
      completed: true,
      timestamp: new Date().toISOString(),
      skipped: true,
    };
    localStorage.setItem('serenity_onboarding_completed', JSON.stringify(completionData));
    setShouldShowOnboarding(false);
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

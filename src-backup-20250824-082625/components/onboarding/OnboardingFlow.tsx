
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WelcomeCard } from './cards/WelcomeCard';
import { PrivacyCard } from './cards/PrivacyCard';
import { DailyCheckInCard } from './cards/DailyCheckInCard';
import { CrisisSupportCard } from './cards/CrisisSupportCard';
import { BuildCircleCard } from './cards/BuildCircleCard';
import { PersonalizeCard } from './cards/PersonalizeCard';
import { ProgressDots } from './ProgressDots';

export interface OnboardingData {
  morningCheckInTime: string;
  eveningReflectionTime: string;
  crisisProneHours: string[];
  emergencyContact: {
    name: string;
    phone: string;
  } | null;
  anonymousMode: boolean;
  notificationPreferences: {
    dailyReminders: boolean;
    crisisAlerts: boolean;
    milestoneMessages: boolean;
  };
}

const defaultOnboardingData: OnboardingData = {
  morningCheckInTime: '09:00',
  eveningReflectionTime: '20:00',
  crisisProneHours: [],
  emergencyContact: null,
  anonymousMode: false,
  notificationPreferences: {
    dailyReminders: true,
    crisisAlerts: true,
    milestoneMessages: true,
  },
};

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentCard, setCurrentCard] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(defaultOnboardingData);
  const [isAnimating, setIsAnimating] = useState(false);

  const totalCards = 6;

  const handleNext = () => {
    if (isAnimating) return;
    
    if (currentCard < totalCards - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentCard(prev => prev + 1);
        setIsAnimating(false);
      }, 150);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (isAnimating || currentCard === 0) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentCard(prev => prev - 1);
      setIsAnimating(false);
    }, 150);
  };

  const handleComplete = () => {
    // Store completion in localStorage
    const completionData = {
      completed: true,
      timestamp: new Date().toISOString(),
      data: onboardingData,
    };
    localStorage.setItem('serenity_onboarding_completed', JSON.stringify(completionData));
    onComplete(onboardingData);
  };

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  const renderCard = () => {
    const cardProps = {
      onNext: handleNext,
      onPrevious: handlePrevious,
      data: onboardingData,
      updateData: updateOnboardingData,
      isAnimating,
    };

    switch (currentCard) {
      case 0:
        return <WelcomeCard {...cardProps} />;
      case 1:
        return <PrivacyCard {...cardProps} />;
      case 2:
        return <DailyCheckInCard {...cardProps} />;
      case 3:
        return <CrisisSupportCard {...cardProps} />;
      case 4:
        return <BuildCircleCard {...cardProps} />;
      case 5:
        return <PersonalizeCard {...cardProps} onComplete={handleComplete} />;
      default:
        return <WelcomeCard {...cardProps} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col min-h-screen">
      {/* Skip Link */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onSkip}
          className="text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Progress Dots */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <ProgressDots current={currentCard} total={totalCards} />
      </div>

      {/* Card Content - Fixed height container */}
      <div className="flex-1 flex items-center justify-center p-4 pt-20 pb-32">
        <div 
          className={`w-full max-w-md transition-all duration-300 ease-in-out ${
            isAnimating ? 'opacity-0 transform translate-x-4' : 'opacity-100 transform translate-x-0'
          }`}
        >
          {renderCard()}
        </div>
      </div>

      {/* Navigation - Fixed positioned footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentCard === 0 || isAnimating}
            className="text-gray-600 disabled:opacity-0 h-12 px-6"
          >
            Previous
          </Button>

          <div className="flex-1" />

          {currentCard < totalCards - 1 ? (
            <Button
              onClick={handleNext}
              disabled={isAnimating}
              className="bg-blue-900 hover:bg-blue-800 text-white h-12 px-8 rounded-lg font-medium"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isAnimating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white h-14 px-8 rounded-lg font-medium text-lg"
            >
              Begin Journey
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

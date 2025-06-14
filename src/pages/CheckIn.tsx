
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { CheckInHeader } from '@/components/daily-checkin/CheckInHeader';
import { CheckInProgress } from '@/components/daily-checkin/CheckInProgress';
import { CheckInSections } from '@/components/daily-checkin/CheckInSections';
import { CheckInCompletion } from '@/components/daily-checkin/CheckInCompletion';
import { CheckInSuccess } from '@/components/daily-checkin/CheckInSuccess';
import { CheckInCompleted } from '@/components/daily-checkin/CheckInCompleted';
import { navigateToHome, navigateToProgress, scrollToIncompleteSection, showToastNotification } from '@/utils/checkInUtils';

const CheckIn = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const {
    responses,
    setResponses,
    completedSections,
    markSectionComplete,
    canComplete,
    validateCompletion,
    handleComplete,
    isSubmitting,
    existingCheckin,
    isSaving,
    lastSubmissionError
  } = useDailyCheckIn();

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Check wellness section completion
  const checkWellnessCompletion = () => {
    if (responses.energy !== null && 
        responses.hope !== null && 
        responses.sobriety_confidence !== null && 
        responses.recovery_importance !== null && 
        responses.recovery_strength !== null) {
      markSectionComplete('wellness');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!canComplete()) {
      validateCompletion();
      showToastNotification('Please complete all sections before submitting', 'error', setShowToast);
      
      // Scroll to first incomplete section
      scrollToIncompleteSection(completedSections);
      return;
    }

    try {
      const success = await handleComplete();
      if (success) {
        setShowSuccess(true);
        showToastNotification('Check-in completed successfully!', 'success', setShowToast);
        
        // Navigate after a short delay
        setTimeout(() => {
          navigateToHome();
        }, 2000);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit check-in. Please try again.';
      setError(errorMsg);
      showToastNotification(errorMsg, 'error', setShowToast);
      console.error('Check-in submission error:', err);
    }
  };

  const handleSkipToIncomplete = () => {
    scrollToIncompleteSection(completedSections);
  };

  if (existingCheckin) {
    return (
      <CheckInCompleted
        responses={responses}
        onNavigateToHome={navigateToHome}
        onNavigateToProgress={navigateToProgress}
      />
    );
  }

  if (showSuccess) {
    return <CheckInSuccess />;
  }

  return (
    <Layout activeTab="checkin" onTabChange={() => {}}>
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Toast Notification */}
        {showToast && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            showToast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <p className="font-medium">{showToast.message}</p>
          </div>
        )}

        <CheckInHeader 
          onNavigateToHome={navigateToHome}
          isSaving={isSaving || false}
        />

        {/* Error Alert */}
        {(error || lastSubmissionError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || lastSubmissionError}</AlertDescription>
          </Alert>
        )}

        <CheckInProgress 
          completedSections={completedSections}
          onSkipToIncomplete={handleSkipToIncomplete}
        />

        <CheckInSections
          responses={responses}
          setResponses={setResponses}
          completedSections={completedSections}
          markSectionComplete={markSectionComplete}
          canComplete={canComplete()}
          checkWellnessCompletion={checkWellnessCompletion}
        />

        <CheckInCompletion
          canComplete={canComplete()}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          isSaving={isSaving || false}
        />
      </div>
    </Layout>
  );
};

export default CheckIn;

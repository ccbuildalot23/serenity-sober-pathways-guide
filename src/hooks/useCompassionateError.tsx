// Compassionate Error Handling - Because tech problems shouldn't add to your stress
// No blame, no shame, just helpful support when things go wrong

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { hopeMessenger } from '@/services/hopeMessengerService';
import logger from '@/services/loggerService';

interface ErrorContext {
  action: string;
  _isRecoverable: boolean;
  retry?: () => Promise<void>;
}

const ERROR_MESSAGES = {
  network: {
    title: "Can't Connect Right Now",
    message: "That's okay - your progress is saved locally",
    suggestion: "Try again when you're back online"
  },
  auth: {
    title: "Let's Get You Signed In",
    message: "Looks like you need to sign in again",
    suggestion: "No worries, your data is safe"
  },
  save: {
    title: "Couldn't Save That",
    message: "But don't worry, we'll keep trying",
    suggestion: "Your work isn't lost"
  },
  load: {
    title: "Having Trouble Loading",
    message: "Let's try a different approach",
    suggestion: "Refresh the page or we'll use cached data"
  },
  permission: {
    title: "Need Your Permission",
    message: "We respect your privacy",
    suggestion: "You can update permissions in settings"
  },
  general: {
    title: "Something Went Wrong",
    message: "But you're still doing great",
    suggestion: "Let's try again together"
  }
};

export const useCompassionateError = () => {
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  const getErrorType = (error: Error): keyof typeof ERROR_MESSAGES => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) return 'network';
    if (message.includes('auth') || message.includes('unauthorized')) return 'auth';
    if (message.includes('save') || message.includes('insert')) return 'save';
    if (message.includes('load') || message.includes('read')) return 'load';
    if (message.includes('permission') || message.includes('denied')) return 'permission';
    
    return 'general';
  };

  const handleError = useCallback((error: Error, _context?: ErrorContext) => {
    console.error('Compassionate error handler:', error);
    setLastError(error);
    setErrorCount(prev => prev + 1);

    const errorType = getErrorType(error);
    const errorInfo = ERROR_MESSAGES[errorType];

    // Show compassionate toast
    toast.error(errorInfo.title, {
      description: (
        <div className="space-y-2">
          <p>{errorInfo.message}</p>
          <p className="text-xs opacity-80">{errorInfo.suggestion}</p>
          {_context?._isRecoverable && _context.retry && (
            <button
              onClick={() => retryAction(_context.retry!)}
              className="mt-2 px-3 py-1 bg-white/10 rounded-md text-xs hover:bg-white/20 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      ),
      _duration: 6000,
    });

    // Send encouragement if user is having multiple errors
    if (errorCount > 2) {
      setTimeout(() => {
        toast.info("Technology can be frustrating", {
          description: "You're handling this so well. Take a breath.",
          _duration: 4000
        });
        hopeMessenger.sendHope('struggling');
      }, 2000);
    }

    // Log for debugging without exposing technical details to user
    logger.error('Compassionate error handled', error, {
      component: 'useCompassionateError',
      action: 'error_logged',
      errorType,
      context: _context?.action
    });
  }, [errorCount]);

  const retryAction = useCallback(async (action: () => Promise<void>) => {
    if (isRetrying) return;

    setIsRetrying(true);
    toast.info("Trying again...", { _duration: 2000 });

    try {
      await action();
      toast.success("That worked! Nice job being patient.", { _duration: 3000 });
      setErrorCount(0); // Reset on success
    } catch (error) {
      handleError(error as Error, {
        action: 'retry',
        _isRecoverable: false
      });
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, handleError]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const resetErrorCount = useCallback(() => {
    setErrorCount(0);
  }, []);

  // Wrapper for async operations with built-in error handling
  const withCompassion = useCallback(async <T,>(
    operation: () => Promise<T>,
    _context: ErrorContext
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      handleError(error as Error, _context);
      return null;
    }
  }, [handleError]);

  // Special handling for form errors
  const handleFormError = useCallback((_fieldErrors: Record<string, string>) => {
    const errorCount = Object.keys(_fieldErrors).length;
    
    if (errorCount === 1) {
      const [field, message] = Object.entries(_fieldErrors)[0];
      toast.error("Just one small thing", {
        description: `${field}: ${message}`,
        _duration: 4000
      });
    } else {
      toast.error("A few things need adjusting", {
        description: "No worries, we'll go through them together",
        _duration: 4000
      });
    }
  }, []);

  return {
    lastError,
    isRetrying,
    errorCount,
    handleError,
    retryAction,
    clearError,
    resetErrorCount,
    withCompassion,
    handleFormError,
    // Utility functions for common scenarios
    networkError: () => handleError(new Error('network'), { action: 'network', _isRecoverable: true }),
    authError: () => handleError(new Error('auth'), { action: 'auth', _isRecoverable: false }),
    saveError: (retry?: () => Promise<void>) => handleError(new Error('save'), { 
      action: 'save', 
      _isRecoverable: !!retry,
      retry 
    })
  };
};
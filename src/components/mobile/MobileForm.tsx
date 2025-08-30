import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface MobileFormProps {
  onSubmit: (data: any) => void;
  children: React.ReactNode;
  className?: string;
  hapticFeedback?: boolean;
}

export const MobileForm: React.FC<MobileFormProps> = ({
  onSubmit,
  children,
  className,
  hapticFeedback = true
}) => {
  const { triggerHaptic } = useHapticFeedback();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (hapticFeedback) {
      triggerHaptic('light');
    }

    setIsSubmitting(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    try {
      await onSubmit(data);
      if (hapticFeedback) {
        triggerHaptic('success');
      }
    } catch (error) {
      if (hapticFeedback) {
        triggerHaptic('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn(
        'space-y-4 p-4',
        'touch-manipulation',
        className
      )}
      autoComplete="on"
    >
      {children}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base font-medium"
        aria-busy={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
};

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hapticOnFocus?: boolean;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  label,
  error,
  hapticOnFocus = true,
  className,
  ...props
}) => {
  const { triggerHaptic } = useHapticFeedback();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    if (hapticOnFocus) {
      triggerHaptic('selection');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Auto-zoom prevention for iOS
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleTouchStart = (e: TouchEvent) => {
      input.style.fontSize = '16px';
    };

    input.addEventListener('touchstart', handleTouchStart);
    return () => {
      input.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={props.id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          'w-full px-4 py-3',
          'text-base', // 16px to prevent iOS zoom
          'border rounded-lg',
          'transition-all duration-200',
          'touch-manipulation',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          isFocused && 'border-blue-500',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hapticOnFocus?: boolean;
}

export const MobileTextarea: React.FC<MobileTextareaProps> = ({
  label,
  error,
  hapticOnFocus = true,
  className,
  ...props
}) => {
  const { triggerHaptic } = useHapticFeedback();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    if (hapticOnFocus) {
      triggerHaptic('selection');
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={props.id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <textarea
        onFocus={handleFocus}
        onBlur={() => setIsFocused(false)}
        className={cn(
          'w-full px-4 py-3',
          'text-base min-h-[100px]',
          'border rounded-lg',
          'transition-all duration-200',
          'touch-manipulation resize-none',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          isFocused && 'border-blue-500',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
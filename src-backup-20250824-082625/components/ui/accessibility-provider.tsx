import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * WCAG 2.1 AA Accessibility Provider
 * 
 * This component ensures the application meets WCAG 2.1 AA standards by:
 * 1. Managing focus states and keyboard navigation
 * 2. Providing screen reader announcements
 * 3. Ensuring proper color contrast
 * 4. Managing ARIA attributes
 * 5. Handling skip navigation
 */

interface AccessibilityContextType {
  announceMessage: (message: string, priority?: 'polite' | 'assertive') => void;
  focusMainContent: () => void;
  isHighContrast: boolean;
  isReducedMotion: boolean;
  fontSize: 'normal' | 'large' | 'x-large';
  setFontSize: (size: 'normal' | 'large' | 'x-large') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'x-large'>('normal');
  const [announcement, setAnnouncement] = useState<{ message: string; priority: 'polite' | 'assertive' } | null>(null);

  useEffect(() => {
    // Check for user preferences
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    setIsHighContrast(highContrastQuery.matches);
    setIsReducedMotion(reducedMotionQuery.matches);

    // Listen for changes
    const handleHighContrastChange = (e: MediaQueryListEvent) => setIsHighContrast(e.matches);
    const handleReducedMotionChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);

    highContrastQuery.addEventListener('change', handleHighContrastChange);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);

    // Load saved preferences
    const savedFontSize = localStorage.getItem('accessibility-font-size');
    if (savedFontSize) {
      setFontSize(savedFontSize as any);
    }

    // Set up keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);

    return () => {
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, []);

  useEffect(() => {
    // Apply font size to root element
    const root = document.documentElement;
    switch (fontSize) {
      case 'large':
        root.style.fontSize = '18px';
        break;
      case 'x-large':
        root.style.fontSize = '20px';
        break;
      default:
        root.style.fontSize = '16px';
    }
    
    // Save preference
    localStorage.setItem('accessibility-font-size', fontSize);
  }, [fontSize]);

  const handleKeyboardNavigation = (e: KeyboardEvent) => {
    // Skip to main content with Alt+1
    if (e.altKey && e.key === '1') {
      focusMainContent();
    }
    
    // Skip to navigation with Alt+2
    if (e.altKey && e.key === '2') {
      const nav = document.querySelector('nav[role="navigation"]');
      if (nav) {
        (nav as HTMLElement).focus();
      }
    }
  };

  const announceMessage = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement({ message, priority });
    // Clear after announcement
    setTimeout(() => setAnnouncement(null), 100);
  };

  const focusMainContent = () => {
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      (main as HTMLElement).focus();
      announceMessage('Main content');
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        announceMessage,
        focusMainContent,
        isHighContrast,
        isReducedMotion,
        fontSize,
        setFontSize,
      }}
    >
      {/* Skip Navigation Links */}
      <div className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50">
        <a
          href="#main-content"
          className="bg-blue-600 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={(e) => {
            e.preventDefault();
            focusMainContent();
          }}
        >
          Skip to main content
        </a>
      </div>

      {/* Live Region for Screen Reader Announcements */}
      <div
        role="status"
        aria-live={announcement?.priority || 'polite'}
        aria-atomic="true"
        className="sr-only"
      >
        {announcement?.message}
      </div>

      {/* High Contrast Mode Indicator */}
      {isHighContrast && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-100 text-black text-center py-1 text-sm z-50">
          High Contrast Mode Active
        </div>
      )}

      {children}
    </AccessibilityContext.Provider>
  );
};

// Accessible Button Component
export const AccessibleButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}> = ({ children, onClick, ariaLabel, variant = 'primary', disabled = false, className = '' }) => {
  const { isHighContrast } = useAccessibility();

  const baseClasses = 'px-4 py-2 rounded font-medium focus:outline-none focus:ring-2 transition-colors';
  
  const variantClasses = {
    primary: isHighContrast
      ? 'bg-black text-white hover:bg-gray-800 focus:ring-black'
      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: isHighContrast
      ? 'bg-white text-black border-2 border-black hover:bg-gray-100 focus:ring-black'
      : 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    danger: isHighContrast
      ? 'bg-black text-yellow-300 hover:bg-gray-800 focus:ring-black'
      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : ''} ${className}`}
    >
      {children}
    </button>
  );
};

// Accessible Form Field Component
export const AccessibleFormField: React.FC<{
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  helpText?: string;
}> = ({ label, id, type = 'text', value, onChange, error, required = false, helpText }) => {
  const { announceMessage } = useAccessibility();
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  useEffect(() => {
    if (error) {
      announceMessage(`Error: ${error}`, 'assertive');
    }
  }, [error, announceMessage]);

  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={`${helpText ? helpId : ''} ${error ? errorId : ''}`}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
        }`}
      />
      
      {helpText && (
        <p id={helpId} className="mt-1 text-sm text-gray-600">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

// Accessible Loading Spinner
export const AccessibleSpinner: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => {
  const { isReducedMotion } = useAccessibility();

  return (
    <div role="status" aria-label={label}>
      <svg
        className={`h-6 w-6 text-blue-600 ${!isReducedMotion && 'animate-spin'}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
};

// Focus Trap Hook
export const useFocusTrap = (ref: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    element.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref]);
};
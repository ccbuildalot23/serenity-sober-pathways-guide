import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Phone, Heart } from 'lucide-react';

const CrisisFloatingButton: React.FC = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [discreteMode, setDiscreteMode] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);

  // Don't show on the crisis help page itself
  if (location.pathname === '/crisis-help') {
    return null;
  }

  // Immediate visual feedback with DOM manipulation for <200ms response
  const handleImmediateFeedback = useCallback(() => {
    if (buttonRef.current) {
      // Direct DOM manipulation for instant response
      buttonRef.current.style.transform = 'scale(0.95)';
      buttonRef.current.style.boxShadow = '0 0 20px rgba(220, 38, 38, 0.6)';
      
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]); // SOS pattern
      }
      
      // Reset transform after immediate feedback
      setTimeout(() => {
        if (buttonRef.current) {
          buttonRef.current.style.transform = '';
        }
      }, 150);
    }
  }, []);

  const handleClick = useCallback(() => {
    handleImmediateFeedback();
    // Navigate to crisis help page
    window.location.href = '/crisis-help';
  }, [handleImmediateFeedback]);

  const handleEmergencyCall = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleImmediateFeedback();
    window.location.href = 'tel:988';
  }, [handleImmediateFeedback]);

  // Discrete long-press activation for professional environments
  const handleLongPressStart = useCallback(() => {
    longPressRef.current = setTimeout(() => {
      if (!discreteMode) {
        setDiscreteMode(true);
        if (navigator.vibrate) {
          navigator.vibrate([50]); // Subtle feedback
        }
        // Navigate to crisis help after discrete activation
        setTimeout(() => {
          window.location.href = '/crisis-help?discrete=true';
        }, 500);
      }
    }, 2000); // 2 second long press for discrete activation
  }, [discreteMode]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  // Shame-aware messaging based on time of interaction
  const getCrisisMessage = useCallback(() => {
    const hour = new Date().getHours();
    const messages = {
      night: "You're brave for reaching out. Help is here.",
      morning: "Starting the day with courage. You're not alone.",
      afternoon: "Reaching out takes strength. You have it.",
      evening: "You made it through today. Help is available."
    };
    
    if (hour >= 22 || hour < 6) return messages.night;
    if (hour >= 6 && hour < 12) return messages.morning;
    if (hour >= 12 && hour < 18) return messages.afternoon;
    return messages.evening;
  }, []);

  useEffect(() => {
    // Auto-expand for 3 seconds on first load
    const timer = setTimeout(() => {
      setIsExpanded(false);
    }, 3000);
    setIsExpanded(true);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Main floating button */}
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onMouseDown={() => {
          setIsPressed(true);
          handleLongPressStart();
        }}
        onMouseUp={() => {
          setIsPressed(false);
          handleLongPressEnd();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          setIsPressed(true);
          handleLongPressStart();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          setIsPressed(false);
          handleLongPressEnd();
        }}
        className={`
          fixed bottom-6 right-6 z-50
          ${discreteMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} 
          text-white rounded-full shadow-lg hover:shadow-xl
          transition-all duration-200 ease-in-out
          ${isExpanded ? 'px-6 py-4' : 'w-16 h-16'}
          ${isPressed ? 'scale-95' : 'scale-100'}
          flex items-center justify-center gap-2
          font-semibold select-none
          touch-action-none
        `}
        aria-label={discreteMode ? "Support Available" : "Crisis Help"}
        title={discreteMode ? "Hold for 2 seconds for discrete help" : getCrisisMessage()}
      >
        <div className="flex items-center gap-2">
          {discreteMode ? (
            <Heart className="w-6 h-6" />
          ) : (
            <Phone className="w-6 h-6" />
          )}
          {isExpanded && (
            <span className="whitespace-nowrap">
              {discreteMode ? "Support" : "Need Help?"}
            </span>
          )}
        </div>
      </button>

      {/* Emergency call quick action */}
      {isExpanded && !discreteMode && (
        <button
          onClick={handleEmergencyCall}
          className="
            fixed bottom-24 right-6 z-50
            bg-white text-red-600 border-2 border-red-600
            rounded-full px-4 py-2 shadow-lg
            hover:bg-red-50 transition-all duration-200
            animate-fade-in-up
            touch-action-manipulation
          "
          aria-label="Call 988 Crisis Lifeline Now"
        >
          <span className="text-sm font-medium">Call 988 Now</span>
        </button>
      )}

      {/* Discrete mode indicator */}
      {discreteMode && (
        <div className="
          fixed bottom-24 right-6 z-50
          bg-blue-100 text-blue-800 border border-blue-200
          rounded-lg px-3 py-2 shadow-sm
          animate-fade-in-up text-xs
        ">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Support ready</span>
          </div>
        </div>
      )}

      {/* Pulse animation for attention - reduced for discrete mode */}
      {!discreteMode && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="w-16 h-16 bg-red-600 rounded-full animate-ping opacity-20"></div>
        </div>
      )}

      {/* Discrete mode subtle pulse */}
      {discreteMode && (
        <div className="fixed bottom-6 right-6 z-40">
          <div className="w-16 h-16 bg-blue-400 rounded-full animate-pulse opacity-10"></div>
        </div>
      )}
    </>
  );
};

export default CrisisFloatingButton;
// Always There Button - Floating crisis help on every page
// Because you never know when someone might need it

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, X } from 'lucide-react';
import { useEmergencySupport } from '@/hooks/useEmergencySupport';
import { cn } from '@/lib/utils';

interface AlwaysThereButtonProps {
  className?: string;
}

export const AlwaysThereButton: React.FC<AlwaysThereButtonProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { call988, textCrisis, callSponsor } = useEmergencySupport();

  // Auto-hide when scrolling down, show when scrolling up
  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show when scrolling up or at top
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 300) {
        setIsVisible(false);
        setIsExpanded(false);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMainClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      // Vibrate if available
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
        className
      )}
    >
      {/* Expanded Options */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-64 bg-gray-900 rounded-2xl shadow-2xl border border-red-900 p-4 space-y-3 animate-in slide-in-from-bottom duration-300">
          {/* Close button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Close help menu"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
          
          <p className="text-xs text-gray-400 mb-2">Get help right now:</p>
          
          {/* 988 */}
          <Button
            onClick={call988}
            className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
          >
            Call 988 (Crisis Line)
          </Button>
          
          {/* Text Crisis */}
          <Button
            onClick={textCrisis}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Text HOME to 741741
          </Button>
          
          {/* Sponsor */}
          <Button
            onClick={callSponsor}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            Call My Sponsor
          </Button>
        </div>
      )}
      
      {/* Main Floating Button */}
      <Button
        onClick={handleMainClick}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg transition-all duration-300",
          "bg-red-600 hover:bg-red-700 active:scale-95",
          isExpanded && "ring-4 ring-red-600/30"
        )}
        aria-label="Get emergency help"
      >
        <Heart className="w-6 h-6 text-white" />
      </Button>
      
      {/* Pulse animation for attention */}
      {!isExpanded && (
        <div className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-20" />
      )}
    </div>
  );
};
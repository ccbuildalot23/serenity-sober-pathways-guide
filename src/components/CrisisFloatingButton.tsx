import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Phone } from 'lucide-react';

const CrisisFloatingButton: React.FC = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show on the crisis help page itself
  if (location.pathname === '/crisis-help') {
    return null;
  }

  const handleClick = () => {
    // Navigate to crisis help page
    window.location.href = '/crisis-help';
  };

  const handleEmergencyCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = 'tel:988';
  };

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
        onClick={handleClick}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`
          fixed bottom-6 right-6 z-50
          bg-red-600 hover:bg-red-700 text-white
          rounded-full shadow-lg hover:shadow-xl
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'px-6 py-4' : 'w-16 h-16'}
          flex items-center justify-center gap-2
          font-semibold
        `}
        aria-label="Crisis Help"
      >
        <div className="flex items-center gap-2">
          <Phone className="w-6 h-6" />
          {isExpanded && <span className="whitespace-nowrap">Need Help?</span>}
        </div>
      </button>

      {/* Emergency call quick action */}
      {isExpanded && (
        <button
          onClick={handleEmergencyCall}
          className="
            fixed bottom-24 right-6 z-50
            bg-white text-red-600 border-2 border-red-600
            rounded-full px-4 py-2 shadow-lg
            hover:bg-red-50 transition-all duration-200
            animate-fade-in-up
          "
        >
          <span className="text-sm font-medium">Call 988 Now</span>
        </button>
      )}

      {/* Pulse animation for attention */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="w-16 h-16 bg-red-600 rounded-full animate-ping opacity-20"></div>
      </div>
    </>
  );
};

export default CrisisFloatingButton;
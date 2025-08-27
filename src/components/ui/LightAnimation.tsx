/**
 * Lightweight animation component to replace framer-motion in non-critical areas
 * Uses CSS transitions instead of heavy animation library
 * Reduces bundle size significantly while maintaining visual appeal
 */
import React from 'react';

interface LightAnimationProps {
  children: React.ReactNode;
  type?: 'fadeIn' | 'slideUp' | 'slideDown' | 'scale' | 'none';
  duration?: number;
  delay?: number;
  className?: string;
}

const animationClasses = {
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up', 
  slideDown: 'animate-slide-down',
  scale: 'animate-scale-in',
  none: ''
};

export const LightAnimation: React.FC<LightAnimationProps> = ({
  children,
  type = 'fadeIn',
  duration = 300,
  delay = 0,
  className = ''
}) => {
  const animationClass = animationClasses[type];
  
  return (
    <div 
      className={`${animationClass} ${className}`}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
        animationFillMode: 'both'
      }}
    >
      {children}
    </div>
  );
};

// CSS-only animation keyframes to add to your tailwind config
export const lightAnimationCSS = `
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes slide-down {
  from { 
    opacity: 0; 
    transform: translateY(-20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

@keyframes scale-in {
  from { 
    opacity: 0; 
    transform: scale(0.9); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
}

.animate-fade-in { animation: fade-in ease-out; }
.animate-slide-up { animation: slide-up ease-out; }
.animate-slide-down { animation: slide-down ease-out; }
.animate-scale-in { animation: scale-in ease-out; }
`;

export default LightAnimation;
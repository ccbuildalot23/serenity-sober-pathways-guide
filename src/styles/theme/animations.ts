// Animation Constants for Therapeutic UI
// Smooth, organic movements that promote calm and reduce anxiety

export const animations = {
  // Duration Constants (in milliseconds)
  duration: {
    instant: 0,
    fast: 200,
    normal: 300,
    slow: 500,
    gentle: 800,
    breathing: 4000,
    meditation: 6000,
  },
  
  // Easing Functions for Organic Movement
  easing: {
    // Standard easings
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    
    // Custom organic easings
    gentle: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    
    // Therapeutic easings
    breathIn: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
    breathOut: 'cubic-bezier(0.4, 0.0, 1, 1)',
    float: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
    wave: 'cubic-bezier(0.36, 0.66, 0.04, 1)',
  },
  
  // Spring Animation Configurations (for Framer Motion)
  spring: {
    // Gentle spring for most interactions
    gentle: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
      mass: 1,
    },
    
    // Smooth spring for page transitions
    smooth: {
      type: 'spring',
      stiffness: 80,
      damping: 20,
      mass: 0.8,
    },
    
    // Bouncy spring for celebrations
    bouncy: {
      type: 'spring',
      stiffness: 200,
      damping: 10,
      mass: 0.5,
    },
    
    // Slow spring for meditative elements
    meditation: {
      type: 'spring',
      stiffness: 50,
      damping: 30,
      mass: 2,
    },
  },
  
  // Breathing Exercise Timings (4-7-8 pattern)
  breathing: {
    inhale: 4000, // 4 seconds
    hold: 7000, // 7 seconds
    exhale: 8000, // 8 seconds
    pause: 2000, // 2 second pause between cycles
    
    // Visual breathing guide
    visual: {
      expandScale: 1.2,
      contractScale: 0.8,
      pulseScale: 1.05,
    },
  },
  
  // Transition Presets
  transitions: {
    // Page transitions
    page: {
      duration: 300,
      ease: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    },
    
    // Card hover effects
    hover: {
      duration: 200,
      ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    },
    
    // Modal/drawer animations
    modal: {
      duration: 400,
      ease: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    },
    
    // Micro-interactions
    micro: {
      duration: 150,
      ease: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    },
    
    // Fade effects
    fade: {
      duration: 500,
      ease: 'ease-in-out',
    },
    
    // Celebration animations
    celebration: {
      duration: 2000,
      ease: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  
  // Keyframe Animations
  keyframes: {
    // Gentle floating animation
    float: `
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
      }
    `,
    
    // Breathing pulse
    breathe: `
      @keyframes breathe {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }
    `,
    
    // Ripple effect
    ripple: `
      @keyframes ripple {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(4); opacity: 0; }
      }
    `,
    
    // Soft glow
    glow: `
      @keyframes glow {
        0%, 100% { box-shadow: 0 0 20px rgba(102, 175, 140, 0.3); }
        50% { box-shadow: 0 0 40px rgba(102, 175, 140, 0.5); }
      }
    `,
    
    // Wave motion
    wave: `
      @keyframes wave {
        0% { transform: translateX(0) translateY(0); }
        25% { transform: translateX(-5px) translateY(-5px); }
        50% { transform: translateX(0) translateY(-10px); }
        75% { transform: translateX(5px) translateY(-5px); }
        100% { transform: translateX(0) translateY(0); }
      }
    `,
    
    // Shimmer effect
    shimmer: `
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }
    `,
    
    // Fade in up
    fadeInUp: `
      @keyframes fadeInUp {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }
    `,
    
    // Scale fade
    scaleFade: `
      @keyframes scaleFade {
        0% { opacity: 0; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
      }
    `,
  },
  
  // Stagger Configurations for Lists
  stagger: {
    fast: 0.05, // 50ms between items
    normal: 0.1, // 100ms between items
    slow: 0.15, // 150ms between items
    gentle: 0.2, // 200ms between items
  },
  
  // Parallax Speeds
  parallax: {
    slow: 0.2,
    normal: 0.5,
    fast: 0.8,
  },
  
  // Delay Presets
  delay: {
    none: 0,
    short: 100,
    medium: 300,
    long: 500,
    breathing: 1000,
  },
};

// CSS Animation Classes
export const animationClasses = {
  // Transitions
  'transition-all': `transition-all duration-${animations.duration.normal} ${animations.easing.gentle}`,
  'transition-colors': `transition-colors duration-${animations.duration.fast} ${animations.easing.smooth}`,
  'transition-transform': `transition-transform duration-${animations.duration.normal} ${animations.easing.gentle}`,
  'transition-opacity': `transition-opacity duration-${animations.duration.slow} ${animations.easing.smooth}`,
  
  // Hover effects
  'hover-lift': 'hover:-translate-y-1 hover:shadow-lg',
  'hover-glow': 'hover:shadow-[0_0_20px_rgba(102,175,140,0.3)]',
  'hover-scale': 'hover:scale-105',
  'hover-brighten': 'hover:brightness-110',
  
  // Active states
  'active-scale': 'active:scale-95',
  'active-darken': 'active:brightness-95',
  
  // Focus states
  'focus-ring': 'focus:ring-2 focus:ring-sage-400 focus:ring-offset-2',
  'focus-glow': 'focus:shadow-[0_0_20px_rgba(102,175,140,0.4)]',
};

// Animation Utilities
export const animationUtils = {
  // Get CSS transition string
  getTransition: (property = 'all', duration = animations.duration.normal, easing = animations.easing.gentle) => {
    return `${property} ${duration}ms ${easing}`;
  },
  
  // Get animation delay for staggered items
  getStaggerDelay: (index: number, stagger = animations.stagger.normal) => {
    return index * stagger * 1000; // Convert to milliseconds
  },
  
  // Get parallax transform
  getParallaxTransform: (scrollY: number, speed = animations.parallax.normal) => {
    return `translateY(${scrollY * speed}px)`;
  },
  
  // Check if user prefers reduced motion
  prefersReducedMotion: () => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
};

export default animations;
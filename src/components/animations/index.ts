// Animation Components
export {
  PageTransition,
  FadeTransition,
  SlideTransition,
  StaggerList,
  withPageTransition,
  ContentReveal,
  GentleScale,
} from './PageTransition';

export {
  FloatingElement,
  ParallaxElement,
  BreathingBackground,
  FloatingOrbs,
  GentleWaves,
  FloatingParticles,
  ScrollReveal,
} from './FloatingElements';

export {
  BreathingCircle,
} from './BreathingCircle';

export {
  CelebrationAnimation,
  ProgressCelebration,
} from './CelebrationAnimation';

// Animation Hooks
export {
  useScrollAnimations,
  useParallax,
  useFadeInOnScroll,
  useStaggeredAnimation,
  useElementScrollProgress,
  useScrollDirection,
  useIntersectionAnimation,
} from '../../hooks/useScrollAnimations';

// Animation Types
export type AnimationType = 'fade' | 'slide' | 'scale' | 'flip';
export type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'pause';
export type CelebrationType = 'milestone' | 'achievement' | 'progress' | 'daily' | 'breakthrough';
export type FloatingDirection = 'vertical' | 'horizontal' | 'circular';
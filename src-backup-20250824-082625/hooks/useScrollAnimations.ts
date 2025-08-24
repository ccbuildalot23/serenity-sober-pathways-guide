import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollAnimationsProps {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface ScrollAnimationReturn {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
  scrollY: number;
  scrollProgress: number;
  isNearTop: boolean;
  isNearBottom: boolean;
}

export const useScrollAnimations = ({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
}: UseScrollAnimationsProps = {}): ScrollAnimationReturn => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isNearTop, setIsNearTop] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(false);

  // Throttled scroll handler for performance
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = documentHeight > 0 ? currentScrollY / documentHeight : 0;
    
    setScrollY(currentScrollY);
    setScrollProgress(Math.min(Math.max(progress, 0), 1));
    setIsNearTop(currentScrollY < 100);
    setIsNearBottom(progress > 0.9);
  }, []);

  // Throttle scroll events for better performance
  useEffect(() => {
    let ticking = false;
    
    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [handleScroll]);

  // Intersection Observer for visibility detection
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        
        if (isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return {
    ref,
    isVisible,
    scrollY,
    scrollProgress,
    isNearTop,
    isNearBottom,
  };
};

// Hook for parallax effects
export const useParallax = (speed: number = 0.5) => {
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setOffsetY(window.scrollY * speed);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return offsetY;
};

// Hook for fade in on scroll with customizable options
export const useFadeInOnScroll = (options: UseScrollAnimationsProps = {}) => {
  const { ref, isVisible } = useScrollAnimations({
    threshold: 0.2,
    triggerOnce: true,
    ...options,
  });

  return {
    ref,
    style: {
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
      transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
    },
    isVisible,
  };
};

// Hook for staggered animations
export const useStaggeredAnimation = (
  itemCount: number,
  staggerDelay: number = 0.1
) => {
  const { ref, isVisible } = useScrollAnimations({
    threshold: 0.1,
    triggerOnce: true,
  });

  const getItemStyle = (index: number) => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
    transition: `opacity 0.6s ease-out ${index * staggerDelay}s, transform 0.6s ease-out ${index * staggerDelay}s`,
  });

  return { ref, getItemStyle, isVisible };
};

// Hook for scroll progress tracking on specific elements
export const useElementScrollProgress = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const element = ref.current;
          if (!element) return;

          const rect = element.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const elementHeight = rect.height;
          const elementTop = rect.top;

          // Calculate progress: 0 when element is just entering, 1 when it's fully passed
          let scrollProgress = 0;
          
          if (elementTop <= windowHeight && elementTop + elementHeight >= 0) {
            const visibleHeight = Math.min(windowHeight - Math.max(elementTop, 0), elementHeight);
            const totalScrollDistance = windowHeight + elementHeight;
            const scrolled = windowHeight - elementTop;
            scrollProgress = Math.min(Math.max(scrolled / totalScrollDistance, 0), 1);
          } else if (elementTop < 0) {
            scrollProgress = 1;
          }

          setProgress(scrollProgress);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { ref, progress };
};

// Hook for scroll direction detection
export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setScrollDirection('down');
          } else if (currentScrollY < lastScrollY) {
            setScrollDirection('up');
          }
          
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return scrollDirection;
};

// Hook for intersection-based animations with enhanced options
export const useIntersectionAnimation = (
  options: IntersectionObserverInit & {
    animationType?: 'fade' | 'slide' | 'scale' | 'flip';
    delay?: number;
  } = {}
) => {
  const {
    threshold = 0.2,
    rootMargin = '0px',
    animationType = 'fade',
    delay = 0,
    ...observerOptions
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setIsVisible(true), delay * 1000);
          } else {
            setIsVisible(true);
          }
        }
      },
      {
        threshold,
        rootMargin,
        ...observerOptions,
      }
    );

    observer.observe(element);

    return () => observer.unobserve(element);
  }, [threshold, rootMargin, delay]);

  const getAnimationStyle = () => {
    const baseStyle = {
      transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    };

    switch (animationType) {
      case 'slide':
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        };
      case 'scale':
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
        };
      case 'flip':
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'rotateY(0)' : 'rotateY(-90deg)',
        };
      default: // fade
        return {
          ...baseStyle,
          opacity: isVisible ? 1 : 0,
        };
    }
  };

  return {
    ref,
    isVisible,
    style: getAnimationStyle(),
  };
};
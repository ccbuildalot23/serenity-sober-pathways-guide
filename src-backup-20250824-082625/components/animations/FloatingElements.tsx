import { motion } from "framer-motion";
import { ReactNode, useRef, useEffect, useState } from "react";
import { useScrollAnimations } from "../../hooks/useScrollAnimations";

interface FloatingElementProps {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  direction?: 'vertical' | 'horizontal' | 'circular';
  className?: string;
}

interface ParallaxElementProps {
  children: ReactNode;
  offset?: number;
  className?: string;
}

interface FloatingBackgroundProps {
  className?: string;
  count?: number;
}

// Gentle floating animation variants
const floatingVariants = {
  float: {
    y: [-8, 8, -8],
    transition: {
      duration: 4,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
  floatHorizontal: {
    x: [-6, 6, -6],
    transition: {
      duration: 5,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
  floatCircular: {
    rotate: [0, 360],
    transition: {
      duration: 20,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

// Organic breathing-like animation
const breathingVariants = {
  breathe: {
    scale: [1, 1.05, 1],
    opacity: [0.6, 0.8, 0.6],
    transition: {
      duration: 6,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

export const FloatingElement = ({
  children,
  amplitude = 8,
  duration = 4,
  delay = 0,
  direction = 'vertical',
  className = "",
}: FloatingElementProps) => {
  const getFloatingAnimation = () => {
    switch (direction) {
      case 'horizontal':
        return {
          x: [-amplitude, amplitude, -amplitude],
          transition: {
            duration,
            delay,
            ease: "easeInOut",
            repeat: Infinity,
          },
        };
      case 'circular':
        return {
          x: [0, amplitude, 0, -amplitude, 0],
          y: [0, -amplitude, 0, amplitude, 0],
          transition: {
            duration: duration * 2,
            delay,
            ease: "easeInOut",
            repeat: Infinity,
          },
        };
      default: // vertical
        return {
          y: [-amplitude, amplitude, -amplitude],
          transition: {
            duration,
            delay,
            ease: "easeInOut",
            repeat: Infinity,
          },
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        ...getFloatingAnimation(),
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const ParallaxElement = ({
  children,
  offset = 0.5,
  className = "",
}: ParallaxElementProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [elementTop, setElementTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    setElementTop(rect.top + window.scrollY);
    setClientHeight(window.innerHeight);
  }, []);

  const parallaxOffset = (scrollY - elementTop + clientHeight) * offset;

  return (
    <motion.div
      ref={ref}
      style={{ y: parallaxOffset }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const BreathingBackground = ({ className = "" }: { className?: string }) => {
  return (
    <motion.div
      variants={breathingVariants}
      animate="breathe"
      className={`absolute inset-0 ${className}`}
      style={{
        background: "radial-gradient(circle, rgba(139, 195, 74, 0.1) 0%, transparent 70%)",
      }}
    />
  );
};

export const FloatingOrbs = ({ className = "", count = 3 }: FloatingBackgroundProps) => {
  const orbs = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: i * 2,
    amplitude: 15 + (i * 5),
    duration: 8 + (i * 2),
    size: 60 + (i * 20),
    opacity: 0.1 - (i * 0.02),
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {orbs.map((orb) => (
        <FloatingElement
          key={orb.id}
          amplitude={orb.amplitude}
          duration={orb.duration}
          delay={orb.delay}
          direction="circular"
          className={`absolute rounded-full bg-gradient-to-br from-blue-400 to-green-400`}
          style={{
            width: orb.size,
            height: orb.size,
            opacity: orb.opacity,
            left: `${20 + (orb.id * 25)}%`,
            top: `${30 + (orb.id * 15)}%`,
          }}
        >
          <div />
        </FloatingElement>
      ))}
    </div>
  );
};

export const GentleWaves = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        animate={{
          x: ["-100%", "0%", "-100%"],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 15,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        className="absolute top-0 left-0 w-full h-full"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(139, 195, 74, 0.1), transparent)",
        }}
      />
      <motion.div
        animate={{
          x: ["100%", "0%", "100%"],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 12,
          ease: "easeInOut",
          repeat: Infinity,
          delay: 3,
        }}
        className="absolute top-0 left-0 w-full h-full"
        style={{
          background: "linear-gradient(270deg, transparent, rgba(33, 150, 243, 0.1), transparent)",
        }}
      />
    </div>
  );
};

// Nature-inspired floating particles
export const FloatingParticles = ({ className = "", count = 8 }: FloatingBackgroundProps) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: i * 1.5,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 8 + Math.random() * 6,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [particle.y + "%", (particle.y - 20) + "%"],
            x: [particle.x + "%", (particle.x + 10) + "%", particle.x + "%"],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="absolute rounded-full bg-green-300"
          style={{
            width: particle.size,
            height: particle.size,
            left: particle.x + "%",
            top: particle.y + "%",
          }}
        />
      ))}
    </div>
  );
};

// Therapeutic scroll-triggered animation wrapper
export const ScrollReveal = ({ 
  children, 
  className = "",
  threshold = 0.1,
}: {
  children: ReactNode;
  className?: string;
  threshold?: number;
}) => {
  const { ref, isVisible } = useScrollAnimations({ threshold });

  return (
    <motion.div
      ref={ref}
      initial={{ 
        opacity: 0, 
        y: 30,
        filter: "blur(3px)",
      }}
      animate={isVisible ? { 
        opacity: 1, 
        y: 0,
        filter: "blur(0px)",
      } : {}}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
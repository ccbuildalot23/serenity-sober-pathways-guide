import { motion, AnimatePresence, Variants } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

interface StaggerListProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
}

// Gentle, therapeutic page transition variants
const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94], // Calm easing curve
    },
  },
  out: {
    opacity: 0,
    y: -10,
    scale: 0.99,
    transition: {
      duration: 0.4,
      ease: [0.55, 0.06, 0.68, 0.19], // Smooth exit
    },
  },
};

// Gentle fade transition for sensitive content
const fadeVariants: Variants = {
  initial: { 
    opacity: 0,
    filter: "blur(2px)",
  },
  in: { 
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
  out: { 
    opacity: 0,
    filter: "blur(1px)",
    transition: {
      duration: 0.5,
      ease: "easeIn",
    },
  },
};

// Slide from side (for navigation)
const slideVariants: Variants = {
  initial: {
    opacity: 0,
    x: -30,
  },
  in: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1], // easeOutQuart - very smooth
    },
  },
  out: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

// Stagger children animation for lists
const containerVariants: Variants = {
  initial: {},
  in: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  out: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const childVariants: Variants = {
  initial: {
    opacity: 0,
    y: 15,
    scale: 0.95,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  out: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

export const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const FadeTransition = ({ children, className = "" }: PageTransitionProps) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={fadeVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const SlideTransition = ({ children, className = "" }: PageTransitionProps) => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={slideVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerList = ({ 
  children, 
  className = "", 
  staggerDelay = 0.1 
}: StaggerListProps) => {
  const customContainerVariants = {
    ...containerVariants,
    in: {
      ...containerVariants.in,
      transition: {
        ...containerVariants.in?.transition,
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={customContainerVariants}
      className={className}
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={childVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Higher-order component for page transitions
export const withPageTransition = <T extends object>(
  Component: React.ComponentType<T>
) => {
  return function AnimatedComponent(props: T) {
    return (
      <AnimatePresence mode="wait">
        <PageTransition>
          <Component {...props} />
        </PageTransition>
      </AnimatePresence>
    );
  };
};

// Therapeutic content reveal animation
export const ContentReveal = ({ children, className = "" }: PageTransitionProps) => {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: 25, 
        clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)" 
      }}
      animate={{ 
        opacity: 1, 
        y: 0,
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
      }}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
        clipPath: { delay: 0.2, duration: 0.6 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Gentle scale animation for interactive elements
export const GentleScale = ({ children, className = "" }: PageTransitionProps) => {
  return (
    <motion.div
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1, ease: "easeIn" }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
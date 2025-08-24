import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useState, useEffect, ReactNode } from "react";
import { CheckCircle, Star, Heart, Sparkles, Trophy, Target } from "lucide-react";

interface CelebrationAnimationProps {
  isVisible: boolean;
  type?: 'milestone' | 'achievement' | 'progress' | 'daily' | 'breakthrough';
  title?: string;
  message?: string;
  onComplete?: () => void;
  autoHide?: boolean;
  duration?: number;
  className?: string;
}

interface FloatingIconProps {
  Icon: React.ComponentType<any>;
  delay?: number;
  startX?: number;
  startY?: number;
}

const celebrationTypes = {
  milestone: {
    icon: Trophy,
    colors: {
      primary: "from-yellow-400 to-orange-500",
      secondary: "from-yellow-200 to-yellow-400",
      accent: "text-yellow-600",
    },
    particles: 12,
    message: "Incredible milestone reached!",
  },
  achievement: {
    icon: Star,
    colors: {
      primary: "from-purple-400 to-pink-500", 
      secondary: "from-purple-200 to-purple-400",
      accent: "text-purple-600",
    },
    particles: 10,
    message: "Achievement unlocked!",
  },
  progress: {
    icon: Target,
    colors: {
      primary: "from-blue-400 to-indigo-500",
      secondary: "from-blue-200 to-blue-400", 
      accent: "text-blue-600",
    },
    particles: 8,
    message: "Great progress made!",
  },
  daily: {
    icon: CheckCircle,
    colors: {
      primary: "from-green-400 to-emerald-500",
      secondary: "from-green-200 to-green-400",
      accent: "text-green-600",
    },
    particles: 6,
    message: "Daily goal completed!",
  },
  breakthrough: {
    icon: Heart,
    colors: {
      primary: "from-pink-400 to-red-500",
      secondary: "from-pink-200 to-pink-400",
      accent: "text-pink-600",
    },
    particles: 15,
    message: "Amazing breakthrough!",
  },
};

const FloatingIcon = ({ Icon, delay = 0, startX = 50, startY = 50 }: FloatingIconProps) => {
  const randomX = startX + (Math.random() - 0.5) * 200;
  const randomY = startY + (Math.random() - 0.5) * 150;
  const endX = randomX + (Math.random() - 0.5) * 100;
  const endY = randomY - 100 - Math.random() * 50;

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0,
        x: startX,
        y: startY,
        rotate: 0,
      }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 1, 0.8],
        x: [startX, randomX, endX],
        y: [startY, randomY, endY],
        rotate: [0, Math.random() * 360],
      }}
      transition={{
        duration: 3,
        delay,
        ease: "easeOut",
        times: [0, 0.2, 0.8, 1],
      }}
      className="absolute pointer-events-none"
    >
      <Icon className="w-6 h-6 text-white/80" />
    </motion.div>
  );
};

const ShimmerParticles = ({ count, colors }: { count: number; colors: any }) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: i * 0.1,
    duration: 2 + Math.random() * 2,
    startX: Math.random() * 300 - 150,
    startY: Math.random() * 300 - 150,
    endX: (Math.random() - 0.5) * 400,
    endY: -100 - Math.random() * 100,
    size: 2 + Math.random() * 4,
  }));

  return (
    <>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            opacity: 0,
            scale: 0,
            x: particle.startX,
            y: particle.startY,
          }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0],
            x: [particle.startX, particle.endX],
            y: [particle.startY, particle.endY],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: "easeOut",
          }}
          className={`absolute rounded-full bg-gradient-to-br ${colors.secondary} shadow-lg`}
          style={{
            width: particle.size,
            height: particle.size,
          }}
        />
      ))}
    </>
  );
};

const RippleEffect = ({ colors }: { colors: any }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{
          duration: 1.5,
          ease: "easeOut",
        }}
        className={`w-32 h-32 rounded-full border-4 border-gradient-to-br ${colors.primary}`}
      />
      <motion.div
        initial={{ scale: 0, opacity: 0.6 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{
          duration: 1.5,
          delay: 0.2,
          ease: "easeOut",
        }}
        className={`absolute w-32 h-32 rounded-full border-2 border-gradient-to-br ${colors.secondary}`}
      />
    </div>
  );
};

export const CelebrationAnimation = ({
  isVisible,
  type = 'achievement',
  title,
  message,
  onComplete,
  autoHide = true,
  duration = 4000,
  className = "",
}: CelebrationAnimationProps) => {
  const [showContent, setShowContent] = useState(false);
  const controls = useAnimation();
  
  const config = celebrationTypes[type];
  const { icon: Icon, colors, particles } = config;
  
  const displayTitle = title || config.message;
  const displayMessage = message || "Keep up the amazing work!";

  useEffect(() => {
    if (isVisible) {
      setShowContent(true);
      controls.start("visible");
      
      if (autoHide) {
        const timer = setTimeout(() => {
          controls.start("exit");
          setTimeout(() => {
            setShowContent(false);
            onComplete?.();
          }, 500);
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      controls.start("exit");
      setTimeout(() => setShowContent(false), 500);
    }
  }, [isVisible, controls, autoHide, duration, onComplete]);

  const containerVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -20,
      transition: {
        duration: 0.3,
        ease: "easeIn",
      },
    },
  };

  return (
    <AnimatePresence>
      {showContent && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none ${className}`}
          style={{ 
            background: "rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(1px)",
          }}
        >
          {/* Main celebration container */}
          <div className="relative">
            {/* Background ripple effect */}
            <RippleEffect colors={colors} />
            
            {/* Floating particles */}
            <ShimmerParticles count={particles} colors={colors} />
            
            {/* Floating icons */}
            {Array.from({ length: 6 }, (_, i) => (
              <FloatingIcon
                key={i}
                Icon={i % 2 === 0 ? Sparkles : Icon}
                delay={i * 0.2}
                startX={Math.random() * 60 - 30}
                startY={Math.random() * 60 - 30}
              />
            ))}

            {/* Central content card */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
              }}
              transition={{
                delay: 0.2,
                duration: 0.5,
                ease: "easeOut",
              }}
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm mx-auto text-center overflow-hidden"
            >
              {/* Gradient background */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${colors.primary} opacity-5`}
              />
              
              {/* Main icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.4,
                  duration: 0.6,
                  ease: "easeOut",
                }}
                className={`relative mx-auto w-16 h-16 bg-gradient-to-br ${colors.primary} rounded-full flex items-center justify-center mb-4 shadow-lg`}
              >
                <Icon className="w-8 h-8 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.6,
                  duration: 0.4,
                }}
                className={`text-xl font-bold mb-2 ${colors.accent}`}
              >
                {displayTitle}
              </motion.h3>

              {/* Message */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.8,
                  duration: 0.4,
                }}
                className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
              >
                {displayMessage}
              </motion.p>

              {/* Subtle sparkle overlay */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-2 right-2"
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Progress completion animation
export const ProgressCelebration = ({ 
  progress, 
  isCompleted,
  onComplete,
}: {
  progress: number;
  isCompleted: boolean;
  onComplete?: () => void;
}) => {
  return (
    <motion.div className="relative">
      <motion.div
        className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden"
        whileHover={{ scale: 1.02 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
          }}
        >
          {/* Sparkle effect when completed */}
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
              >
                <Sparkles className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
      
      <CelebrationAnimation
        isVisible={isCompleted}
        type="progress"
        onComplete={onComplete}
      />
    </motion.div>
  );
};

export default CelebrationAnimation;
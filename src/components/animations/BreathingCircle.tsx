import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { PlayIcon, PauseIcon, RotateCcw } from "lucide-react";

interface BreathingCircleProps {
  className?: string;
  size?: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'pause';

// Breathing pattern: 4 seconds inhale, 7 seconds hold, 8 seconds exhale
const BREATHING_PATTERN = {
  inhale: 4000,
  hold: 7000,
  exhale: 8000,
  pause: 1000,
};

const TOTAL_CYCLE_TIME = Object.values(BREATHING_PATTERN).reduce((a, b) => a + b, 0);

const phaseMessages = {
  inhale: "Breathe in slowly through your nose",
  hold: "Hold your breath gently", 
  exhale: "Exhale slowly through your mouth",
  pause: "Rest and prepare for the next breath",
};

const phaseColors = {
  inhale: {
    from: "from-blue-400",
    to: "to-blue-600",
    glow: "shadow-blue-400/50",
  },
  hold: {
    from: "from-purple-400", 
    to: "to-purple-600",
    glow: "shadow-purple-400/50",
  },
  exhale: {
    from: "from-green-400",
    to: "to-green-600", 
    glow: "shadow-green-400/50",
  },
  pause: {
    from: "from-gray-400",
    to: "to-gray-500",
    glow: "shadow-gray-400/30",
  },
};

export const BreathingCircle = ({
  className = "",
  size = 200,
  onComplete,
  autoStart = false,
}: BreathingCircleProps) => {
  const [isActive, setIsActive] = useState(autoStart);
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase>('pause');
  const [cycleCount, setCycleCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);

  const getCircleScale = useCallback((phase: BreathingPhase) => {
    switch (phase) {
      case 'inhale':
        return 1.4;
      case 'hold':
        return 1.4;
      case 'exhale':
        return 0.8;
      case 'pause':
        return 1;
      default:
        return 1;
    }
  }, []);

  const getAnimationDuration = useCallback((phase: BreathingPhase) => {
    return BREATHING_PATTERN[phase] / 1000; // Convert to seconds for Framer Motion
  }, []);

  const nextPhase = useCallback((current: BreathingPhase): BreathingPhase => {
    const phases: BreathingPhase[] = ['inhale', 'hold', 'exhale', 'pause'];
    const currentIndex = phases.indexOf(current);
    const nextIndex = (currentIndex + 1) % phases.length;
    
    if (nextIndex === 0) {
      setCycleCount(prev => prev + 1);
    }
    
    return phases[nextIndex];
  }, []);

  const startBreathing = () => {
    setIsActive(true);
    setShowInstructions(false);
    setCurrentPhase('inhale');
  };

  const pauseBreathing = () => {
    setIsActive(false);
  };

  const resetBreathing = () => {
    setIsActive(false);
    setCurrentPhase('pause');
    setCycleCount(0);
    setTimeRemaining(0);
    setShowInstructions(true);
  };

  useEffect(() => {
    if (!isActive) return;

    const phaseTimer = setTimeout(() => {
      setCurrentPhase(nextPhase);
    }, BREATHING_PATTERN[currentPhase]);

    // Countdown timer
    const startTime = Date.now();
    const countdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, BREATHING_PATTERN[currentPhase] - elapsed);
      setTimeRemaining(Math.ceil(remaining / 1000));
      
      if (remaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 100);

    return () => {
      clearTimeout(phaseTimer);
      clearInterval(countdownInterval);
    };
  }, [currentPhase, isActive, nextPhase]);

  // Complete callback after 5 cycles
  useEffect(() => {
    if (cycleCount >= 5 && onComplete) {
      onComplete();
    }
  }, [cycleCount, onComplete]);

  const currentColors = phaseColors[currentPhase];

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardContent className="p-6 text-center">
        <div className="space-y-6">
          {/* Instructions */}
          <AnimatePresence>
            {showInstructions && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2"
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  4-7-8 Breathing Exercise
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This technique helps reduce anxiety and promote relaxation
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Breathing Circle */}
          <div className="relative flex items-center justify-center">
            <motion.div
              className={`absolute rounded-full bg-gradient-to-br ${currentColors.from} ${currentColors.to} shadow-2xl ${currentColors.glow}`}
              style={{ width: size, height: size }}
              animate={{
                scale: getCircleScale(currentPhase),
                opacity: isActive ? 0.8 : 0.4,
              }}
              transition={{
                duration: getAnimationDuration(currentPhase),
                ease: currentPhase === 'inhale' ? "easeIn" : 
                      currentPhase === 'exhale' ? "easeOut" : "linear",
              }}
            />
            
            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center justify-center space-y-2">
              <AnimatePresence mode="wait">
                {isActive && (
                  <motion.div
                    key={currentPhase}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="text-center"
                  >
                    <div className="text-2xl font-bold text-white mb-1">
                      {timeRemaining}
                    </div>
                    <div className="text-sm font-medium text-white/90 capitalize">
                      {currentPhase}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {!isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Ready to breathe?
                  </div>
                </motion.div>
              )}
            </div>

            {/* Breathing rings */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  className="absolute rounded-full border-2 border-white/30"
                  style={{ width: size + 40, height: size + 40 }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: [0.8, 1.2, 0.8],
                    opacity: [0.3, 0.1, 0.3],
                  }}
                  transition={{
                    duration: TOTAL_CYCLE_TIME / 1000,
                    ease: "easeInOut",
                    repeat: Infinity,
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Phase instruction */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-6"
            >
              {isActive && (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {phaseMessages[currentPhase]}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="flex justify-center space-x-3">
            {!isActive ? (
              <Button onClick={startBreathing} className="flex items-center space-x-2">
                <PlayIcon className="w-4 h-4" />
                <span>Start</span>
              </Button>
            ) : (
              <Button onClick={pauseBreathing} variant="secondary" className="flex items-center space-x-2">
                <PauseIcon className="w-4 h-4" />
                <span>Pause</span>
              </Button>
            )}
            
            <Button onClick={resetBreathing} variant="outline" size="icon">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress */}
          <AnimatePresence>
            {cycleCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Completed cycles: {cycleCount} / 5
                </p>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="h-2 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (cycleCount / 5) * 100)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Completion message */}
          <AnimatePresence>
            {cycleCount >= 5 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg"
              >
                <p className="text-green-800 dark:text-green-200 font-medium">
                  🌟 Great job! You've completed your breathing session.
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Take a moment to notice how you feel.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default BreathingCircle;
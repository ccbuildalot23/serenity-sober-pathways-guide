
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Square, CheckCircle } from 'lucide-react';

interface UrgeSurfingTimerProps {
  onComplete: () => void;
}

const UrgeSurfingTimer: React.FC<UrgeSurfingTimerProps> = ({ onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentGuidance, setCurrentGuidance] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const totalDuration = 120; // 2 minutes in seconds
  
  const guidance = [
    {
      time: 0,
      message: "Notice the urge without fighting it",
      description: "Simply observe what you're feeling without judgment"
    },
    {
      time: 30,
      message: "Urges are like waves - they build, peak, and naturally subside",
      description: "This feeling will pass, just like a wave in the ocean"
    },
    {
      time: 60,
      message: "You don't need to act on this feeling",
      description: "You have the power to observe without acting"
    },
    {
      time: 90,
      message: "Let the wave pass through you",
      description: "Breathe and allow the sensation to flow naturally"
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeElapsed < totalDuration) {
      interval = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          
          // Update guidance based on time
          const nextGuidanceIndex = guidance.findIndex(g => g.time > newTime) - 1;
          const validIndex = Math.max(0, nextGuidanceIndex >= 0 ? nextGuidanceIndex : guidance.length - 1);
          setCurrentGuidance(validIndex);
          
          // Complete when time is up
          if (newTime >= totalDuration) {
            setIsActive(false);
            setIsCompleted(true);
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeElapsed]);

  const handleStart = () => {
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleStop = () => {
    setIsActive(false);
    setTimeElapsed(0);
    setCurrentGuidance(0);
    setIsCompleted(false);
  };

  const progress = (timeElapsed / totalDuration) * 100;
  const waveHeight = Math.sin((timeElapsed / totalDuration) * Math.PI * 2) * 0.3 + 0.5;
  const waveOffset = (timeElapsed / totalDuration) * 200;

  // Completion screen
  if (isCompleted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">Wave Successfully Surfed!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium">You rode out the wave successfully</p>
          <p className="text-sm text-gray-600">
            You've proven to yourself that urges pass naturally when you don't fight them. 
            Notice how you feel now compared to when you started.
          </p>
          <div className="space-y-2">
            <Button onClick={handleStop} variant="outline" className="w-full">
              Try Again
            </Button>
            <Button onClick={onComplete} className="w-full">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Urge Surfing</CardTitle>
        <p className="text-sm text-gray-600">2-minute guided wave meditation</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wave Animation */}
        <div className="relative h-32 bg-gradient-to-b from-blue-100 to-blue-300 rounded-lg overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 200 100"
            preserveAspectRatio="none"
          >
            <path
              d={`M0,50 Q50,${50 - waveHeight * 30} 100,50 T200,50 L200,100 L0,100 Z`}
              fill="rgba(59, 130, 246, 0.6)"
              style={{
                transform: `translateX(-${waveOffset % 100}px)`,
                transition: 'transform 1s ease-in-out'
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-blue-800 font-semibold text-lg bg-white/80 px-3 py-1 rounded">
              {formatTime(totalDuration - timeElapsed)}
            </span>
          </div>
        </div>

        {/* Current Guidance */}
        <div className="text-center space-y-3 min-h-[80px]">
          <p className="text-lg font-medium text-blue-800">
            {guidance[currentGuidance]?.message}
          </p>
          <p className="text-sm text-gray-600">
            {guidance[currentGuidance]?.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{formatTime(timeElapsed)} / {formatTime(totalDuration)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!isActive ? (
            <Button onClick={handleStart} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              {timeElapsed > 0 ? 'Resume' : 'Start'}
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" className="flex items-center gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}
          
          <Button onClick={handleStop} variant="outline" className="flex items-center gap-2">
            <Square className="w-4 h-4" />
            Reset
          </Button>
        </div>

        {/* Emergency Exit */}
        <Button onClick={onComplete} variant="destructive" className="w-full">
          Exit Exercise
        </Button>
      </CardContent>
    </Card>
  );
};

export default UrgeSurfingTimer;

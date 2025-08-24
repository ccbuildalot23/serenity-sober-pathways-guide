
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, Square, Volume2, VolumeX } from 'lucide-react';

interface BoxBreathingTimerProps {
  onComplete: () => void;
}

const BoxBreathingTimer: React.FC<BoxBreathingTimerProps> = ({ onComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [phaseTime, setPhaseTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(2); // minutes
  const [audioEnabled, setAudioEnabled] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const phaseDuration = 4000; // 4 seconds per phase
  const cycleTime = phaseDuration * 4; // 16 seconds per complete cycle
  const totalDuration = selectedDuration * 60 * 1000; // convert minutes to milliseconds

  const phaseInstructions = {
    inhale: "Breathe in",
    hold1: "Hold",
    exhale: "Breathe out", 
    hold2: "Hold"
  };

  const phaseColors = {
    inhale: "from-blue-400 to-blue-600",
    hold1: "from-purple-400 to-purple-600",
    exhale: "from-green-400 to-green-600",
    hold2: "from-yellow-400 to-yellow-600"
  };

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setPhaseTime(prev => prev + 100);
        setTotalTime(prev => prev + 100);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (phaseTime >= phaseDuration) {
      setPhaseTime(0);
      setPhase(prev => {
        switch (prev) {
          case 'inhale': return 'hold1';
          case 'hold1': return 'exhale';
          case 'exhale': return 'hold2';
          case 'hold2': return 'inhale';
          default: return 'inhale';
        }
      });
    }
  }, [phaseTime]);

  useEffect(() => {
    if (totalTime >= totalDuration && isActive) {
      handleComplete();
    }
  }, [totalTime, totalDuration, isActive]);

  const handleStart = () => {
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleStop = () => {
    setIsActive(false);
    setPhase('inhale');
    setPhaseTime(0);
    setTotalTime(0);
  };

  const handleComplete = () => {
    setIsActive(false);
    onComplete();
  };

  const progress = (phaseTime / phaseDuration) * 100;
  const totalProgress = (totalTime / totalDuration) * 100;
  const circleScale = phase === 'inhale' ? 1 + (progress / 100) * 0.5 : 
                     phase === 'exhale' ? 1.5 - (progress / 100) * 0.5 : 
                     phase === 'hold1' ? 1.5 : 1;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Box Breathing</CardTitle>
        <p className="text-sm text-gray-600">4-4-4-4 breathing pattern</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Duration Selection */}
        {!isActive && totalTime === 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Session Duration</label>
            <div className="flex gap-2">
              {[2, 5, 10].map(duration => (
                <Button
                  key={duration}
                  variant={selectedDuration === duration ? "default" : "outline"}
                  onClick={() => setSelectedDuration(duration)}
                  className="flex-1"
                >
                  {duration} min
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Breathing Circle */}
        <div className="flex justify-center items-center h-48">
          <div 
            className={`w-32 h-32 rounded-full bg-gradient-to-br ${phaseColors[phase]} transition-all duration-1000 ease-in-out flex items-center justify-center`}
            style={{ transform: `scale(${circleScale})` }}
          >
            <span className="text-white font-semibold text-lg">
              {phaseInstructions[phase]}
            </span>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="capitalize">{phase.replace('1', '').replace('2', '')}</span>
            <span>{Math.ceil((phaseDuration - phaseTime) / 1000)}s</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Total Progress */}
        {totalTime > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Progress</span>
              <span>{Math.floor((totalDuration - totalTime) / 60000)}m {Math.floor(((totalDuration - totalTime) % 60000) / 1000)}s</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-100"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!isActive ? (
            <Button onClick={handleStart} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Start
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" className="flex items-center gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}
          
          <Button onClick={handleStop} variant="outline" className="flex items-center gap-2">
            <Square className="w-4 h-4" />
            Stop
          </Button>

          <Button
            onClick={() => setAudioEnabled(!audioEnabled)}
            variant="ghost"
            size="icon"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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

export default BoxBreathingTimer;

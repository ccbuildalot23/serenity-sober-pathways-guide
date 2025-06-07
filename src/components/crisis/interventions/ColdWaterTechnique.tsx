
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Snowflake, Timer, Play, Pause, CheckCircle, AlertTriangle } from 'lucide-react';

interface ColdWaterTechniqueProps {
  onComplete: () => void;
}

const techniques = [
  {
    id: 'ice-cube',
    name: "Ice Cube Hold",
    duration: 30,
    instruction: "Hold ice cubes in your hands for 30 seconds",
    description: "Place ice cubes in your palms and close your hands around them",
    icon: Snowflake,
    safety: "Stop immediately if you feel pain or numbness"
  },
  {
    id: 'cold-face',
    name: "Cold Face Splash", 
    duration: 60,
    instruction: "Splash cold water on your face for 1 minute",
    description: "Use cold (not freezing) water to splash your face and temples",
    icon: Snowflake,
    safety: "Use comfortably cold water, not ice water"
  },
  {
    id: 'cold-shower',
    name: "Cold Shower",
    duration: 300,
    instruction: "Take a brief cold shower for 5 minutes",
    description: "Start with cool water and gradually make it colder",
    icon: Snowflake,
    safety: "Gradually adjust temperature, exit if you feel dizzy"
  }
];

const ColdWaterTechnique: React.FC<ColdWaterTechniqueProps> = ({ onComplete }) => {
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentTechnique = techniques.find(t => t.id === selectedTechnique);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining]);

  const handleSelectTechnique = (techniqueId: string) => {
    const technique = techniques.find(t => t.id === techniqueId);
    if (technique) {
      setSelectedTechnique(techniqueId);
      setTimeRemaining(technique.duration);
      setIsCompleted(false);
    }
  };

  const handleStart = () => {
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setSelectedTechnique(null);
    setTimeRemaining(0);
    setIsCompleted(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Technique selection screen
  if (!selectedTechnique) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Snowflake className="w-5 h-5 text-blue-500" />
            Cold Water Technique
          </CardTitle>
          <p className="text-sm text-gray-600">
            Activates your body's dive response, naturally calming your nervous system
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These techniques use cold to activate your mammalian dive response. 
              Stop immediately if you feel pain, numbness, or dizziness.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {techniques.map((technique) => {
              const Icon = technique.icon;
              return (
                <Button
                  key={technique.id}
                  onClick={() => handleSelectTechnique(technique.id)}
                  variant="outline"
                  className="w-full h-auto p-4 flex flex-col items-start gap-2"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">{technique.name}</span>
                    <span className="ml-auto text-sm text-gray-500">
                      {technique.duration < 60 ? `${technique.duration}s` : `${technique.duration / 60}m`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 text-left">{technique.description}</p>
                </Button>
              );
            })}
          </div>

          <Button onClick={onComplete} variant="ghost" className="w-full">
            Back to Crisis Tools
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Completion screen
  if (isCompleted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-green-600">Technique Complete!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium">
            You successfully completed the {currentTechnique?.name}
          </p>
          <p className="text-sm text-gray-600">
            Your nervous system should feel calmer now. Notice how your body feels.
          </p>
          <div className="space-y-2">
            <Button onClick={handleReset} variant="outline" className="w-full">
              Try Another Technique
            </Button>
            <Button onClick={onComplete} className="w-full">
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active technique screen
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Snowflake className="w-5 h-5 text-blue-500" />
          {currentTechnique?.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="text-center space-y-2">
          <p className="font-medium">{currentTechnique?.instruction}</p>
          <p className="text-sm text-gray-600">{currentTechnique?.description}</p>
        </div>

        {/* Timer Display */}
        <div className="text-center">
          <div className="text-6xl font-bold text-blue-600 mb-2">
            {formatTime(timeRemaining)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-1000"
              style={{ 
                width: `${((currentTechnique!.duration - timeRemaining) / currentTechnique!.duration) * 100}%` 
              }}
            />
          </div>
        </div>

        {/* Safety Warning */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {currentTechnique?.safety}
          </AlertDescription>
        </Alert>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!isActive ? (
            <Button onClick={handleStart} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Start Timer
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" className="flex items-center gap-2">
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}
          
          <Button onClick={handleReset} variant="outline">
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

export default ColdWaterTechnique;

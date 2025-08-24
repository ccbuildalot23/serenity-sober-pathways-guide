
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Heart, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { toast } from 'sonner';

interface QuickCheckInProps {
  onCheckInComplete?: () => void;
}

const QuickCheckIn: React.FC<QuickCheckInProps> = ({ onCheckInComplete }) => {
  const { responses, setResponses, handleComplete, isSubmitting, existingCheckin } = useDailyCheckIn();
  const [mood, setMood] = useState([5]);
  const [energy, setEnergy] = useState([5]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Gentle haptic feedback when slider changes
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Very gentle 10ms vibration
    }
  };

  const handleSliderChange = (value: number[], type: 'mood' | 'energy') => {
    triggerHaptic();
    if (type === 'mood') {
      setMood(value);
    } else {
      setEnergy(value);
    }
  };

  const handleQuickCheckIn = async () => {
    setIsAnimating(true);
    
    setResponses(prev => ({
      ...prev,
      mood: mood[0],
      energy: energy[0],
      hope: 5,
      sobriety_confidence: 5,
      recovery_importance: 5,
      recovery_strength: "5",
      support_needed: false,
      phq2_q1: 0,
      phq2_q2: 0,
      gad2_q1: 0,
      gad2_q2: 0
    }));

    const success = await handleComplete();
    if (success) {
      // Haptic success feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]); // Success pattern
      }
      toast.success('Quick check-in completed!');
      onCheckInComplete?.();
    }
    setIsAnimating(false);
  };

  if (existingCheckin) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20 animate-fade-in">
        <CardContent className="p-4 text-center">
          <div className="animate-gentle-bounce">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          </div>
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">Check-in Complete</h3>
          <p className="text-sm text-green-700 dark:text-green-300">Great job staying on track today!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500 animate-pulse-subtle" />
          Quick Check-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <label 
              htmlFor="mood-slider"
              className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block"
            >
              How's your mood? 
              <span className="ml-2 text-lg font-semibold text-pink-600 dark:text-pink-400">
                {mood[0]}/10
              </span>
            </label>
            <div className="px-2">
              <Slider
                id="mood-slider"
                value={mood}
                onValueChange={(value) => handleSliderChange(value, 'mood')}
                max={10}
                min={1}
                step={1}
                className="w-full slider-gradient-pink"
                aria-label={`Mood rating: ${mood[0]} out of 10`}
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>😔</span>
                <span>😊</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label 
              htmlFor="energy-slider"
              className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 block"
            >
              Energy level? 
              <span className="ml-2 text-lg font-semibold text-blue-600 dark:text-blue-400">
                {energy[0]}/10
              </span>
            </label>
            <div className="px-2">
              <Slider
                id="energy-slider"
                value={energy}
                onValueChange={(value) => handleSliderChange(value, 'energy')}
                max={10}
                min={1}
                step={1}
                className="w-full slider-gradient-blue"
                aria-label={`Energy level: ${energy[0]} out of 10`}
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>🔋</span>
                <span>⚡</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleQuickCheckIn}
            disabled={isSubmitting}
            className={`flex-1 bg-pink-600 hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-600 focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-300 ${
              isAnimating ? 'animate-gentle-pulse' : ''
            }`}
            aria-label="Complete quick daily check-in"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Quick Check-In'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/checkin'}
            className="flex-shrink-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:scale-105 transition-transform"
            aria-label="Go to full check-in form"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickCheckIn;

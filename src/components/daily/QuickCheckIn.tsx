
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Heart, CheckCircle, ArrowRight } from 'lucide-react';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { toast } from 'sonner';

interface QuickCheckInProps {
  onCheckInComplete?: () => void;
}

const QuickCheckIn: React.FC<QuickCheckInProps> = ({ onCheckInComplete }) => {
  const { responses, setResponses, handleComplete, isSubmitting, existingCheckin } = useDailyCheckIn();
  const [mood, setMood] = useState([5]);
  const [energy, setEnergy] = useState([5]);

  const handleQuickCheckIn = async () => {
    setResponses(prev => ({
      ...prev,
      mood: mood[0],
      energy: energy[0],
      hope: 5,
      sobriety_confidence: 5,
      recovery_importance: 5,
      recovery_strength: "5", // Change from number to string
      support_needed: false,
      phq2_q1: 0,
      phq2_q2: 0,
      gad2_q1: 0,
      gad2_q2: 0
    }));

    const success = await handleComplete();
    if (success) {
      toast.success('Quick check-in completed!');
      // Trigger stats refresh in parent component
      onCheckInComplete?.();
    }
  };

  if (existingCheckin) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-1">Check-in Complete</h3>
          <p className="text-sm text-green-700 dark:text-green-300">Great job staying on track today!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500" />
          Quick Check-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <label 
              htmlFor="mood-slider"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
            >
              How's your mood? ({mood[0]}/10)
            </label>
            <Slider
              id="mood-slider"
              value={mood}
              onValueChange={setMood}
              max={10}
              min={1}
              step={1}
              className="w-full"
              aria-label={`Mood rating: ${mood[0]} out of 10`}
            />
          </div>
          
          <div>
            <label 
              htmlFor="energy-slider"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
            >
              Energy level? ({energy[0]}/10)
            </label>
            <Slider
              id="energy-slider"
              value={energy}
              onValueChange={setEnergy}
              max={10}
              min={1}
              step={1}
              className="w-full"
              aria-label={`Energy level: ${energy[0]} out of 10`}
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleQuickCheckIn}
            disabled={isSubmitting}
            className="flex-1 bg-pink-600 hover:bg-pink-700 focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            aria-label="Complete quick daily check-in"
          >
            {isSubmitting ? 'Saving...' : 'Quick Check-In'}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/checkin'}
            className="flex-shrink-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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

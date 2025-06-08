
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Heart, CheckCircle, ArrowRight } from 'lucide-react';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { toast } from 'sonner';

const QuickCheckIn = () => {
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
      recovery_strength: 5,
      support_needed: false,
      phq2_q1: 0,
      phq2_q2: 0,
      gad2_q1: 0,
      gad2_q2: 0
    }));

    const success = await handleComplete();
    if (success) {
      toast.success('Quick check-in completed!');
    }
  };

  if (existingCheckin) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-green-800 mb-1">Check-in Complete</h3>
          <p className="text-sm text-green-700">Great job staying on track today!</p>
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
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              How's your mood? ({mood[0]}/10)
            </label>
            <Slider
              value={mood}
              onValueChange={setMood}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Energy level? ({energy[0]}/10)
            </label>
            <Slider
              value={energy}
              onValueChange={setEnergy}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleQuickCheckIn}
            disabled={isSubmitting}
            className="flex-1 bg-pink-600 hover:bg-pink-700"
          >
            {isSubmitting ? 'Saving...' : 'Quick Check-In'}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/checkin'}
            className="flex-shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickCheckIn;

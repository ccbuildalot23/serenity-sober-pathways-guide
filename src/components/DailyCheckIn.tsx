
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';

const DailyCheckIn = () => {
  const [mood, setMood] = useState<number[]>([5]);
  const [reflection, setReflection] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const moodEmojis = ['😢', '😟', '😐', '🙂', '😊', '😃', '🤗', '😍', '🥳', '✨'];
  const moodLabels = ['Very Low', 'Low', 'Below Average', 'Okay', 'Good', 'Great', 'Excellent', 'Amazing', 'Fantastic', 'Incredible'];

  const handleSubmit = () => {
    const checkIn = {
      date: new Date().toISOString(),
      mood: mood[0],
      reflection: reflection,
    };

    // Save to localStorage for demo
    const existingEntries = JSON.parse(localStorage.getItem('checkIns') || '[]');
    existingEntries.push(checkIn);
    localStorage.setItem('checkIns', JSON.stringify(existingEntries));

    setIsSubmitted(true);
    console.log('Check-in saved:', checkIn);
    
    // Reset form after a moment
    setTimeout(() => {
      setIsSubmitted(false);
      setReflection('');
      setMood([5]);
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <Card className="p-6 text-center animate-scale-in">
        <div className="text-6xl mb-4">✨</div>
        <h3 className="text-xl font-semibold serenity-navy mb-2">Check-in Complete!</h3>
        <p className="text-gray-600">Thank you for taking time to reflect on your day.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-xl font-semibold serenity-navy mb-6 text-center">
          Daily Check-In
        </h3>

        <div className="space-y-6">
          {/* Mood Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              How are you feeling today?
            </label>
            
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{moodEmojis[mood[0] - 1]}</div>
              <div className="text-lg font-medium serenity-navy">{moodLabels[mood[0] - 1]}</div>
            </div>

            <Slider
              value={mood}
              onValueChange={setMood}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          {/* Reflection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What's on your mind today?
            </label>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Share your thoughts, challenges, or victories from today..."
              className="w-full h-32 resize-none"
            />
          </div>

          <Button 
            onClick={handleSubmit}
            className="w-full bg-serenity-navy hover:bg-blue-700 text-white py-3 rounded-xl font-semibold"
            disabled={!reflection.trim()}
          >
            Complete Check-In
          </Button>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="p-4">
        <h4 className="font-semibold serenity-navy mb-3">This Week</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold serenity-emerald">5</div>
            <div className="text-xs text-gray-600">Check-ins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-500">7.2</div>
            <div className="text-xs text-gray-600">Avg Mood</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">3</div>
            <div className="text-xs text-gray-600">Streak</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DailyCheckIn;

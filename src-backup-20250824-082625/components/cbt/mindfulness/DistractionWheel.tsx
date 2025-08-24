
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timer, Star, Plus, RotateCcw, Play } from 'lucide-react';
import { useSkillSession } from '@/hooks/useSkillSession';
import { toast } from 'sonner';

interface DistractionActivity {
  name: string;
  description: string;
  duration?: number;
  needsTimer?: boolean;
}

interface DistractionCategory {
  name: string;
  color: string;
  activities: DistractionActivity[];
}

const DistractionWheel: React.FC = () => {
  const { recordSkillSession } = useSkillSession();
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<DistractionActivity | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [customActivities, setCustomActivities] = useState<DistractionActivity[]>([]);
  const [effectivenessRating, setEffectivenessRating] = useState<number | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const categories: DistractionCategory[] = [
    {
      name: 'Mental',
      color: 'bg-blue-500',
      activities: [
        { name: 'Count Backwards', description: 'Count backwards from 100 by 7s', duration: 300 },
        { name: 'Recite Lyrics', description: 'Recite your favorite song lyrics', duration: 180 },
        { name: 'Do Math Problems', description: 'Solve simple math equations in your head', duration: 300 },
        { name: 'Name Categories', description: 'Name 10 things in a category (animals, colors, etc.)', duration: 240 },
        { name: 'Visualization', description: 'Imagine yourself in a peaceful place', duration: 600 }
      ]
    },
    {
      name: 'Physical',
      color: 'bg-green-500',
      activities: [
        { name: 'Quick Exercise', description: 'Do jumping jacks or push-ups', duration: 120, needsTimer: true },
        { name: 'Clean & Organize', description: 'Tidy up your immediate space', duration: 900 },
        { name: 'Dance', description: 'Put on music and dance', duration: 300 },
        { name: 'Stretch', description: 'Do gentle stretching exercises', duration: 600 },
        { name: 'Walk Around', description: 'Take a quick walk around your space', duration: 300 }
      ]
    },
    {
      name: 'Social',
      color: 'bg-purple-500',
      activities: [
        { name: 'Call a Friend', description: 'Reach out to someone you care about', duration: 600 },
        { name: 'Write a Letter', description: 'Write a thank you note or letter', duration: 900 },
        { name: 'Help Someone', description: 'Offer help to someone who needs it', duration: 1200 },
        { name: 'Text Support', description: 'Send encouraging messages to friends', duration: 300 },
        { name: 'Social Media Check', description: 'Briefly connect with your support network', duration: 300 }
      ]
    },
    {
      name: 'Emotional',
      color: 'bg-yellow-500',
      activities: [
        { name: 'Watch Comedy', description: 'Watch funny videos or shows', duration: 900 },
        { name: 'Listen to Music', description: 'Play uplifting or calming music', duration: 600 },
        { name: 'Gratitude List', description: 'Write down 5 things you\'re grateful for', duration: 300 },
        { name: 'Positive Affirmations', description: 'Repeat encouraging statements to yourself', duration: 300 },
        { name: 'Photo Memories', description: 'Look at happy photos or memories', duration: 600 }
      ]
    },
    {
      name: 'Creative',
      color: 'bg-pink-500',
      activities: [
        { name: 'Draw or Sketch', description: 'Create simple drawings or doodles', duration: 900 },
        { name: 'Write in Journal', description: 'Express your thoughts in writing', duration: 600 },
        { name: 'Craft Project', description: 'Work on a small creative project', duration: 1200 },
        { name: 'Color', description: 'Use coloring books or apps', duration: 900 },
        { name: 'Poetry', description: 'Write a short poem or haiku', duration: 600 }
      ]
    }
  ];

  const allActivities = [
    ...categories.flatMap(cat => cat.activities),
    ...customActivities
  ];

  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setSelectedActivity(null);
    setEffectivenessRating(null);

    // Animate wheel spinning
    if (wheelRef.current) {
      const randomRotation = Math.random() * 360 + 720; // At least 2 full rotations
      wheelRef.current.style.transform = `rotate(${randomRotation}deg)`;
    }

    setTimeout(() => {
      const filteredActivities = selectedCategory 
        ? categories.find(cat => cat.name === selectedCategory)?.activities || []
        : allActivities;
      
      const randomActivity = filteredActivities[Math.floor(Math.random() * filteredActivities.length)];
      setSelectedActivity(randomActivity);
      setIsSpinning(false);
      
      if (randomActivity.duration) {
        setTimer(randomActivity.duration);
      }
      
      toast.success('Activity Selected!', {
        description: `Try: ${randomActivity.name}`,
        duration: 3000
      });
    }, 2000);
  };

  const startTimer = () => {
    if (!timer || isTimerActive) return;

    setIsTimerActive(true);
    let timeLeft = timer;

    timerRef.current = setInterval(() => {
      timeLeft -= 1;
      setTimer(timeLeft);

      if (timeLeft <= 0) {
        setIsTimerActive(false);
        setTimer(null);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        toast.success('Timer Complete!', {
          description: 'Great job completing the distraction activity!'
        });
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsTimerActive(false);
  };

  const resetTimer = () => {
    stopTimer();
    if (selectedActivity?.duration) {
      setTimer(selectedActivity.duration);
    }
  };

  const rateEffectiveness = async (rating: number) => {
    setEffectivenessRating(rating);
    
    if (selectedActivity) {
      await recordSkillSession({
        skillCategory: 'mindfulness',
        skillName: `Distraction: ${selectedActivity.name}`,
        moduleType: 'distress_tolerance',
        sessionDurationMinutes: selectedActivity.duration ? Math.ceil(selectedActivity.duration / 60) : undefined,
        effectivenessRating: rating,
        realWorldApplied: true
      });

      toast.success('Effectiveness recorded!', {
        description: `You rated "${selectedActivity.name}" as ${rating}/10`
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-[#1E3A8A] text-center">
          Distraction Tool Wheel
        </CardTitle>
        <p className="text-center text-gray-600">
          Spin the wheel to find a distraction activity, or choose a specific category
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-3">
          <h3 className="font-medium">Choose Category (Optional):</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.name)}
                className={selectedCategory === category.name ? category.color : ''}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Spinning Wheel Visual */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div
              ref={wheelRef}
              className={`w-64 h-64 rounded-full border-8 border-[#1E3A8A] bg-gradient-conic from-blue-400 via-purple-400 via-pink-400 via-yellow-400 via-green-400 to-blue-400 transition-transform duration-2000 ease-out ${
                isSpinning ? 'animate-spin' : ''
              }`}
              style={{ 
                background: 'conic-gradient(from 0deg, #3B82F6, #8B5CF6, #EC4899, #EAB308, #10B981, #3B82F6)',
                transformOrigin: 'center'
              }}
            >
              <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center shadow-lg">
                <div className="text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <div className="text-sm font-medium text-[#1E3A8A]">
                    {isSpinning ? 'Spinning...' : 'Ready to Spin'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-[#1E3A8A]"></div>
            </div>
          </div>
        </div>

        {/* Spin Button */}
        <div className="text-center">
          <Button
            onClick={spinWheel}
            disabled={isSpinning}
            size="lg"
            className="bg-[#1E3A8A] hover:bg-[#1E40AF] text-white px-8 py-3"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
          </Button>
        </div>

        {/* Selected Activity */}
        {selectedActivity && (
          <Card className="bg-[#1E3A8A]/5 border-[#1E3A8A]/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-[#1E3A8A] mb-2">
                    {selectedActivity.name}
                  </h3>
                  <p className="text-gray-600">{selectedActivity.description}</p>
                </div>

                {/* Timer */}
                {timer !== null && (
                  <div className="space-y-3">
                    <div className="text-3xl font-bold text-[#1E3A8A]">
                      {formatTime(timer)}
                    </div>
                    <div className="flex justify-center gap-2">
                      {!isTimerActive ? (
                        <Button onClick={startTimer} className="bg-[#10B981] hover:bg-[#059669]">
                          <Play className="h-4 w-4 mr-1" />
                          Start Timer
                        </Button>
                      ) : (
                        <Button onClick={stopTimer} variant="destructive">
                          Stop Timer
                        </Button>
                      )}
                      <Button onClick={resetTimer} variant="outline">
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                    </div>
                  </div>
                )}

                {/* Effectiveness Rating */}
                {!isTimerActive && timer === null && (
                  <div className="space-y-3">
                    <p className="font-medium">How effective was this distraction? (1-10)</p>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                        <Button
                          key={rating}
                          size="sm"
                          variant={effectivenessRating === rating ? "default" : "outline"}
                          onClick={() => rateEffectiveness(rating)}
                        >
                          {rating}
                        </Button>
                      ))}
                    </div>
                    {effectivenessRating && (
                      <div className="flex justify-center items-center gap-1">
                        {[...Array(effectivenessRating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span className="ml-2 text-sm text-gray-600">
                          {effectivenessRating >= 8 ? 'Excellent choice!' : effectivenessRating >= 6 ? 'Good work!' : 'Keep exploring!'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Categories Display */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.name} className="border-l-4" style={{borderLeftColor: category.color.replace('bg-', '')}}>
              <CardContent className="p-4">
                <h4 className="font-bold text-[#1E3A8A] mb-2">{category.name}</h4>
                <div className="space-y-1">
                  {category.activities.slice(0, 3).map((activity, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      • {activity.name}
                    </div>
                  ))}
                  {category.activities.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{category.activities.length - 3} more activities
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DistractionWheel;

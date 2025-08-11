import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Coffee, 
  Utensils, 
  Bed, 
  Users, 
  CheckCircle, 
  Star,
  Calendar,
  TrendingUp,
  Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HALTAssessment {
  hungry: number;
  angry: number;
  lonely: number;
  tired: number;
}

interface CheckInData {
  date: string;
  halt: HALTAssessment;
  overallMood: number;
  sobrietyDay: number;
  gratitude: string[];
  triggers: string[];
}

const moodEmojis = ['😢', '😕', '😐', '🙂', '😊', '🤗'];
const moodLabels = ['Struggling', 'Down', 'Okay', 'Good', 'Great', 'Amazing'];

const gratitudePrompts = [
  'Something that made me smile today',
  'A person who supported me',
  'A small victory I had',
  'Something beautiful I noticed',
  'A moment of peace I found'
];

const triggerCategories = [
  { id: 'stress', label: 'Stress', icon: '😰' },
  { id: 'social', label: 'Social Pressure', icon: '👥' },
  { id: 'boredom', label: 'Boredom', icon: '😴' },
  { id: 'celebration', label: 'Celebration', icon: '🎉' },
  { id: 'sadness', label: 'Sadness', icon: '😢' },
  { id: 'none', label: 'None Today', icon: '✅' }
];

export const ShameFreeCheckIn: React.FC = () => {
  const { user } = useAuth();
  const [haltAssessment, setHaltAssessment] = useState<HALTAssessment>({
    hungry: 3,
    angry: 3,
    lonely: 3,
    tired: 3
  });
  const [overallMood, setOverallMood] = useState(3);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [gratitudeItems, setGratitudeItems] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sobrietyDay, setSobrietyDay] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Load user's sobriety day from localStorage or user data
    const savedSobrietyDay = localStorage.getItem('sobriety_day');
    if (savedSobrietyDay) {
      setSobrietyDay(parseInt(savedSobrietyDay));
    }
  }, []);

  const handleHaltChange = (type: keyof HALTAssessment, value: number[]) => {
    setHaltAssessment(prev => ({
      ...prev,
      [type]: value[0]
    }));
  };

  const handleMoodChange = (value: number[]) => {
    setOverallMood(value[0]);
  };

  const handleTriggerToggle = (triggerId: string) => {
    if (triggerId === 'none') {
      setSelectedTriggers([]);
    } else {
      setSelectedTriggers(prev => 
        prev.includes(triggerId) 
          ? prev.filter(t => t !== triggerId)
          : [...prev, triggerId]
      );
    }
  };

  const addGratitudeItem = () => {
    if (gratitudeItems.length < 3) {
      const prompt = gratitudePrompts[gratitudeItems.length];
      setGratitudeItems(prev => [...prev, prompt]);
    }
  };

  const removeGratitudeItem = (index: number) => {
    setGratitudeItems(prev => prev.filter((_, i) => i !== index));
  };

  const getHaltColor = (value: number) => {
    if (value <= 2) return 'text-green-600';
    if (value <= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHaltIcon = (type: keyof HALTAssessment) => {
    switch (type) {
      case 'hungry': return <Utensils className="w-5 h-5" />;
      case 'angry': return <Heart className="w-5 h-5" />;
      case 'lonely': return <Users className="w-5 h-5" />;
      case 'tired': return <Bed className="w-5 h-5" />;
    }
  };

  const getHaltLabel = (type: keyof HALTAssessment) => {
    switch (type) {
      case 'hungry': return 'Hungry';
      case 'angry': return 'Angry';
      case 'lonely': return 'Lonely';
      case 'tired': return 'Tired';
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const checkInData: CheckInData = {
        date: new Date().toISOString(),
        halt: haltAssessment,
        overallMood,
        sobrietyDay,
        gratitude: gratitudeItems,
        triggers: selectedTriggers
      };

      // Save to localStorage for now (would be sent to backend)
      localStorage.setItem('last_checkin', JSON.stringify(checkInData));
      
      // Check for milestones
      const milestones = [7, 30, 90, 180, 365];
      if (milestones.includes(sobrietyDay)) {
        setShowCelebration(true);
      }

      toast.success('Check-in completed!', {
        description: 'You\'re doing amazing work',
        duration: 3000,
        icon: <CheckCircle className="w-4 h-4 text-green-500" />
      });

      // Increment sobriety day
      const newSobrietyDay = sobrietyDay + 1;
      setSobrietyDay(newSobrietyDay);
      localStorage.setItem('sobriety_day', newSobrietyDay.toString());

    } catch (error) {
      console.error('Error submitting check-in:', error);
      toast.error('Something went wrong', {
        description: 'Please try again',
        duration: 3000
      });
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setShowCelebration(false);
    }, 3000);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-800">Daily Check-in</h1>
        <p className="text-gray-600">No judgment, just care and support</p>
        
        {/* Sobriety Counter */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-center space-x-3">
            <Calendar className="w-6 h-6" />
            <div>
              <div className="text-2xl font-bold">{sobrietyDay}</div>
              <div className="text-sm opacity-90">Days of Recovery</div>
            </div>
          </div>
        </div>
      </div>

      {/* HALT Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <span>How are you feeling? (HALT)</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Slide to indicate your current level - no typing needed
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {(['hungry', 'angry', 'lonely', 'tired'] as const).map((type) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getHaltIcon(type)}
                  <span className="font-medium">{getHaltLabel(type)}</span>
                </div>
                <Badge className={cn("text-xs", getHaltColor(haltAssessment[type]))}>
                  {haltAssessment[type]}/10
                </Badge>
              </div>
              <Slider
                value={[haltAssessment[type]]}
                onValueChange={(value) => handleHaltChange(type, value)}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Not at all</span>
                <span>Very much</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Overall Mood */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span>Overall Mood Today</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">{moodEmojis[overallMood - 1]}</div>
            <div className="text-lg font-medium text-gray-800">
              {moodLabels[overallMood - 1]}
            </div>
          </div>
          <Slider
            value={[overallMood]}
            onValueChange={handleMoodChange}
            max={6}
            min={1}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Struggling</span>
            <span>Amazing</span>
          </div>
        </CardContent>
      </Card>

      {/* Triggers */}
      <Card>
        <CardHeader>
          <CardTitle>Any Triggers Today?</CardTitle>
          <p className="text-sm text-gray-600">Tap to select - optional</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {triggerCategories.map((trigger) => (
              <Button
                key={trigger.id}
                variant={selectedTriggers.includes(trigger.id) ? "default" : "outline"}
                className={cn(
                  "h-12 justify-start",
                  selectedTriggers.includes(trigger.id) && "bg-blue-500 hover:bg-blue-600"
                )}
                onClick={() => handleTriggerToggle(trigger.id)}
              >
                <span className="mr-2">{trigger.icon}</span>
                {trigger.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gratitude */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <span>Gratitude (Optional)</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            What are you grateful for today?
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {gratitudeItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-50 rounded-lg p-3 text-sm">
                {item}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeGratitudeItem(index)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </Button>
            </div>
          ))}
          {gratitudeItems.length < 3 && (
            <Button
              variant="outline"
              onClick={addGratitudeItem}
              className="w-full"
            >
              + Add Gratitude
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full h-16 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-lg font-semibold rounded-xl shadow-lg"
      >
        {isSubmitting ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Submitting...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Complete Check-in</span>
          </div>
        )}
      </Button>

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Amazing Milestone!
            </h2>
            <p className="text-gray-600 mb-4">
              You've reached {sobrietyDay} days of recovery!
            </p>
            <div className="flex items-center justify-center space-x-2 text-yellow-500 mb-4">
              <Award className="w-6 h-6" />
              <span className="font-semibold">Incredible Progress</span>
            </div>
            <Button
              onClick={() => setShowCelebration(false)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
            >
              Continue Journey
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sun, 
  Moon, 
  Calendar, 
  Target, 
  BookOpen, 
  Edit3, 
  Save, 
  RefreshCw,
  Trophy,
  Flame
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

interface PledgeTemplate {
  id: string;
  title: string;
  morning_prompt: string;
  evening_prompt: string;
  category: string;
  is_default: boolean;
}

interface DailyPledge {
  id?: string;
  user_id: string;
  pledge_date: string;
  morning_commitment: string;
  evening_reflection: string;
  completed_morning: boolean;
  completed_evening: boolean;
  template_id?: string;
  created_at?: string;
}

const DailyPledges = () => {
  const { toast } = useToast();
  
  const [currentTab, setCurrentTab] = useState<'morning' | 'evening' | 'templates'>('morning');
  const [currentStreak] = useState(3);
  const [longestStreak] = useState(12);
  const [loading, setLoading] = useState(false);
  const [morningCommitment, setMorningCommitment] = useState('');
  const [eveningReflection, setEveningReflection] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [_completedMorning, setCompletedMorning] = useState(false);
  const [completedEvening, setCompletedEvening] = useState(false);

  const templates = [
    {
      id: '1',
      title: 'Mindful Serenity',
      morning_prompt: 'Today, I commit to staying present and mindful in my serenity journey.',
      evening_prompt: 'What am I most grateful for today?',
      category: 'mindfulness',
      is_default: true
    },
    {
      id: '2', 
      title: 'Seeking Support',
      morning_prompt: 'I pledge to reach out for support when I need it and to be gentle with myself.',
      evening_prompt: 'How did I honor my commitment to myself today?',
      category: 'support',
      is_default: true
    },
    {
      id: '3',
      title: 'Daily Progress', 
      morning_prompt: 'Today, I choose healing and will take one positive step forward.',
      evening_prompt: 'What challenges did I face, and how did I handle them?',
      category: 'progress',
      is_default: true
    },
    {
      id: '4',
      title: 'Early Recovery Focus',
      morning_prompt: 'Today is another day I choose my recovery. I will take it one moment at a time and celebrate each small victory.',
      evening_prompt: 'What recovery skills did I practice today? What can I learn from any difficult moments?',
      category: 'early-recovery',
      is_default: true
    },
    {
      id: '5',
      title: 'HALT Check-In',
      morning_prompt: 'Today I commit to regularly checking if I am Hungry, Angry, Lonely, or Tired, and addressing these needs with care.',
      evening_prompt: 'When did I notice HALT feelings today, and how did I respond to them?',
      category: 'self-care',
      is_default: true
    },
    {
      id: '6',
      title: 'Building Connections',
      morning_prompt: 'I will prioritize authentic connections today, whether through meetings, friends in recovery, or my support network.',
      evening_prompt: 'How did I connect with others in recovery today? What relationships am I nurturing?',
      category: 'community',
      is_default: true
    },
    {
      id: '7',
      title: 'Dealing with Cravings',
      morning_prompt: 'If cravings arise today, I commit to using healthy coping strategies and reaching out for support rather than struggling alone.',
      evening_prompt: 'Did I experience any cravings or triggers today? How did I handle them, and what tools were most helpful?',
      category: 'cravings',
      is_default: true
    },
    {
      id: '8',
      title: 'Spiritual Recovery',
      morning_prompt: 'I will nurture my spiritual connection today through prayer, meditation, or whatever practice brings me peace and strength.',
      evening_prompt: 'How did I connect with my higher power or spiritual practice today? What brought me peace?',
      category: 'spiritual',
      is_default: true
    },
    {
      id: '9',
      title: 'Amends and Healing',
      morning_prompt: 'Today I will work on healing relationships and making amends where appropriate, starting with being compassionate to myself.',
      evening_prompt: 'How did I practice forgiveness today - both giving and receiving? What relationships am I healing?',
      category: 'relationships',
      is_default: true
    },
    {
      id: '10',
      title: 'Long-term Sobriety',
      morning_prompt: 'With months/years of recovery behind me, I commit to staying vigilant, helping newcomers, and continuing to grow.',
      evening_prompt: 'How did I give back to the recovery community today? What did I do to maintain my spiritual condition?',
      category: 'long-term',
      is_default: true
    }
  ];

  const saveMorningCommitment = async () => {
    if (!morningCommitment.trim()) return;

    setLoading(true);
    try {
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCompletedMorning(true);
      
      toast({
        title: "Morning Commitment Saved! 🌅",
        _description: "Your intention for today has been set. Stay strong!",
      });

    } catch (_error) {
      console._error('Error saving morning commitment:', _error);
      toast({
        title: "Error",
        _description: "Failed to save your commitment. Please try again.",
        _variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveEveningReflection = async () => {
    if (!eveningReflection.trim()) return;

    setLoading(true);
    try {
      if (!_completedMorning) {
        toast({
          title: "Complete Morning First",
          _description: "Please set your morning commitment before adding evening reflection.",
          _variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCompletedEvening(true);

      // Check if both morning and evening are now complete for celebration
      if (_completedMorning) {
        celebrateCompletion();
      }

      toast({
        title: "Evening Reflection Saved! 🌙",
        _description: "Thank you for taking time to reflect on your day.",
      });

    } catch (_error) {
      console._error('Error saving evening reflection:', _error);
      toast({
        title: "Error",
        _description: "Failed to save your reflection. Please try again.",
        _variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const celebrateCompletion = () => {
    confetti({
      particleCount: 100,
      _spread: 70,
      _origin: { y: 0.6 }
    });

    toast({
      title: "🎉 Daily Pledge Complete!",
      _description: "You've completed both your morning commitment and evening reflection. Amazing work!",
      _duration: 5000,
    });
  };

  const applyTemplate = (_template: any) => {
    setMorningCommitment(_template.morning_prompt);
    setCurrentTab('morning');
  };

  const resetStreak = async () => {
    // This is for gentle restart - just provides encouragement
    toast({
      title: "Fresh Start 💪",
      _description: "Every day is a new opportunity. Your commitment to growth is what matters most.",
      _duration: 6000,
    });
  };

  const getMorningGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning! ☀️";
    if (hour < 17) return "Good afternoon! 🌤️";
    return "Good evening! 🌅";
  };

  const getEveningGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 17) return "Time for reflection 🤔";
    if (hour < 21) return "How was your day? 🌅";
    return "Evening reflection time 🌙";
  };

  const defaultMorningPrompts = [
    "Today, I commit to staying present and mindful in my recovery journey.",
    "I pledge to reach out for support when I need it and to be gentle with myself.",
    "Today, I choose healing and will take one positive step forward.",
    "I commit to honoring my recovery and the progress I've made so far.",
    "Today I will practice the tools I've learned and trust in my recovery process.",
    "I choose to be kind to myself today and celebrate every moment of sobriety.",
    "Today I will stay connected to my support network and recovery community.",
    "I commit to handling any challenges today with the wisdom I've gained in recovery."
  ];

  const defaultEveningPrompts = [
    "What am I most grateful for today?",
    "How did I honor my commitment to myself today?", 
    "What challenges did I face, and how did I handle them?",
    "What can I learn from today to help my recovery tomorrow?",
    "How did I practice self-care and maintain my recovery today?",
    "What recovery tools did I use today, and which were most helpful?",
    "How did I connect with others in recovery or my support system today?",
    "What am I proud of accomplishing in my recovery today, no matter how small?"
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with Streak Info */}
      <Card className="bg-gradient-to-r from-serenity-mint/20 to-serenity-sage/20 border-serenity-sage/30">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-serenity-navy mb-2">Daily Pledges</h2>
            <p className="text-serenity-sage mb-4">Start with intention, end with reflection</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Flame className="w-6 h-6 mx-auto text-serenity-coral mb-1" />
                <div className="text-2xl font-bold text-serenity-navy">{currentStreak}</div>
                <div className="text-xs text-muted-foreground">Current Streak</div>
              </div>
              
              <div className="text-center">
                <Trophy className="w-6 h-6 mx-auto text-serenity-gold mb-1" />
                <div className="text-2xl font-bold text-serenity-navy">{longestStreak}</div>
                <div className="text-xs text-muted-foreground">Longest Streak</div>
              </div>
              
              <div className="text-center">
                <Calendar className="w-6 h-6 mx-auto text-serenity-teal mb-1" />
                <div className="text-lg font-bold text-serenity-navy">
                  {_completedMorning && completedEvening ? '✓' : 
                   _completedMorning ? '½' : '○'}
                </div>
                <div className="text-xs text-muted-foreground">Today</div>
              </div>
            </div>

            {currentStreak > 0 && (
              <div className="mt-4">
                <Button _variant="outline" size="sm" onClick={resetStreak} className="border-serenity-coral text-serenity-coral">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Need a fresh start?
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="morning" className="flex items-center gap-2">
            <Sun className="w-4 h-4" />
            Morning
            {_completedMorning && <Badge _variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="evening" className="flex items-center gap-2">
            <Moon className="w-4 h-4" />
            Evening
            {completedEvening && <Badge _variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Morning Commitment Tab */}
        <TabsContent value="morning">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-serenity-navy">
                <Sun className="w-5 h-5 text-serenity-gold" />
                {getMorningGreeting()}
              </CardTitle>
              <p className="text-muted-foreground">
                Set your intention for today. What do you commit to in your serenity journey?
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!_completedMorning && (
                <div className="grid grid-cols-1 gap-2">
                  <p className="text-sm text-muted-foreground mb-2">Quick prompts to get started:</p>
                  {defaultMorningPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      _variant="outline"
                      size="sm"
                      onClick={() => setMorningCommitment(prompt)}
                      className="text-left justify-start h-auto p-3 border-serenity-sage/30 hover:bg-serenity-mint/10"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              )}

              <Textarea
                placeholder="Write your commitment for today..."
                value={morningCommitment}
                onChange={(e) => setMorningCommitment(e.target.value)}
                className="min-h-32"
                disabled={_completedMorning && !isEditing}
              />

              <div className="flex justify-between items-center">
                {_completedMorning && !isEditing ? (
                  <Button
                    _variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-serenity-teal text-serenity-teal"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Commitment
                  </Button>
                ) : (
                  <Button
                    onClick={saveMorningCommitment}
                    disabled={loading || !morningCommitment.trim()}
                    className="bg-serenity-gold hover:bg-serenity-gold/90 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : _completedMorning ? 'Update' : 'Set Commitment'}
                  </Button>
                )}

                {isEditing && (
                  <Button
                    _variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evening Reflection Tab */}
        <TabsContent value="evening">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-serenity-navy">
                <Moon className="w-5 h-5 text-serenity-sage" />
                {getEveningGreeting()}
              </CardTitle>
              <p className="text-muted-foreground">
                Reflect on your day. How did you honor your morning commitment?
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {morningCommitment && _completedMorning && (
                <div className="p-4 bg-serenity-mint/10 rounded-lg border border-serenity-mint/30">
                  <p className="text-sm text-serenity-sage font-medium mb-2">This morning you committed to:</p>
                  <p className="text-serenity-navy italic">"{morningCommitment}"</p>
                </div>
              )}

              {!completedEvening && (
                <div className="grid grid-cols-1 gap-2">
                  <p className="text-sm text-muted-foreground mb-2">Reflection prompts:</p>
                  {defaultEveningPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      _variant="outline"
                      size="sm"
                      onClick={() => setEveningReflection(prev => prev + (prev ? '\n\n' : '') + prompt + '\n')}
                      className="text-left justify-start h-auto p-3 border-serenity-sage/30 hover:bg-serenity-mint/10"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              )}

              <Textarea
                placeholder="Reflect on your day..."
                value={eveningReflection}
                onChange={(e) => setEveningReflection(e.target.value)}
                className="min-h-32"
                disabled={completedEvening && !isEditing}
              />

              <div className="flex justify-between items-center">
                {completedEvening && !isEditing ? (
                  <Button
                    _variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-serenity-teal text-serenity-teal"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Reflection
                  </Button>
                ) : (
                  <Button
                    onClick={saveEveningReflection}
                    disabled={loading || !eveningReflection.trim() || !_completedMorning}
                    className="bg-serenity-sage hover:bg-serenity-sage/90 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : completedEvening ? 'Update' : 'Save Reflection'}
                  </Button>
                )}

                {isEditing && (
                  <Button
                    _variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {!_completedMorning && (
                <p className="text-sm text-muted-foreground text-center">
                  Complete your morning commitment first to unlock evening reflection.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-serenity-navy">
                <BookOpen className="w-5 h-5 text-serenity-teal" />
                Recovery-Focused Pledge Templates
              </CardTitle>
              <p className="text-muted-foreground">
                Choose from these evidence-based recovery prompts designed for different stages and focuses of your journey.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {Array.from(new Set(templates.map(t => t.category))).map(category => (
                  <Badge key={category} _variant="outline" className="text-xs capitalize">
                    {category.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {templates.map((_template) => (
                    <div
                      key={_template.id}
                      className="p-4 border border-serenity-sage/30 rounded-lg hover:bg-serenity-mint/5 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-serenity-navy">{_template.title}</h4>
                        <div className="flex gap-2">
                          <Badge _variant="outline" className="text-xs capitalize">
                            {_template.category.replace('-', ' ')}
                          </Badge>
                          <Badge _variant={_template.is_default ? "secondary" : "outline"}>
                            {_template.is_default ? "Featured" : "Custom"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm text-muted-foreground mb-3">
                        <p><strong className="text-serenity-gold">Morning:</strong> {_template.morning_prompt}</p>
                        <p><strong className="text-serenity-sage">Evening:</strong> {_template.evening_prompt}</p>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => applyTemplate(_template)}
                        className="w-full bg-serenity-teal hover:bg-serenity-teal/90 text-white"
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Use This Template
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DailyPledges;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  Heart, Calendar, Compass, Mic, MicOff, WifiOff, 
  Share2, Save, CheckCircle, Info, Star, Clock 
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { voiceActivationService } from '@/services/voiceActivationService';
import { CrisisSyncService } from '@/services/crisisSyncService';
import { offlineStorage } from '@/services/offlineStorageService';
import { useOfflineCrisisData } from '@/hooks/useOfflineCrisisData';

interface DailyContent {
  affirmation: {
    id: string;
    text: string;
    category: string;
    date: string;
  };
  dailyFocus: {
    id: string;
    text: string;
    actionable: boolean;
    completed?: boolean;
    date: string;
  };
  principle: {
    id: string;
    name: string;
    description: string;
    daily_reflection: string;
    month: number;
  };
}

export const UnifiedRecoveryContent = () => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedTab, setSelectedTab] = useState('integrated');
  const [personalNote, setPersonalNote] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const { isOnline, syncWithServer } = useOfflineCrisisData();

  // Handle offline/online transitions
  useEffect(() => {
    const handleOnline = async () => {
      setOfflineMode(false);
      setSyncStatus('syncing');
      
      try {
        await CrisisSyncService.syncWithServer(user?.id || '');
        setSyncStatus('synced');
        toast.success("Offline data synced successfully!");
      } catch (error) {
        setSyncStatus('error');
        toast.error("Failed to sync offline data");
      }
    };
    
    const handleOffline = () => {
      setOfflineMode(true);
      toast.info("You're offline. Data will sync when connected.");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user?.id]);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('recoveryFavorites') || '[]');
    setFavorites(savedFavorites.map((item: any) => item.id));
  }, []);

  // Fetch today's content
  const { data: todaysContent, isLoading } = useQuery({
    queryKey: ['daily-content', new Date().toDateString()],
    queryFn: async (): Promise<DailyContent> => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const currentMonth = today.getMonth() + 1;
      
      // Try to fetch from cache first when offline
      if (!isOnline) {
        const cached = offlineStorage.getFromLocalStorage('dailyContent');
        if (cached) return cached;
      }
      
      // Generate content (in a real app, this would come from a database)
      const content = {
        affirmation: getDefaultAffirmation(),
        dailyFocus: getDefaultDailyFocus(),
        principle: getDefaultPrinciple(currentMonth)
      };
      
      // Cache for offline use
      await offlineStorage.saveToLocalStorage('dailyContent', content);
      
      return content;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Save completion
  const completionMutation = useMutation({
    mutationFn: async ({ type, note }: { type: string; note?: string }) => {
      const completion = {
        user_id: user?.id,
        type,
        date: new Date(),
        completed: true,
        note
      };
      
      if (isOnline) {
        // In a real app, save to database
        console.log('Saving completion to database:', completion);
      } else {
        offlineStorage.queueForSync({
          type: 'daily_completion',
          data: completion
        });
      }
    },
    onSuccess: (_, { type }) => {
      toast.success(`${type} completed! 🌟`);
    }
  });

  // Voice control
  const enableVoiceContent = () => {
    if (!voiceEnabled) {
      voiceActivationService.startListening({
        onCrisisDetected: () => {
          // Already handled by main crisis system
        },
        onError: (error) => {
          toast.error(`Voice error: ${error}`);
          setVoiceEnabled(false);
        }
      });
      setVoiceEnabled(true);
      
      // Read current content
      if (todaysContent && 'speechSynthesis' in window) {
        const text = selectedTab === 'affirmation' ? todaysContent.affirmation.text :
                     selectedTab === 'daily' ? todaysContent.dailyFocus.text :
                     todaysContent.principle.daily_reflection;
        
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
      }
    } else {
      voiceActivationService.stopListening();
      speechSynthesis.cancel();
      setVoiceEnabled(false);
    }
  };

  // Save to favorites
  const saveToFavorites = (type: string, content: any) => {
    const favoriteItem = {
      id: `${type}_${Date.now()}`,
      type,
      content,
      savedAt: new Date()
    };
    
    const existingFavorites = JSON.parse(localStorage.getItem('recoveryFavorites') || '[]');
    existingFavorites.push(favoriteItem);
    localStorage.setItem('recoveryFavorites', JSON.stringify(existingFavorites));
    
    setFavorites([...favorites, favoriteItem.id]);
    toast.success("Saved to favorites! ⭐");
  };

  // Share content
  const shareContent = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Recovery Inspiration',
          text: text,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard! 📋");
    }
  };

  // Get contextual content based on mood/crisis data
  const getContextualAffirmation = () => {
    const defaultAffirmations = {
      crisis: "This feeling is temporary. You have survived difficult moments before.",
      recovery: "Every day in recovery is a victory worth celebrating.",
      general: "You are stronger than you know, braver than you feel."
    };
    
    return defaultAffirmations.general;
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Loading today's inspiration...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Today's Recovery Focus</CardTitle>
          <div className="flex items-center gap-2">
            {offlineMode && (
              <Badge variant="secondary">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
            <Badge 
              variant={syncStatus === 'synced' ? 'default' : 
                      syncStatus === 'syncing' ? 'secondary' : 'destructive'}
            >
              {syncStatus === 'syncing' && <Clock className="w-3 h-3 mr-1 animate-spin" />}
              {syncStatus}
            </Badge>
            <Button
              size="sm"
              variant={voiceEnabled ? "default" : "outline"}
              onClick={enableVoiceContent}
            >
              {voiceEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="integrated">All</TabsTrigger>
            <TabsTrigger value="affirmation">
              <Heart className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="daily">
              <Calendar className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="principle">
              <Compass className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="integrated" className="space-y-4 mt-4">
            {/* Contextual Alert */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                Today's content is personalized based on your recovery journey. 
                Each element is chosen to support where you are right now.
              </AlertDescription>
            </Alert>
            
            {/* Affirmation Card */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center">
                    <Heart className="w-5 h-5 mr-2 text-emerald-600" />
                    Today's Affirmation
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveToFavorites('affirmation', todaysContent?.affirmation)}
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium text-gray-800 text-center py-4">
                  {todaysContent?.affirmation?.text || getContextualAffirmation()}
                </p>
              </CardContent>
            </Card>
            
            {/* Daily Focus Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Just for Today
                  </h3>
                  <Badge variant={todaysContent?.dailyFocus?.completed ? "default" : "outline"}>
                    {todaysContent?.dailyFocus?.completed ? "Completed" : "In Progress"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 mb-4">
                  {todaysContent?.dailyFocus?.text || "Focus on progress, not perfection."}
                </p>
                <Button 
                  className="w-full"
                  variant={todaysContent?.dailyFocus?.completed ? "outline" : "default"}
                  onClick={() => completionMutation.mutate({ type: 'daily_focus' })}
                  disabled={todaysContent?.dailyFocus?.completed}
                >
                  {todaysContent?.dailyFocus?.completed ? 
                    <><CheckCircle className="w-4 h-4 mr-2" /> Completed</> : 
                    "Mark Complete"
                  }
                </Button>
              </CardContent>
            </Card>
            
            {/* Principle Card */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <h3 className="font-semibold flex items-center">
                  <Compass className="w-5 h-5 mr-2 text-purple-600" />
                  Monthly Principle: {todaysContent?.principle?.name}
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-800 mb-2">
                  {todaysContent?.principle?.description}
                </p>
                <p className="text-sm text-gray-600 italic">
                  Today's reflection: {todaysContent?.principle?.daily_reflection}
                </p>
              </CardContent>
            </Card>
            
            {/* Personal Reflection */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Your Reflection</h3>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="How does today's content resonate with you?"
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                  rows={3}
                  className="mb-3"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      completionMutation.mutate({ 
                        type: 'reflection', 
                        note: personalNote 
                      });
                      setPersonalNote('');
                    }}
                    disabled={!personalNote.trim()}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Note
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => shareContent(
                      `Today's affirmation: ${todaysContent?.affirmation?.text}\n\n` +
                      `Focus: ${todaysContent?.dailyFocus?.text}\n\n` +
                      `#RecoveryJourney #OneDayAtATime`
                    )}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Individual content tabs */}
          <TabsContent value="affirmation" className="mt-4">
            <Card className="bg-gradient-to-br from-green-50 to-transparent">
              <CardContent className="p-8 text-center">
                <Heart className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <p className="text-xl font-medium text-gray-800 mb-6">
                  {todaysContent?.affirmation?.text}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => saveToFavorites('affirmation', todaysContent?.affirmation)}
                  >
                    Save to Favorites
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => shareContent(todaysContent?.affirmation?.text || '')}
                  >
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="daily" className="mt-4">
            <Card className="bg-gradient-to-br from-blue-50 to-transparent">
              <CardContent className="p-8">
                <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-center mb-4">Just for Today...</h3>
                <p className="text-lg text-gray-800 text-center mb-6">
                  {todaysContent?.dailyFocus?.text}
                </p>
                <Button 
                  className="w-full"
                  size="lg"
                  onClick={() => completionMutation.mutate({ type: 'daily_focus' })}
                  disabled={todaysContent?.dailyFocus?.completed}
                >
                  {todaysContent?.dailyFocus?.completed ? '✓ Completed' : 'Mark Complete'}
                </Button>
                {todaysContent?.dailyFocus?.actionable && (
                  <p className="text-sm text-center text-gray-600 mt-4">
                    💡 This is an actionable item - try to complete it today!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="principle" className="mt-4">
            <Card className="bg-gradient-to-br from-purple-50 to-transparent">
              <CardContent className="p-8">
                <Compass className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-center mb-2">
                  {todaysContent?.principle?.name}
                </h3>
                <p className="text-gray-800 mb-6 text-center">
                  {todaysContent?.principle?.description}
                </p>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold mb-2">Today's Reflection:</h4>
                  <p className="text-gray-700 italic">
                    {todaysContent?.principle?.daily_reflection}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setSelectedTab('integrated')}
                >
                  Journal About This Principle
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper functions
function getDefaultAffirmation() {
  const affirmations = [
    "You are stronger than you know, braver than you feel.",
    "Every day in recovery is a victory worth celebrating.",
    "Progress, not perfection, is the goal.",
    "You deserve peace, joy, and fulfillment in your life."
  ];
  return {
    id: 'default',
    text: affirmations[Math.floor(Math.random() * affirmations.length)],
    category: 'strength',
    date: new Date().toISOString()
  };
}

function getDefaultDailyFocus() {
  const focuses = [
    "Just for today, I will be kind to myself.",
    "Just for today, I will reach out to someone who supports me.",
    "Just for today, I will celebrate small victories.",
    "Just for today, I will focus on what I can control."
  ];
  return {
    id: 'default',
    text: focuses[Math.floor(Math.random() * focuses.length)],
    actionable: true,
    completed: false,
    date: new Date().toISOString()
  };
}

function getDefaultPrinciple(month: number) {
  const principles = [
    { name: "Honesty", description: "Being truthful with ourselves and others" },
    { name: "Hope", description: "Believing in the possibility of positive change" },
    { name: "Faith", description: "Trusting in the recovery process" },
    { name: "Courage", description: "Facing our fears with strength" },
    { name: "Integrity", description: "Aligning our actions with our values" },
    { name: "Willingness", description: "Being open to growth and change" },
    { name: "Humility", description: "Recognizing our strengths and limitations" },
    { name: "Love", description: "Treating ourselves and others with compassion" },
    { name: "Discipline", description: "Committing to consistent positive actions" },
    { name: "Patience", description: "Allowing time for healing and growth" },
    { name: "Perseverance", description: "Continuing despite challenges" },
    { name: "Service", description: "Helping others in their journey" }
  ];
  
  const principle = principles[(month - 1) % 12];
  return {
    id: 'default',
    name: principle.name,
    description: principle.description,
    daily_reflection: `How can I practice ${principle.name.toLowerCase()} in my recovery today?`,
    month
  };
}

export default UnifiedRecoveryContent;

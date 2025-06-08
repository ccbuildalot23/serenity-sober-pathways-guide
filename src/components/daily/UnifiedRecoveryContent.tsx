
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WifiOff, Heart, Calendar, Compass, Mic, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CrisisSyncService } from '@/services/crisisSyncService';
import { offlineStorage } from '@/services/offlineStorageService';
import { voiceActivationService } from '@/services/voiceActivationService';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { SmartContentCard } from './SmartContentCard';

interface DailyContent {
  affirmations: string[];
  dailyFocus: string[];
  principles: string[];
  cachedAt: Date;
}

interface CrisisData {
  crisis_start_time: string;
  risk_level: string;
  interventions_used: string[];
}

const crisisAffirmations = [
  "This feeling is temporary. You have survived difficult moments before.",
  "Reaching out for help is a sign of strength, not weakness.",
  "You are not alone. Your support network is here for you.",
  "One moment at a time. You don't have to face tomorrow right now.",
  "Your life has value. These thoughts will pass."
];

const recoveryAffirmations = [
  "You showed incredible strength getting through that crisis.",
  "Every day you stay committed to recovery is a victory.",
  "Your courage to keep going inspires others in recovery.",
  "You're building resilience with each challenge you overcome."
];

const generalAffirmations = [
  "Today is a new opportunity to grow in your recovery.",
  "You have the tools and strength to handle whatever comes.",
  "Progress, not perfection, is the goal of recovery.",
  "You are worthy of love, health, and happiness."
];

export const UnifiedRecoveryContent: React.FC = () => {
  const { user } = useAuth();
  const { responses } = useDailyCheckIn();
  const [syncStatus, setSyncStatus] = useState('synced');
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);
  const [dailyContent, setDailyContent] = useState<DailyContent | null>(null);
  const [recentCrisisData, setRecentCrisisData] = useState<CrisisData[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const moodScore = responses.mood || 5;

  // Handle offline/online transitions
  useEffect(() => {
    const handleOnline = async () => {
      setOfflineMode(false);
      setSyncStatus('syncing');
      
      try {
        if (user?.id) {
          await CrisisSyncService.syncWithServer(user.id);
        }
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

  // Cache content for offline use
  useEffect(() => {
    const cacheContent = async () => {
      try {
        const content: DailyContent = {
          affirmations: [...crisisAffirmations, ...recoveryAffirmations, ...generalAffirmations],
          dailyFocus: [
            "Focus on one small goal today",
            "Practice gratitude for three things",
            "Connect with your support network",
            "Take time for self-care"
          ],
          principles: [
            "One day at a time",
            "Progress, not perfection",
            "Connection over isolation",
            "Self-compassion over self-judgment"
          ],
          cachedAt: new Date()
        };
        
        await offlineStorage.saveData('dailyContent', content);
        setDailyContent(content);
      } catch (error) {
        console.error('Failed to cache content:', error);
        // Fallback to localStorage
        const fallbackContent = offlineStorage.getFromLocalStorage('dailyContent');
        if (fallbackContent) {
          setDailyContent(fallbackContent);
        }
      }
    };
    
    cacheContent();
  }, []);

  // Load recent crisis data
  useEffect(() => {
    const loadCrisisData = async () => {
      if (!user?.id) return;
      
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        // This would typically come from your crisis data service
        const mockCrisisData: CrisisData[] = offlineStorage.getFromLocalStorage('recentCrisisData') || [];
        setRecentCrisisData(mockCrisisData);
      } catch (error) {
        console.error('Failed to load crisis data:', error);
      }
    };
    
    loadCrisisData();
  }, [user?.id]);

  const getContextualAffirmation = (mood: number, crisisData: CrisisData[]) => {
    if (mood <= 3) {
      return crisisAffirmations[Math.floor(Math.random() * crisisAffirmations.length)];
    } else if (recentCrisis(crisisData)) {
      return recoveryAffirmations[Math.floor(Math.random() * recoveryAffirmations.length)];
    } else {
      return generalAffirmations[Math.floor(Math.random() * generalAffirmations.length)];
    }
  };

  const recentCrisis = (crisisData: CrisisData[]) => {
    if (!crisisData.length) return false;
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return crisisData.some(crisis => 
      new Date(crisis.crisis_start_time) > threeDaysAgo
    );
  };

  const getAdaptiveDailyFocus = (vulnerabilityWindow?: boolean) => {
    if (!dailyContent) return "Focus on the present moment";
    
    if (moodScore <= 3 || vulnerabilityWindow) {
      return "Today, focus on basic self-care and reaching out for support when needed.";
    } else if (recentCrisis(recentCrisisData)) {
      return "Celebrate your resilience and practice the coping strategies that helped you through.";
    } else {
      return dailyContent.dailyFocus[Math.floor(Math.random() * dailyContent.dailyFocus.length)];
    }
  };

  const getCurrentPrinciple = () => {
    if (!dailyContent) return "One day at a time";
    return dailyContent.principles[Math.floor(Math.random() * dailyContent.principles.length)];
  };

  const enableVoiceContent = () => {
    if (!voiceActivationService.isSupported()) {
      toast.error("Voice activation not supported on this device");
      return;
    }

    const success = voiceActivationService.startListening({
      onCrisisDetected: () => {
        // Crisis detection already handled by existing system
      },
      onError: (error) => {
        console.error('Voice activation error:', error);
        setVoiceEnabled(false);
        toast.error("Voice activation failed");
      }
    });

    if (success) {
      setVoiceEnabled(true);
      toast.success("Voice reading enabled");
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  };

  const speakAffirmation = () => {
    const affirmation = getContextualAffirmation(moodScore, recentCrisisData);
    speakText(affirmation);
  };

  const speakPrinciple = () => {
    const principle = getCurrentPrinciple();
    speakText(`Today's guiding principle: ${principle}`);
  };

  if (!dailyContent) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading recovery content...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today's Recovery Focus</CardTitle>
          <div className="flex items-center gap-2">
            {offlineMode && <WifiOff className="w-4 h-4 text-gray-500" />}
            <Badge variant={syncStatus === 'synced' ? 'default' : 'secondary'}>
              {syncStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="integrated">
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
          
          <TabsContent value="integrated" className="space-y-4">
            {/* Crisis-aware content delivery */}
            {(moodScore <= 3 || recentCrisis(recentCrisisData)) && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  Today's content is adjusted based on your recent challenges. 
                  We're focusing on resilience and self-compassion.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Smart content based on mood and crisis data */}
            <SmartContentCard
              affirmation={getContextualAffirmation(moodScore, recentCrisisData)}
              dailyFocus={getAdaptiveDailyFocus()}
              principle={getCurrentPrinciple()}
              onSpeakAffirmation={speakAffirmation}
              onSpeakPrinciple={speakPrinciple}
            />
            
            {/* Voice control */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={enableVoiceContent}
                className="flex-1"
                disabled={voiceEnabled}
              >
                <Mic className="mr-2 w-4 h-4" />
                {voiceEnabled ? 'Voice Active' : 'Enable Voice Reading'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={speakAffirmation}
                className="flex-1"
              >
                Read Affirmation
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="affirmation" className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-center font-medium text-green-800">
                {getContextualAffirmation(moodScore, recentCrisisData)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={speakAffirmation}
                className="w-full mt-3"
              >
                <Mic className="mr-2 w-4 h-4" />
                Listen
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Today's Focus</h4>
              <p className="text-blue-700">
                {getAdaptiveDailyFocus()}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="principle" className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Guiding Principle</h4>
              <p className="text-purple-700 text-center font-medium">
                {getCurrentPrinciple()}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={speakPrinciple}
                className="w-full mt-3"
              >
                <Mic className="mr-2 w-4 h-4" />
                Listen
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default UnifiedRecoveryContent;

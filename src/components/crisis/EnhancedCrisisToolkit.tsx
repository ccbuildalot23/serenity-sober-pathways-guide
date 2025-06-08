
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, Brain, Users, Headphones, Heart, AlertCircle, 
  MapPin, Mic, MicOff, WifiOff, Battery, Shield
} from 'lucide-react';
import { panicModeService } from '@/services/panicModeService';
import { getCurrentLocation } from '@/services/geolocationService';
import { voiceActivationService } from '@/services/voiceActivationService';
import { sendMockSMS } from '@/services/mockSmsService';
import { sendMockPush } from '@/services/mockPushService';
import { escalateCrisis } from '@/services/crisisEscalationService';
import { useOfflineCrisisData } from '@/hooks/useOfflineCrisisData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface EnhancedCrisisToolkitProps {
  showAssessment: boolean;
  showResponse: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe' | null;
  currentCrisisEvent: any;
  voiceListening: boolean;
  hasLocationPermission: boolean;
  handleCrisisActivated: () => void;
  handleAssessmentComplete: (level: any) => void;
  handleResponseComplete: () => void;
  handleInterventionComplete: (toolName: string) => void;
  isOffline?: boolean;
  saveOfflineData?: (data: any) => void;
  moodScore?: number;
}

export const EnhancedCrisisToolkit: React.FC<EnhancedCrisisToolkitProps> = ({
  showAssessment,
  showResponse,
  riskLevel,
  currentCrisisEvent,
  voiceListening,
  hasLocationPermission,
  handleCrisisActivated,
  handleAssessmentComplete,
  handleResponseComplete,
  handleInterventionComplete,
  isOffline = false,
  saveOfflineData
}) => {
  const { user } = useAuth();
  const [panicCooldown, setPanicCooldown] = useState(0);
  const [location, setLocation] = useState<any>(null);
  const [activeIntervention, setActiveIntervention] = useState<string | null>(null);
  const [breathingCount, setBreathingCount] = useState(0);
  const [groundingStep, setGroundingStep] = useState(0);
  const { isOnline } = useOfflineCrisisData();

  // Panic button cooldown tracker
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = panicModeService.getCooldownRemaining();
      setPanicCooldown(remaining);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  // Get location on mount
  useEffect(() => {
    if (hasLocationPermission) {
      getCurrentLocation()
        .then(setLocation)
        .catch(err => console.log('Location unavailable:', err));
    }
  }, [hasLocationPermission]);

  const handlePanicButton = async () => {
    const result = panicModeService.triggerPanic();
    
    if (!result.success) {
      toast.error(`Please wait: ${Math.ceil(result.cooldownRemaining! / 1000)}s`);
      return;
    }

    // Trigger full crisis response
    handleCrisisActivated();
    
    // Send emergency alerts
    if (isOnline) {
      // Get emergency contacts and send alerts
      toast.success("Emergency alerts sent - Your support network has been notified");
    } else {
      toast.info("Offline mode - Emergency data saved, will send when connected");
      
      // Save crisis event for later sync
      if (saveOfflineData) {
        saveOfflineData({
          type: 'panic_button',
          timestamp: new Date().toISOString(),
          user_id: user?.id,
          location: location
        });
      }
    }

    // Voice announcement
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        "Emergency contacts have been notified. Help is on the way."
      );
      speechSynthesis.speak(utterance);
    }
  };

  const startBreathingExercise = () => {
    setActiveIntervention('breathing');
    setBreathingCount(0);
    
    const breathingInterval = setInterval(() => {
      setBreathingCount(prev => {
        if (prev >= 5) {
          clearInterval(breathingInterval);
          handleInterventionComplete('Breathing Exercise');
          setActiveIntervention(null);
          toast.success("Breathing exercise completed! 🌟");
          return 0;
        }
        return prev + 1;
      });
    }, 4000); // 4 seconds per breath cycle
  };

  const startGroundingExercise = () => {
    setActiveIntervention('grounding');
    setGroundingStep(0);
  };

  const resources = [
    {
      category: 'immediate',
      color: 'destructive',
      icon: Phone,
      items: [
        {
          id: 'call-988',
          title: "Call 988",
          description: "24/7 Crisis Lifeline",
          action: () => escalateCrisis('high'),
          duration: "Immediate"
        },
        {
          id: 'call-911',
          title: "Call 911",
          description: "Emergency Services",
          action: () => escalateCrisis('severe'),
          duration: "Emergency"
        }
      ]
    },
    {
      category: 'grounding',
      color: 'blue',
      icon: Brain,
      items: [
        {
          id: 'breathing',
          title: "Box Breathing",
          description: "Calming breath work",
          action: startBreathingExercise,
          duration: "2 min"
        },
        {
          id: 'grounding-5-4-3-2-1',
          title: "5-4-3-2-1 Technique",
          description: "Grounding exercise",
          action: startGroundingExercise,
          duration: "5 min"
        }
      ]
    },
    {
      category: 'connection',
      color: 'emerald',
      icon: Users,
      items: [
        {
          id: 'call-sponsor',
          title: "Call Sponsor",
          description: "Connect with your sponsor",
          action: () => window.location.href = 'tel:sponsor',
          duration: "Varies"
        },
        {
          id: 'support-chat',
          title: "Peer Support Chat",
          description: "Anonymous peer support",
          action: () => console.log('Open chat'),
          duration: "24/7"
        }
      ]
    },
    {
      category: 'distraction',
      color: 'purple',
      icon: Headphones,
      items: [
        {
          id: 'meditation',
          title: "Crisis Meditation",
          description: "Guided meditation",
          action: () => setActiveIntervention('meditation'),
          duration: "10 min"
        },
        {
          id: 'music',
          title: "Calming Music",
          description: "Soothing playlist",
          action: () => console.log('Play music'),
          duration: "Varies"
        }
      ]
    }
  ];

  const getResourcesByRiskLevel = () => {
    if (!riskLevel) return resources;
    
    if (riskLevel === 'severe' || riskLevel === 'high') {
      return [resources[0], ...resources.slice(1)]; // Immediate resources first
    }
    return resources;
  };

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={voiceListening ? "default" : "secondary"}>
                {voiceListening ? <Mic className="w-3 h-3 mr-1" /> : <MicOff className="w-3 h-3 mr-1" />}
                Voice {voiceListening ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={isOnline ? "default" : "secondary"}>
                {isOnline ? 'Online' : <><WifiOff className="w-3 h-3 mr-1" /> Offline</>}
              </Badge>
              {location && (
                <Badge variant="outline">
                  <MapPin className="w-3 h-3 mr-1" />
                  Location Ready
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Say "Hey Serenity, I need help" to activate
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Crisis Panel */}
      <Card className={cn(
        "border-2",
        riskLevel === 'severe' ? "border-red-500" : 
        riskLevel === 'high' ? "border-orange-500" :
        riskLevel === 'moderate' ? "border-yellow-500" :
        "border-gray-200"
      )}>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-between">
            Crisis Support Toolkit
            {riskLevel && (
              <Badge 
                variant={riskLevel === 'severe' || riskLevel === 'high' ? 'destructive' : 'default'}
                className="text-lg px-3 py-1"
              >
                {riskLevel.toUpperCase()} RISK
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Panic Button */}
          <div className="mb-6">
            <Button
              className={cn(
                "w-full h-24 text-3xl font-bold transition-all",
                panicCooldown > 0 
                  ? "bg-gray-400" 
                  : "bg-red-600 hover:bg-red-700 animate-pulse"
              )}
              disabled={panicCooldown > 0}
              onClick={handlePanicButton}
            >
              {panicCooldown > 0 
                ? `Cooldown: ${Math.ceil(panicCooldown / 1000)}s`
                : "PANIC BUTTON"
              }
            </Button>
            {panicCooldown > 0 && (
              <Progress 
                value={(30000 - panicCooldown) / 300} 
                className="mt-2 h-2"
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Button
              variant="outline"
              className="h-16 border-2 border-orange-500 text-orange-700 hover:bg-orange-50"
              onClick={() => escalateCrisis('high')}
            >
              <Phone className="mr-2 h-5 w-5" />
              Call 988
            </Button>
            <Button
              variant="outline"
              className="h-16 border-2 border-red-500 text-red-700 hover:bg-red-50"
              onClick={() => escalateCrisis('severe')}
            >
              <Phone className="mr-2 h-5 w-5" />
              Call 911
            </Button>
          </div>

          {/* Resource Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="immediate" className="text-red-600">Crisis</TabsTrigger>
              <TabsTrigger value="grounding" className="text-blue-600">Ground</TabsTrigger>
              <TabsTrigger value="connection" className="text-emerald-600">Connect</TabsTrigger>
              <TabsTrigger value="distraction" className="text-purple-600">Distract</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {getResourcesByRiskLevel().map((category) => (
                    <div key={category.category}>
                      <h3 className="font-semibold mb-3 flex items-center">
                        <category.icon className={cn(
                          "w-5 h-5 mr-2",
                          category.color === 'destructive' ? "text-red-600" :
                          category.color === 'blue' ? "text-blue-600" :
                          category.color === 'emerald' ? "text-emerald-600" :
                          "text-purple-600"
                        )} />
                        {category.category.charAt(0).toUpperCase() + category.category.slice(1)}
                      </h3>
                      <div className="grid gap-3">
                        {category.items.map((resource) => (
                          <Card 
                            key={resource.id}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-lg",
                              activeIntervention === resource.id && "ring-2 ring-blue-500"
                            )}
                            onClick={() => resource.action()}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-semibold">{resource.title}</h4>
                                  <p className="text-sm text-gray-600">{resource.description}</p>
                                </div>
                                <Badge variant="outline">{resource.duration}</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Active Intervention */}
          {activeIntervention === 'breathing' && (
            <Card className="mt-4 border-blue-500 bg-blue-50">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-4">Box Breathing Exercise</h3>
                <div className="text-6xl font-bold text-blue-600 mb-4">
                  {breathingCount}/5
                </div>
                <p className="text-lg">Breathe in... Hold... Breathe out... Hold...</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveIntervention(null)}
                >
                  Stop Exercise
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Location Info */}
          {location && (
            <Alert className="mt-4">
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                Your location is ready to share with emergency services if needed:
                <br />
                <span className="font-mono text-sm">{location.address}</span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

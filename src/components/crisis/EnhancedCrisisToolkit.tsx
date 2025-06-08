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
import { escalateCrisis } from '@/services/crisisEscalationService';
import { useOfflineCrisisData } from '@/hooks/useOfflineCrisisData';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EnhancedCrisisToolkitProps {
  isOffline?: boolean;
  moodScore?: number;
}

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: string;
  accuracy: 'High' | 'Medium' | 'Low';
  timestamp: Date;
}

const getEmergencyContacts = async (): Promise<EmergencyContact[]> => {
  const stored = localStorage.getItem('emergencyContacts');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error parsing emergency contacts:', error);
    }
  }
  return [];
};

export const EnhancedCrisisToolkit: React.FC<EnhancedCrisisToolkitProps> = ({ 
  isOffline = false,
  moodScore = 5 
}) => {
  const { user } = useAuth();
  const [panicCooldown, setPanicCooldown] = useState(0);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [activeIntervention, setActiveIntervention] = useState<string | null>(null);
  const [breathingCount, setBreathingCount] = useState(0);
  const [groundingStep, setGroundingStep] = useState(0);
  const [voiceListening, setVoiceListening] = useState(false);

  // Track panic button cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = panicModeService.getCooldownRemaining();
      setPanicCooldown(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Get location for emergency alerts
  useEffect(() => {
    setIsLoadingLocation(true);
    
    // First try to get cached location
    const cached = getCachedLocation();
    if (cached) {
      setLocation(cached);
    }

    // Then try to get current location
    getCurrentLocation()
      .then(loc => {
        setLocation(loc);
        setIsLoadingLocation(false);
      })
      .catch(err => {
        console.log('Location unavailable:', err);
        setIsLoadingLocation(false);
      });
  }, []);

  const handlePanicButton = async () => {
    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    const result = panicModeService.triggerPanic();

    if (!result.success) {
      toast.error(`Please wait ${Math.ceil(result.cooldownRemaining! / 1000)}s before triggering again`);
      return;
    }

    // Log crisis event
    const crisisEvent = {
      crisis_start_time: new Date(),
      resolution_time: new Date(),
      interventions_used: ['panic_button'],
      effectiveness_rating: 0,
      additional_notes: `Panic button triggered. Location: ${location?.address || 'Unknown'}. Initial mood: ${moodScore}`,
      safety_confirmed: false
    };

    try {
      if (offlineStorage.isOnline()) {
        await UltraSecureCrisisDataService.saveCrisisResolution(user.id, crisisEvent);
      } else {
        offlineStorage.queueForSync({
          type: 'crisis_resolution',
          data: crisisEvent
        });
        toast.warning("Offline mode: Crisis data will sync when connected");
      }
    } catch (error) {
      console.error('Error saving crisis event:', error);
    }

    // Send emergency notifications
    try {
      const emergencyContacts = await getEmergencyContacts();
      
      if (emergencyContacts.length === 0) {
        toast.warning("No emergency contacts found. Please add contacts in settings.");
      }

      const alertMessage = `URGENT: ${user.email || 'User'} needs help immediately. They have activated their panic button.`;
      
      for (const contact of emergencyContacts) {
        try {
          await Promise.all([
            sendMockSMS(contact, alertMessage, location?.address)
          ]);
        } catch (error) {
          console.error(`Failed to alert ${contact.name}:`, error);
        }
      }

      toast.success("Emergency contacts have been notified", {
        duration: 10000,
        description: `Alerted ${emergencyContacts.length} contact(s)`,
      });
    } catch (error) {
      console.error('Error sending emergency notifications:', error);
      toast.error("Failed to send some emergency notifications");
    }

    // Voice announcement
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("Emergency contacts have been notified. Help is on the way.");
      speechSynthesis.speak(utterance);
    }

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  };

  const startBreathingExercise = () => {
    setActiveIntervention('breathing');
    setBreathingCount(0);
    
    const breathingCycle = () => {
      if (breathingCount < 5) {
        const phases = ['Breathe in...', 'Hold...', 'Breathe out...', 'Hold...'];
        const currentPhase = phases[breathingCount % 4];
        
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(currentPhase);
          utterance.rate = 0.7;
          speechSynthesis.speak(utterance);
        }
        
        setTimeout(() => {
          setBreathingCount(prev => prev + 1);
          if (breathingCount < 4) {
            breathingCycle();
          } else {
            handleInterventionComplete('Box Breathing');
            setActiveIntervention(null);
          }
        }, 4000);
      }
    };
    
    breathingCycle();
  };

  const startGroundingExercise = () => {
    setActiveIntervention('grounding');
    setGroundingStep(0);
    
    const groundingSteps = [
      "Name 5 things you can see around you.",
      "Now, 4 things you can touch.",
      "3 things you can hear.",
      "2 things you can smell.",
      "And 1 thing you can taste.",
      "You are safe. You are present. You are grounded."
    ];
    
    if ('speechSynthesis' in window) {
      groundingSteps.forEach((step, index) => {
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(step);
          utterance.rate = 0.8;
          speechSynthesis.speak(utterance);
          setGroundingStep(index);
          
          if (index === groundingSteps.length - 1) {
            handleInterventionComplete('Grounding Exercise');
            setActiveIntervention(null);
          }
        }, index * 6000);
      });
    }
  };

  const handleInterventionComplete = (toolName: string) => {
    toast.success(`${toolName} completed`, {
      description: 'Great job using coping strategies!',
      duration: 3000,
    });
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

  const getResourcesByMoodScore = () => {
    if (moodScore <= 3) {
      // High risk - prioritize immediate and grounding resources
      return [resources[0], resources[1], ...resources.slice(2)];
    }
    return resources;
  };

  const OfflineCrisisTools = () => {
    const [cachedTools, setCachedTools] = useState<any[]>([]);

    useEffect(() => {
      // Load offline crisis tools
      offlineStorage.getData('crisisTools').then(tools => {
        setCachedTools(tools);
      }).catch(() => {
        // Fallback to default offline tools
        setCachedTools([
          { id: 1, name: 'Deep Breathing Exercise' },
          { id: 2, name: 'Grounding Technique (5-4-3-2-1)' },
          { id: 3, name: 'Emergency Contact Numbers' },
          { id: 4, name: 'Crisis Hotline: 988' }
        ]);
      });
    }, []);

    return (
      <Alert className="mb-4">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          You're offline. Cached crisis tools are available:
          <ul className="mt-2">
            {cachedTools.map(tool => (
              <li key={tool.id}>• {tool.name}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="space-y-4">
      {/* Offline Indicator */}
      {isOffline && <OfflineCrisisTools />}

      {/* Status Bar */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={voiceListening ? "default" : "secondary"}>
                {voiceListening ? <Mic className="w-3 h-3 mr-1" /> : <MicOff className="w-3 h-3 mr-1" />}
                Voice {voiceListening ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={!isOffline ? "default" : "secondary"}>
                {!isOffline ? 'Online' : <><WifiOff className="w-3 h-3 mr-1" /> Offline</>}
              </Badge>
              {location && (
                <Badge variant="outline">
                  <MapPin className="w-3 h-3 mr-1" />
                  Location Ready
                </Badge>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Say "Help me" or "Crisis" to activate
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crisis Escalation Card - Show for low mood scores */}
      {moodScore <= 3 && (
        <Card className="border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Emergency Escalation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full h-20 text-2xl panic-button"
              variant="destructive"
              disabled={panicCooldown > 0}
              onClick={handlePanicButton}
            >
              {panicCooldown > 0 
                ? `Cooldown: ${Math.ceil(panicCooldown / 1000)}s`
                : "PANIC BUTTON"
              }
            </Button>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="border-red-500 text-red-700 crisis-button"
                onClick={() => escalateCrisis('high')}
              >
                <Phone className="mr-2" />
                Call 988
              </Button>
              <Button
                variant="outline"
                className="border-red-700 text-red-900 crisis-button"
                onClick={() => escalateCrisis('severe')}
              >
                <Phone className="mr-2" />
                Call 911
              </Button>
            </div>
            
            {location && (
              <div className="text-sm text-gray-600">
                <MapPin className="inline mr-1" />
                Your location: {location.address}
              </div>
            )}
            
            {isLoadingLocation && (
              <div className="text-sm text-gray-500">
                Getting your location for emergency services...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Crisis Toolkit */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center justify-between">
            Crisis Support Toolkit
            {moodScore <= 3 && (
              <Badge variant="destructive" className="text-lg px-3 py-1">
                HIGH RISK
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  {getResourcesByMoodScore().map((category) => (
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

            {/* Individual category tabs */}
            {resources.map((category) => (
              <TabsContent key={category.category} value={category.category} className="mt-4">
                <div className="space-y-3">
                  {category.items.map((resource) => (
                    <Card 
                      key={resource.id}
                      className="cursor-pointer transition-all hover:shadow-lg"
                      onClick={() => resource.action()}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-semibold">{resource.title}</h4>
                            <p className="text-gray-600">{resource.description}</p>
                          </div>
                          <Badge variant="outline" className="text-sm">{resource.duration}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Active Intervention Display */}
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
                  onClick={() => {
                    setActiveIntervention(null);
                    setBreathingCount(0);
                    speechSynthesis.cancel();
                  }}
                >
                  Stop Exercise
                </Button>
              </CardContent>
            </Card>
          )}

          {activeIntervention === 'grounding' && (
            <Card className="mt-4 border-green-500 bg-green-50">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-4">5-4-3-2-1 Grounding</h3>
                <div className="text-4xl font-bold text-green-600 mb-4">
                  Step {groundingStep + 1}/6
                </div>
                <p className="text-lg">Follow the voice guidance for each step</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setActiveIntervention(null);
                    setGroundingStep(0);
                    speechSynthesis.cancel();
                  }}
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

          {/* Quick Crisis Resources */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Quick Crisis Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-600">
                • Crisis Text Line: Text HOME to 741741
              </p>
              <p className="text-sm text-gray-600">
                • National Suicide Prevention Lifeline: 988
              </p>
              <p className="text-sm text-gray-600">
                • Emergency Services: 911
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedCrisisToolkit;

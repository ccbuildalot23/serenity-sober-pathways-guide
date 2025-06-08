
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, MapPin, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { panicModeService } from '@/services/panicModeService';
import { getCurrentLocation, getCachedLocation } from '@/services/geolocationService';
import { sendMockSMS } from '@/services/mockSmsService';
import { sendMockPush } from '@/services/mockPushService';
import { escalateCrisis } from '@/services/crisisEscalationService';
import { offlineStorage } from '@/services/offlineStorageService';
import { UltraSecureCrisisDataService } from '@/services/ultraSecureCrisisDataService';

interface EnhancedCrisisToolkitProps {
  moodScore?: number;
  isOffline?: boolean;
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
  moodScore = 5, 
  isOffline = false 
}) => {
  const { user } = useAuth();
  const [panicCooldown, setPanicCooldown] = useState(0);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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
            sendMockSMS(contact, alertMessage, location?.address),
            sendMockPush(contact, alertMessage, location?.address)
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

  const CrisisEscalationCard = () => (
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
  );

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
      {isOffline && <OfflineCrisisTools />}
      {moodScore <= 3 && <CrisisEscalationCard />}
      
      {/* Additional toolkit components can be added here */}
      <Card>
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
    </div>
  );
};

export default EnhancedCrisisToolkit;

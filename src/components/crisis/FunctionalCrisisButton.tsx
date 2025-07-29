import React, { useState } from 'react';
import { AlertTriangle, Phone, Users, MapPin, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { useCrisisSMS } from '@/hooks/useCrisisSMS';
import { EmergencyContactsSetup } from './EmergencyContactsSetup';

const FunctionalCrisisButton: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [includeLocation, setIncludeLocation] = useState(true);
  const [isPressed, setIsPressed] = useState(false);
  const [sent, setSent] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  
  const { contacts, loading } = useEmergencyContacts();
  const { sendCrisisSMS, sendLocationUpdate, sending } = useCrisisSMS();

  const motivationalTexts = [
    "Reach Out",
    "Get Support", 
    "They want to support you",
    "Connect Now",
    "Asking for help is how we stay clean",
    "Your network wants to hear from you",
    "327 people used this button and stayed clean today"
  ];

  // Rotate text every 3 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % motivationalTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCrisisActivation = async () => {
    if (sending || contacts.length === 0) return; // Prevent double-clicks
    
    setIsPressed(true);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    try {
      await sendCrisisSMS({
        customMessage: customMessage.trim() || undefined,
        includeLocation,
      });
      setSent(true);
      // Immediately ask about location sharing if not already included
      if (!includeLocation) {
        setTimeout(() => {
          if (confirm("Would you like to share your location with your contacts?")) {
            handleLocationUpdate();
          }
        }, 1000);
      }
    } catch (error) {
      // Error handling is done in the hook
    }

    // Reset pressed state after animation
    setTimeout(() => setIsPressed(false), 2000);
  };

  const callEmergencyServices = () => {
    window.open('tel:911', '_self');
  };

  const call988 = () => {
    window.open('tel:988', '_self');
  };

  const handleLocationUpdate = async () => {
    try {
      await sendLocationUpdate();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  if (loading) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardContent className="p-6">
          <div className="animate-pulse text-center">
            <div className="h-4 bg-red-200 rounded mb-2"></div>
            <div className="h-8 bg-red-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardHeader className="pb-3">
          <CardTitle className="text-center text-red-800 dark:text-red-200 flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Crisis Support
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {contacts.length === 0 ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                Set up emergency contacts to use crisis support
              </p>
              <EmergencyContactsSetup />
            </div>
          ) : (
            <>
              <div className="text-center space-y-3">
                <div className="flex justify-center items-center gap-2">
                  <Users className="w-4 h-4 text-red-600" />
                  <Badge variant="outline" className="text-red-700 border-red-300">
                    {contacts.length} contact{contacts.length !== 1 ? 's' : ''} ready
                  </Badge>
                </div>
                
                <Button
                  onClick={handleCrisisActivation}
                  disabled={sending}
                  className={`
                    relative w-full min-h-16 text-lg font-bold overflow-hidden
                    bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500
                    hover:from-yellow-500 hover:via-orange-500 hover:to-yellow-600
                    text-black border-2 border-orange-400
                    transition-all duration-500 ease-in-out
                    ${isPressed ? 'scale-95' : ''}
                    ${sending ? 'animate-pulse' : ''}
                    ${motivationalTexts[currentTextIndex].length > 20 ? 'h-20 px-3' : 'h-16 px-6'}
                    shadow-lg hover:shadow-xl
                  `}
                  style={{
                    background: sending ? undefined : `
                      linear-gradient(45deg, #fbbf24, #f97316, #fbbf24),
                      radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.3) 20%, transparent 21%),
                      radial-gradient(circle at 80% 50%, rgba(255, 255, 255, 0.3) 20%, transparent 21%)
                    `
                  }}
                >
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl">
                      😊
                    </div>
                  </div>
                  
                  <div className="relative z-10">
                    {sending ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Sending Support...
                      </div>
                    ) : sent ? (
                      <div className="flex items-center justify-center gap-2 text-green-800">
                        ✓ Support Sent!
                      </div>
                    ) : (
                      <div className="text-center transition-all duration-500 ease-in-out">
                        <div className="font-bold animate-pulse">
                          {motivationalTexts[currentTextIndex]}
                        </div>
                      </div>
                    )}
                  </div>
                </Button>

                <p className="text-xs text-red-600 dark:text-red-400">
                  This will send SMS alerts to your emergency contacts immediately
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={call988}
                  variant="outline"
                  className="flex-1 text-red-700 border-red-300 hover:bg-red-100"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call 988
                </Button>
                <Button
                  onClick={callEmergencyServices}
                  variant="outline"
                  className="flex-1 text-red-700 border-red-300 hover:bg-red-100"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call 911
                </Button>
              </div>

              <div className="border-t border-red-200 pt-3">
                <Button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {showAdvanced ? 'Hide' : 'Show'} Options
                </Button>
              </div>

              {showAdvanced && (
                <div className="space-y-3 border-t border-red-200 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="custom-message" className="text-sm text-red-700">
                      Custom Message (Optional)
                    </Label>
                    <Textarea
                      id="custom-message"
                      placeholder="Add a personal message to your crisis alert..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-location"
                      checked={includeLocation}
                      onCheckedChange={setIncludeLocation}
                    />
                    <Label htmlFor="include-location" className="flex items-center gap-2 text-sm text-red-700">
                      <MapPin className="w-4 h-4" />
                      Include my location
                    </Label>
                  </div>

                  <Button
                    onClick={handleLocationUpdate}
                    disabled={sending}
                    variant="outline"
                    className="w-full text-red-700 border-red-300 hover:bg-red-100"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Send Location Update
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FunctionalCrisisButton;
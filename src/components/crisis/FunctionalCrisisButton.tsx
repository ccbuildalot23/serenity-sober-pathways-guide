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
  
  const { contacts, loading } = useEmergencyContacts();
  const { sendCrisisSMS, sending } = useCrisisSMS();

  const handleCrisisActivation = async () => {
    if (contacts.length === 0) {
      return;
    }

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
                    w-full h-16 text-lg font-bold
                    bg-red-600 hover:bg-red-700 text-white
                    border-2 border-red-500
                    transition-all duration-200
                    ${isPressed ? 'scale-95 bg-red-800' : ''}
                    ${sending ? 'animate-pulse' : ''}
                  `}
                >
                  {sending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending Alert...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-6 h-6" />
                      Send Crisis Alert
                    </div>
                  )}
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
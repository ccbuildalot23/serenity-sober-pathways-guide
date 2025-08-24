import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MessageCircle, 
  Users, 
  Map, 
  Heart, 
  Battery,
  Wifi,
  Volume2,
  Contrast
} from 'lucide-react';
// import MobileCrisisButton from './MobileCrisisButton'; // Functionality integrated into EnhancedCrisisSystem
import OfflineModeBanner from './OfflineModeBanner';
import { useMobileCrisis } from '@/hooks/useMobileCrisis';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface Contact {
  id: string;
  name: string;
  phone: string;
  type: 'emergency' | 'support' | 'professional';
}

const MobileCrisisInterface: React.FC = () => {
  const { 
    isMobile, 
    isContrastMode, 
    batteryLevel, 
    enableShakeDetection,
    getBatteryOptimizedSettings 
  } = useMobileCrisis();
  
  const { isOnline, offlineData, canWorkOffline } = useOfflineSync();
  const [location, setLocation] = useState<string>('');
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  
  const batterySettings = getBatteryOptimizedSettings();

  // Emergency contacts (would come from user data)
  const emergencyContacts: Contact[] = [
    { id: '1', name: '911', phone: '911', type: 'emergency' },
    { id: '2', name: 'Crisis Lifeline', phone: '988', type: 'professional' },
    { id: '3', name: 'Crisis Text Line', phone: '741741', type: 'professional' },
  ];

  const supportContacts: Contact[] = (offlineData._contacts || []).slice(0, 3);

  // Get user location for emergency services
  useEffect(() => {
    if (!isMobile) return;

    const getLocation = () => {
      setIsLocationLoading(true);
      
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
            setIsLocationLoading(false);
          },
          (_error) => {
            console._error('Location _error:', _error);
            setIsLocationLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    };

    getLocation();
  }, [isMobile]);

  const callContact = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const textContact = (phone: string) => {
    window.open(`sms:${phone}`, '_self');
  };

  if (!isMobile) {
    return null; // Mobile crisis button functionality is handled by EnhancedCrisisSystem
  }

  return (
    <>
      <OfflineModeBanner />
      
      <div className="min-h-screen bg-background p-4 pb-32">
        {/* Status Bar */}
        <div className="flex justify-between items-center mb-6 pt-16">
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              <Wifi className="h-3 w-3 mr-1" />
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            
            {batteryLevel < 0.2 && (
              <Badge variant="destructive">
                <Battery className="h-3 w-3 mr-1" />
                Low Battery
              </Badge>
            )}
            
            {isContrastMode && (
              <Badge variant="outline">
                <Contrast className="h-3 w-3 mr-1" />
                High Contrast
              </Badge>
            )}
          </div>

          <Button
            onClick={enableShakeDetection}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            Enable Shake Detection
          </Button>
        </div>

        {/* Location Display */}
        {location && (
          <Card className="mb-4">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Location: {location}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Emergency Actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              Emergency Help
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {emergencyContacts.map((contact) => (
                <div key={contact.id} className="flex gap-2">
                  <Button
                    onClick={() => callContact(contact.phone)}
                    className="flex-1 h-12 text-left justify-start"
                    variant={contact.type === 'emergency' ? 'destructive' : 'secondary'}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call {contact.name}
                  </Button>
                  
                  {contact.phone !== '911' && (
                    <Button
                      onClick={() => textContact(contact.phone)}
                      size="icon"
                      variant="outline"
                      className="h-12 w-12"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Support Network */}
        {supportContacts.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Your Support Network
              </h3>
              
              <div className="space-y-2">
                {supportContacts.map((contact) => (
                  <div key={contact.id} className="flex gap-2">
                    <Button
                      onClick={() => callContact(contact.phone)}
                      variant="outline"
                      className="flex-1 h-10 text-left justify-start"
                    >
                      <Phone className="h-3 w-3 mr-2" />
                      {contact.name}
                    </Button>
                    
                    <Button
                      onClick={() => textContact(contact.phone)}
                      size="icon"
                      variant="outline"
                      className="h-10 w-10"
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offline Status */}
        {!isOnline && (
          <Card className="mb-6 border-warning">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 text-warning">Offline Mode</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {canWorkOffline() 
                  ? 'You can still access your recovery plan, coping strategies, and saved resources.'
                  : 'Limited functionality available offline. Connect to sync your data.'
                }
              </p>
              
              {canWorkOffline() && (
                <div className="text-xs text-muted-foreground">
                  • Recovery plan available
                  • Coping strategies cached
                  • Emergency contacts accessible
                  • CBT exercises available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Battery Optimization Notice */}
        {batterySettings.textOnlyMode && (
          <Card className="mb-6 border-warning">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 text-warning">Battery Saver Mode</h3>
              <p className="text-sm text-muted-foreground">
                Reduced functionality to preserve battery. Crisis features remain fully available.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-muted-foreground" />
              Quick Actions
            </h3>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• <strong>Tap SOS button:</strong> Access crisis support</p>
              <p>• <strong>Double-tap SOS:</strong> Call 911 immediately</p>
              <p>• <strong>Shake device:</strong> Send emergency alert</p>
              <p>• <strong>Say "Hey app, help":</strong> Voice activation</p>
              <p>• <strong>Volume buttons (3s):</strong> Silent emergency</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Crisis Button - Handled by EnhancedCrisisSystem */}
    </>
  );
};

export default MobileCrisisInterface;
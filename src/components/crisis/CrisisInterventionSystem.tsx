import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import logger from '../../services/loggerService';
import { 
  AlertTriangle, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Users, 
  Heart, 
  Shield, 
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Loader2,
  Navigation,
  User,
  Star
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { useSupportNetwork } from '@/hooks/useSupportNetwork';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { therapeuticColors } from '@/styles/theme/colors';

interface CrisisInterventionSystemProps {
  className?: string;
  showProviderAlert?: boolean;
}

interface CrisisContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number;
  isEmergency: boolean;
}

interface CrisisMessage {
  id: string;
  title: string;
  content: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const CrisisInterventionSystem: React.FC<CrisisInterventionSystemProps> = ({
  className = "",
  showProviderAlert = true
}) => {
  const { user } = useAuth();
  const { contacts: emergencyContacts, addContact, deleteContact } = useEmergencyContacts();
  const { supportMembers, sendAlert } = useSupportNetwork();
  
  const [isActive, setIsActive] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [includeLocation, setIncludeLocation] = useState(true);
  const [locationData, setLocationData] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [alertResults, setAlertResults] = useState<Array<{ contactId: string; success: boolean; message: string }>>([]);
  const [followUpTimer, setFollowUpTimer] = useState<number | null>(null);

  // Pre-written crisis messages
  const crisisMessages: CrisisMessage[] = [
    {
      id: 'urgent',
      title: 'Urgent Support Needed',
      content: 'I need immediate support right now. Please call me as soon as possible.',
      severity: 'critical'
    },
    {
      id: 'craving',
      title: 'Strong Craving',
      content: 'I\'m experiencing intense cravings and need encouragement to stay strong.',
      severity: 'high'
    },
    {
      id: 'triggered',
      title: 'Feeling Triggered',
      content: 'I\'m feeling triggered and need someone to talk to right now.',
      severity: 'medium'
    },
    {
      id: 'difficult',
      title: 'Difficult Situation',
      content: 'I\'m in a difficult situation and could use some support.',
      severity: 'medium'
    },
    {
      id: 'custom',
      title: 'Custom Message',
      content: '',
      severity: 'low'
    }
  ];

  // Get current location
  const getCurrentLocation = useCallback(async (): Promise<{ lat: number; lng: number; address?: string } | null> => {
    if (!navigator.geolocation) {
      toast.error('Location services not available');
      return null;
    }

    setIsLoadingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Try to get address from coordinates
      let address = '';
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        if (data.results && data.results[0]) {
          address = data.results[0].formatted_address;
        }
      } catch (error) {
        logger.debug('Could not get address from coordinates', { component: 'CrisisInterventionSystem' });
      }

      return { lat: latitude, lng: longitude, address };
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('Could not get your location');
      return null;
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  // Initialize location when component mounts
  useEffect(() => {
    if (includeLocation && !locationData) {
      getCurrentLocation().then(setLocationData);
    }
  }, [includeLocation, locationData, getCurrentLocation]);

  // Handle crisis activation
  const handleCrisisActivation = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    if (!selectedMessage && !customMessage.trim()) {
      toast.error('Please select a message or write a custom message');
      return;
    }

    setShowConfirmation(true);
  };

  // Send crisis alerts
  const sendCrisisAlerts = async () => {
    setIsSending(true);
    setShowConfirmation(false);
    setIsActive(true);

    const results: Array<{ contactId: string; success: boolean; message: string }> = [];
    
    try {
      // Get location if needed
      let currentLocation = locationData;
      if (includeLocation && !currentLocation) {
        currentLocation = await getCurrentLocation();
      }

      // Prepare message content
      const messageContent = selectedMessage === 'custom' 
        ? customMessage.trim()
        : crisisMessages.find(m => m.id === selectedMessage)?.content || 'I need support right now.';

      // Send to emergency contacts
      for (const contactId of selectedContacts) {
        const contact = emergencyContacts.find(c => c.id === contactId);
        if (!contact) continue;

        try {
          // Send SMS via Supabase function
          const { data, error } = await supabase.functions.invoke('send-crisis-sms', {
            body: {
              contactIds: [contactId],
              customMessage: messageContent,
              includeLocation: includeLocation && currentLocation ? {
                latitude: currentLocation.lat,
                longitude: currentLocation.lng,
                address: currentLocation.address
              } : null,
              isTestMessage: false
            }
          });

          if (error) throw error;

          results.push({
            contactId,
            success: true,
            message: `Alert sent to ${contact.name}`
          });

          // Log crisis event
          await supabase.from('crisis_events').insert({
            user_id: user?.id,
            contact_id: contactId,
            message: messageContent,
            location_data: currentLocation,
            severity: 'high',
            status: 'sent'
          });

        } catch (error) {
          console.error(`Failed to send alert to ${contact?.name}:`, error);
          results.push({
            contactId,
            success: false,
            message: `Failed to send alert to ${contact?.name}`
          });
        }
      }

      // Send to support network members
      const crisisMembers = supportMembers.filter(m => 
        m.permissions.crisis_alerts && m._status === 'active'
      );

      for (const member of crisisMembers) {
        try {
          await sendAlert(member.id, {
            type: 'crisis_alert',
            title: 'Crisis Alert',
            message: messageContent,
            severity: 'crisis'
          });

          results.push({
            contactId: member.id,
            success: true,
            message: `Alert sent to ${member.member_name}`
          });
        } catch (error) {
          console.error(`Failed to send alert to ${member.member_name}:`, error);
          results.push({
            contactId: member.id,
            success: false,
            message: `Failed to send alert to ${member.member_name}`
          });
        }
      }

      setAlertResults(results);

      // Start follow-up timer
      setFollowUpTimer(300); // 5 minutes

      toast.success(`Crisis alerts sent to ${results.filter(r => r.success).length} contacts`);

      // Auto-escalate if no response in 5 minutes
      setTimeout(() => {
        if (followUpTimer === null) {
          handleEscalation();
        }
      }, 300000);

    } catch (error) {
      console.error('Error sending crisis alerts:', error);
      toast.error('Failed to send crisis alerts');
    } finally {
      setIsSending(false);
    }
  };

  // Handle escalation
  const handleEscalation = async () => {
    toast.warning('No response received. Escalating to professional services...');
    
    try {
      // Log escalation
      await supabase.from('crisis_events').insert({
        user_id: user?.id,
        message: 'Crisis escalation - no response from contacts',
        severity: 'critical',
        status: 'escalated'
      });

      // Show professional help options
      toast.error('Professional help is available. Call 988 or 911 if needed.', {
        duration: 10000,
        action: {
          label: 'Call 988',
          onClick: () => window.open('tel:988', '_self')
        }
      });
    } catch (error) {
      console.error('Error handling escalation:', error);
    }
  };

  // Handle contact selection
  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Handle message selection
  const handleMessageSelect = (messageId: string) => {
    setSelectedMessage(messageId);
    if (messageId !== 'custom') {
      setCustomMessage('');
    }
  };

  // Call emergency services
  const callEmergency = (number: string) => {
    window.open(`tel:${number}`, '_self');
  };

  // Text crisis line
  const textCrisisLine = () => {
    window.open('sms:741741&body=HOME', '_self');
  };

  if (isActive) {
    return (
      <div className={className}>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="w-6 h-6 mr-2" />
              Crisis Support Active
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alert Results */}
            <div className="space-y-2">
              <h4 className="font-semibold text-red-800">Alert Status:</h4>
              {alertResults.map((result, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">{result.message}</span>
                </div>
              ))}
            </div>

            {/* Follow-up Timer */}
            {followUpTimer !== null && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    Follow-up in {Math.floor(followUpTimer / 60)}:{(followUpTimer % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}

            {/* Emergency Services */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => callEmergency('988')}
                variant="destructive"
                className="w-full"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call 988
              </Button>
              <Button
                onClick={textCrisisLine}
                variant="outline"
                className="w-full"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Text HOME
              </Button>
            </div>

            <Button
              onClick={() => setIsActive(false)}
              variant="outline"
              className="w-full"
            >
              Close Crisis Mode
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center text-red-700">
            <Heart className="w-6 h-6 mr-2" />
            Crisis Intervention System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Emergency Services Quick Access */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-3">Emergency Services</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => callEmergency('988')}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <Phone className="w-4 h-4 mr-2" />
                Suicide & Crisis Lifeline
              </Button>
              <Button
                onClick={() => callEmergency('911')}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <Phone className="w-4 h-4 mr-2" />
                Emergency (911)
              </Button>
            </div>
          </div>

          {/* Contact Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Select contacts to alert:
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {emergencyContacts.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p>No emergency contacts set up</p>
                  <p className="text-sm">Add contacts in your support network</p>
                </div>
              ) : (
                emergencyContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={contact.id}
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => handleContactToggle(contact.id)}
                    />
                    <label 
                      htmlFor={contact.id}
                      className="flex items-center space-x-2 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{contact.name}</span>
                        {contact._is_emergency_contact && (
                          <Star className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                      <span className="text-sm text-gray-500">({contact.relationship})</span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Select message:
            </Label>
            <Select value={selectedMessage} onValueChange={handleMessageSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a message..." />
              </SelectTrigger>
              <SelectContent>
                {crisisMessages.map((message) => (
                  <SelectItem key={message.id} value={message.id}>
                    <div className="flex items-center space-x-2">
                      <span>{message.title}</span>
                      <Badge variant={message.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                        {message.severity}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Message */}
          {selectedMessage === 'custom' && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Your message:
              </Label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* Location Toggle */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="includeLocation"
              checked={includeLocation}
              onCheckedChange={(checked) => setIncludeLocation(checked as boolean)}
            />
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-600" />
              <Label htmlFor="includeLocation" className="text-sm">
                Include my location
              </Label>
            </div>
            {isLoadingLocation && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            )}
          </div>

          {/* Location Preview */}
          {includeLocation && locationData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  {locationData.address || `${locationData.lat.toFixed(4)}, ${locationData.lng.toFixed(4)}`}
                </span>
              </div>
            </div>
          )}

          {/* Send Button */}
          <Button
            onClick={handleCrisisActivation}
            disabled={isSending || selectedContacts.length === 0}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Alerts...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Crisis Alert
              </>
            )}
          </Button>

          {/* Safety Notice */}
          <div className="text-xs text-gray-500 text-center">
            <Shield className="w-3 h-3 inline mr-1" />
            Your safety is our priority. Professional help is always available.
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-700">
              <AlertTriangle className="w-6 h-6 mr-2" />
              Confirm Crisis Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">
              This will send an emergency alert to {selectedContacts.length} contact(s). 
              Are you sure you want to proceed?
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Remember:</strong> If you're in immediate danger, call 911 or 988 first.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={sendCrisisAlerts}
                variant="destructive"
                className="flex-1"
              >
                Send Alert
              </Button>
              <Button
                onClick={() => setShowConfirmation(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

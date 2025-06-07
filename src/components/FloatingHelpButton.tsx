import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Hand, AlertTriangle, Loader2, CheckCircle, XCircle, MapPin, AlertCircle, Mic, Zap, Clock, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { sendMockSMS } from '@/services/mockSmsService';
import { sendMockPush } from '@/services/mockPushService';
import { getCurrentLocation, getCachedLocation, type LocationData, type GeolocationError } from '@/services/geolocationService';
import { panicModeService } from '@/services/panicModeService';
import { getPhoneEmergencyContacts, hasPhoneContactsAccess } from '@/services/phoneContactsService';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
}

const FloatingHelpButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [alertResults, setAlertResults] = useState<{ success: string[]; failed: string[] } | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [panicCooldown, setPanicCooldown] = useState(0);
  const [phoneContacts, setPhoneContacts] = useState<any[]>([]);
  const [isLoadingPhoneContacts, setIsLoadingPhoneContacts] = useState(false);
  
  const { toast } = useToast();

  const preWrittenMessages = [
    { value: 'craving', label: 'Strong craving, need encouragement' },
    { value: 'triggered', label: 'Feeling triggered, need to talk' },
    { value: 'difficult', label: 'In a difficult situation, please check on me' },
    { value: 'custom', label: 'Custom message' }
  ];

  const quickTemplates = [
    { id: 'urgent', message: 'URGENT: I need immediate support. Please call me now.', label: 'Urgent Support' },
    { id: 'craving', message: 'Having intense cravings right now. Need encouragement to stay strong.', label: 'Craving Help' },
    { id: 'checkin', message: 'Struggling today and could use someone to check in on me.', label: 'Check-in Request' }
  ];

  // Keyboard shortcut: Ctrl/Cmd + H
  useKeyboardShortcuts([
    {
      key: 'h',
      ctrlKey: true,
      callback: () => {
        console.log('Emergency keyboard shortcut triggered');
        handleHelpClick();
      }
    }
  ]);

  useEffect(() => {
    const savedContacts = localStorage.getItem('supportContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }

    // Load phone emergency contacts
    loadPhoneContacts();
  }, [isModalOpen]);

  // Panic mode cooldown timer
  useEffect(() => {
    if (panicCooldown > 0) {
      const timer = setInterval(() => {
        setPanicCooldown(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [panicCooldown]);

  const loadPhoneContacts = async () => {
    if (!hasPhoneContactsAccess()) {
      console.log('No phone contacts access available');
      return;
    }

    setIsLoadingPhoneContacts(true);
    try {
      const phoneEmergencyContacts = await getPhoneEmergencyContacts();
      setPhoneContacts(phoneEmergencyContacts);
      console.log('Loaded phone emergency contacts:', phoneEmergencyContacts);
    } catch (error) {
      console.error('Failed to load phone contacts:', error);
    } finally {
      setIsLoadingPhoneContacts(false);
    }
  };

  const handleHelpClick = () => {
    console.log('Emergency help button clicked');
    setIsModalOpen(true);
    // Reset form when opening
    setSelectedMessage('');
    setCustomMessage('');
    setSelectedContacts([]);
    setIncludeLocation(false);
    setAlertResults(null);
    setLocationData(null);
    setLocationError(null);
  };

  const handleVoiceCommand = () => {
    setIsVoiceListening(true);
    console.log('Mock: Starting voice recognition for "Hey app, I need help"');
    
    // Simulate voice recognition
    setTimeout(() => {
      console.log('Mock: Voice command recognized - "Hey app, I need help"');
      setIsVoiceListening(false);
      handleHelpClick();
      toast({
        title: "Voice command recognized",
        description: "Emergency modal opened via voice command",
        duration: 3000,
      });
    }, 2000);
  };

  const handlePanicMode = async () => {
    const panicResult = panicModeService.triggerPanic();
    
    if (!panicResult.success) {
      const remainingSeconds = Math.ceil(panicResult.cooldownRemaining! / 1000);
      toast({
        title: "Panic mode in cooldown",
        description: `Please wait ${remainingSeconds} seconds before triggering again`,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    console.log('PANIC MODE ACTIVATED: Sending emergency alert to all contacts');
    setPanicCooldown(30000); // 30 seconds

    const allContacts = [
      ...contacts.filter(c => c.phone),
      ...phoneContacts
    ];

    if (allContacts.length === 0) {
      toast({
        title: "No contacts available",
        description: "Add emergency contacts to use panic mode",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setIsLoading(true);
    const panicMessage = "🚨 EMERGENCY ALERT: I need immediate help. This is urgent. Please contact me now.";
    
    // Get location for panic mode
    let location: string | undefined;
    try {
      const locationData = await getCurrentLocation();
      location = locationData.address;
    } catch (error) {
      console.log('Could not get location for panic mode');
    }

    const results = { success: [], failed: [] };

    for (const contact of allContacts) {
      try {
        const smsResult = await sendMockSMS(
          { 
            id: contact.id, 
            name: contact.name, 
            phone: contact.phone!, 
            relationship: contact.relationship 
          }, 
          panicMessage, 
          location
        );

        const pushResult = await sendMockPush(
          { 
            id: contact.id, 
            name: contact.name, 
            relationship: contact.relationship 
          }, 
          panicMessage, 
          location
        );

        if (smsResult.success) {
          results.success.push(contact.name);
        } else {
          results.failed.push(contact.name);
        }
      } catch (error) {
        console.error(`Error in panic mode for ${contact.name}:`, error);
        results.failed.push(contact.name);
      }
    }

    setIsLoading(false);

    toast({
      title: "🚨 PANIC MODE ALERT SENT",
      description: `Emergency alert sent to ${results.success.length} contacts`,
      duration: 10000,
    });
  };

  const handleQuickTemplate = async (template: typeof quickTemplates[0]) => {
    if (selectedContacts.length === 0) {
      toast({
        title: "Select contacts first",
        description: "Choose who to send this quick message to",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);
    console.log(`Sending quick template: ${template.label}`);

    const selectedContactObjects = contacts.filter(contact => 
      selectedContacts.includes(contact.id) && contact.phone
    );

    const location = includeLocation && locationData ? locationData.address : undefined;
    const results = { success: [], failed: [] };

    for (const contact of selectedContactObjects) {
      try {
        const smsResult = await sendMockSMS(
          { 
            id: contact.id, 
            name: contact.name, 
            phone: contact.phone!, 
            relationship: contact.relationship 
          }, 
          template.message, 
          location
        );

        const pushResult = await sendMockPush(
          { 
            id: contact.id, 
            name: contact.name, 
            relationship: contact.relationship 
          }, 
          template.message, 
          location
        );

        if (smsResult.success) {
          results.success.push(contact.name);
        } else {
          results.failed.push(contact.name);
        }
      } catch (error) {
        console.error(`Error sending template to ${contact.name}:`, error);
        results.failed.push(contact.name);
      }
    }

    setAlertResults(results);
    setIsLoading(false);

    toast({
      title: "Quick message sent!",
      description: `"${template.label}" sent to ${results.success.join(', ')}`,
      duration: 5000,
    });

    setTimeout(() => {
      setIsModalOpen(false);
    }, 2000);
  };

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const getMessageText = () => {
    if (selectedMessage === 'custom') {
      return customMessage;
    }
    const messageObj = preWrittenMessages.find(msg => msg.value === selectedMessage);
    return messageObj?.label || '';
  };

  const handleLocationToggle = async (checked: boolean) => {
    setIncludeLocation(checked);
    setLocationError(null);
    
    if (checked) {
      const cached = getCachedLocation();
      if (cached && (Date.now() - cached.timestamp.getTime()) < 300000) {
        setLocationData(cached);
        return;
      }
      
      setIsLoadingLocation(true);
      try {
        const location = await getCurrentLocation();
        setLocationData(location);
        console.log('Location obtained:', location);
      } catch (error) {
        const geoError = error as GeolocationError;
        setLocationError(geoError.message);
        setIncludeLocation(false);
        
        toast({
          title: "Location access failed",
          description: geoError.message,
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setIsLoadingLocation(false);
      }
    } else {
      setLocationData(null);
    }
  };

  const handleSendAlert = async () => {
    if (!selectedMessage || selectedContacts.length === 0) {
      return;
    }

    setIsLoading(true);
    setAlertResults(null);
    
    const messageText = getMessageText();
    const location = includeLocation && locationData ? locationData.address : undefined;
    const selectedContactObjects = contacts.filter(contact => 
      selectedContacts.includes(contact.id) && contact.phone
    );

    console.log('Sending emergency alert...');
    console.log('Message:', messageText);
    console.log('Selected contacts:', selectedContactObjects.map(c => c.name));
    console.log('Include location:', includeLocation);
    console.log('Location data:', locationData);

    const results = { success: [], failed: [] };

    for (const contact of selectedContactObjects) {
      try {
        const smsResult = await sendMockSMS(
          { 
            id: contact.id, 
            name: contact.name, 
            phone: contact.phone!, 
            relationship: contact.relationship 
          }, 
          messageText, 
          location
        );

        const pushResult = await sendMockPush(
          { 
            id: contact.id, 
            name: contact.name, 
            relationship: contact.relationship 
          }, 
          messageText, 
          location
        );

        if (smsResult.success) {
          results.success.push(contact.name);
          console.log(`SMS sent to ${contact.name}`);
        } else {
          results.failed.push(contact.name);
        }

        if (pushResult.success) {
          console.log(`Push notification sent for ${contact.name}`);
        } else {
          console.log(`Push notification failed for ${contact.name}:`, pushResult.error);
        }

      } catch (error) {
        console.error(`Error sending to ${contact.name}:`, error);
        results.failed.push(contact.name);
      }
    }

    setAlertResults(results);
    setIsLoading(false);

    if (results.success.length > 0) {
      toast({
        title: "Alert sent successfully!",
        description: `Alert sent to ${results.success.join(', ')}`,
        duration: 5000,
      });
    }

    if (results.failed.length > 0) {
      toast({
        title: "Some alerts failed",
        description: `Failed to send to ${results.failed.join(', ')}`,
        variant: "destructive",
        duration: 5000,
      });
    }

    if (results.failed.length === 0) {
      setTimeout(() => {
        setIsModalOpen(false);
      }, 2000);
    }
  };

  const isFormValid = selectedMessage && selectedContacts.length > 0 && 
    (selectedMessage !== 'custom' || customMessage.trim());

  return (
    <>
      {/* Enhanced Floating Help Buttons */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
        {/* Panic Mode Button */}
        <Button
          onClick={handlePanicMode}
          disabled={panicCooldown > 0 || isLoading}
          className={`w-16 h-16 rounded-full shadow-lg ${
            panicCooldown > 0 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse'
          }`}
          size="lg"
          title="Panic Mode - Send emergency alert to all contacts immediately"
        >
          <div className="flex flex-col items-center">
            {panicCooldown > 0 ? (
              <>
                <Clock className="w-5 h-5 text-white" />
                <span className="text-xs text-white font-bold">{Math.ceil(panicCooldown / 1000)}s</span>
              </>
            ) : (
              <>
                <Zap className="w-6 h-6 text-white" />
                <span className="text-xs text-white font-bold">PANIC</span>
              </>
            )}
          </div>
        </Button>

        {/* Voice Command Button */}
        <Button
          onClick={handleVoiceCommand}
          disabled={isVoiceListening}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
          size="lg"
          title="Voice Command - Say 'Hey app, I need help'"
        >
          <Mic className={`w-5 h-5 text-white ${isVoiceListening ? 'animate-pulse' : ''}`} />
        </Button>

        {/* Main Help Button */}
        <Button
          onClick={handleHelpClick}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg animate-pulse"
          size="lg"
          title="Emergency Help - Press Ctrl/Cmd + H"
        >
          <div className="flex flex-col items-center">
            <Hand className="w-6 h-6 text-white" />
            <span className="text-xs text-white font-bold mt-1">HELP</span>
          </div>
        </Button>
      </div>

      {/* Emergency Support Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600 text-lg">
              <AlertTriangle className="w-6 h-6 mr-2" />
              Emergency Support
              <Badge variant="outline" className="ml-2 text-xs">
                Ctrl+H
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Quick Templates */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Quick Send (1-tap):
              </label>
              <div className="grid grid-cols-1 gap-2">
                {quickTemplates.map((template) => (
                  <Button
                    key={template.id}
                    onClick={() => handleQuickTemplate(template)}
                    disabled={selectedContacts.length === 0 || isLoading}
                    variant="outline"
                    className="justify-start text-left h-auto py-3 px-4"
                  >
                    <div>
                      <div className="font-medium text-sm">{template.label}</div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {template.message}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Results Display */}
            {alertResults && (
              <div className="space-y-2">
                {alertResults.success.length > 0 && (
                  <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Alert sent to {alertResults.success.join(', ')}
                      </p>
                    </div>
                  </div>
                )}
                
                {alertResults.failed.length > 0 && (
                  <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Failed to send to {alertResults.failed.join(', ')}
                      </p>
                      <p className="text-xs text-red-600">Please try again</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select message:
              </label>
              <Select value={selectedMessage} onValueChange={setSelectedMessage}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a message..." />
                </SelectTrigger>
                <SelectContent>
                  {preWrittenMessages.map((message) => (
                    <SelectItem key={message.value} value={message.value}>
                      {message.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Message Input */}
            {selectedMessage === 'custom' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Your message:
                </label>
                <Textarea
                  placeholder="Type your message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Contact Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Alert these contacts:
              </label>
              
              {/* Phone Emergency Contacts */}
              {phoneContacts.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center text-xs text-blue-600 font-medium mb-2">
                    <Phone className="w-3 h-3 mr-1" />
                    Phone Emergency Contacts
                  </div>
                  <div className="space-y-2 max-h-24 overflow-y-auto border rounded-md p-2 bg-blue-50">
                    {phoneContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={contact.id}
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) => {
                            if (checked === true) {
                              setSelectedContacts(prev => [...prev, contact.id]);
                            } else {
                              setSelectedContacts(prev => prev.filter(id => id !== contact.id));
                            }
                          }}
                        />
                        <label 
                          htmlFor={contact.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {contact.name} ({contact.relationship})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* App Contacts */}
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No contacts found. Add contacts in Support Network settings.
                </p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {contacts
                    .filter(contact => contact.phone)
                    .map((contact) => (
                    <div key={contact.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={contact.id}
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setSelectedContacts(prev => [...prev, contact.id]);
                          } else {
                            setSelectedContacts(prev => prev.filter(id => id !== contact.id));
                          }
                        }}
                      />
                      <label 
                        htmlFor={contact.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {contact.name} ({contact.relationship})
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location Toggle and Preview */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="location"
                  checked={includeLocation}
                  onCheckedChange={handleLocationToggle}
                  disabled={isLoadingLocation}
                />
                <label 
                  htmlFor="location"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Include my current location
                </label>
                {isLoadingLocation && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                )}
              </div>

              {includeLocation && locationData && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-blue-800 font-medium">Current Location:</p>
                      <p className="text-xs text-blue-700 break-words">{locationData.address}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={locationData.accuracy === 'High' ? 'default' : locationData.accuracy === 'Medium' ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          Accuracy: {locationData.accuracy}
                        </Badge>
                        <span className="text-xs text-blue-600">
                          {new Date(locationData.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {locationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-red-800 font-medium">Location access failed</p>
                      <p className="text-xs text-red-700">{locationError}</p>
                      <p className="text-xs text-red-600 mt-1">Alert will be sent without location.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleSendAlert}
                disabled={!isFormValid || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Alert...
                  </>
                ) : (
                  'SEND ALERT'
                )}
              </Button>
              
              <Button
                onClick={() => setIsModalOpen(false)}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingHelpButton;

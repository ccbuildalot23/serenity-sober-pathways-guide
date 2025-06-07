import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Hand, AlertTriangle, Loader2, CheckCircle, XCircle, MapPin, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendMockSMS } from '@/services/mockSmsService';
import { getCurrentLocation, getCachedLocation, type LocationData, type GeolocationError } from '@/services/geolocationService';

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
  
  const { toast } = useToast();

  const preWrittenMessages = [
    { value: 'craving', label: 'Strong craving, need encouragement' },
    { value: 'triggered', label: 'Feeling triggered, need to talk' },
    { value: 'difficult', label: 'In a difficult situation, please check on me' },
    { value: 'custom', label: 'Custom message' }
  ];

  useEffect(() => {
    const savedContacts = localStorage.getItem('supportContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  }, [isModalOpen]);

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
      // Check for cached location first
      const cached = getCachedLocation();
      if (cached && (Date.now() - cached.timestamp.getTime()) < 300000) { // 5 minutes
        setLocationData(cached);
        return;
      }
      
      // Request fresh location
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
      selectedContacts.includes(contact.id) && contact.phone // Only include contacts with phone numbers
    );

    console.log('Sending emergency alert...');
    console.log('Message:', messageText);
    console.log('Selected contacts:', selectedContactObjects.map(c => c.name));
    console.log('Include location:', includeLocation);
    console.log('Location data:', locationData);

    const results = { success: [], failed: [] };

    // Send alerts to all selected contacts with phone numbers
    for (const contact of selectedContactObjects) {
      try {
        // Now contact is guaranteed to have a phone number due to the filter above
        const result = await sendMockSMS(
          { 
            id: contact.id, 
            name: contact.name, 
            phone: contact.phone!, 
            relationship: contact.relationship 
          }, 
          messageText, 
          location
        );
        if (result.success) {
          results.success.push(contact.name);
        } else {
          results.failed.push(contact.name);
        }
      } catch (error) {
        console.error(`Error sending to ${contact.name}:`, error);
        results.failed.push(contact.name);
      }
    }

    setAlertResults(results);
    setIsLoading(false);

    // Show toast notifications
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

    // Auto-close modal after successful sends (but keep open if there were failures)
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
      {/* Floating Help Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          onClick={handleHelpClick}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg animate-pulse"
          size="lg"
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
              I'm having an urge and need support
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
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
              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No contacts found. Add contacts in Support Network settings.
                </p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {contacts
                    .filter(contact => contact.phone) // Only show contacts with phone numbers
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

              {/* Location Preview */}
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

              {/* Location Error */}
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

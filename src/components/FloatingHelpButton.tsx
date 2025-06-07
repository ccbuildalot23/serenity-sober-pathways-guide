import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { sendMockSMS } from '@/services/mockSmsService';
import { sendMockPush } from '@/services/mockPushService';
import { getCurrentLocation, getCachedLocation, type LocationData, type GeolocationError } from '@/services/geolocationService';
import { panicModeService } from '@/services/panicModeService';
import { getPhoneEmergencyContacts, hasPhoneContactsAccess } from '@/services/phoneContactsService';
import EmergencyModal from './emergency/EmergencyModal';
import FloatingActionButtons from './emergency/FloatingActionButtons';

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

  const handleQuickTemplate = async (template: any) => {
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
    const preWrittenMessages = [
      { value: 'craving', label: 'Strong craving, need encouragement' },
      { value: 'triggered', label: 'Feeling triggered, need to talk' },
      { value: 'difficult', label: 'In a difficult situation, please check on me' },
      { value: 'custom', label: 'Custom message' }
    ];
    const messageObj = preWrittenMessages.find(msg => msg.value === selectedMessage);
    return messageObj?.label || '';
  };

  const handleLocationToggle = async (checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;
    setIncludeLocation(isChecked);
    setLocationError(null);
    
    if (isChecked) {
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
      <FloatingActionButtons
        onHelpClick={handleHelpClick}
        onVoiceCommand={handleVoiceCommand}
        onPanicMode={handlePanicMode}
        isVoiceListening={isVoiceListening}
        panicCooldown={panicCooldown}
        isLoading={isLoading}
      />

      {/* Emergency Support Modal */}
      <EmergencyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedMessage={selectedMessage}
        onMessageChange={setSelectedMessage}
        customMessage={customMessage}
        onCustomMessageChange={setCustomMessage}
        selectedContacts={selectedContacts}
        onContactToggle={handleContactToggle}
        includeLocation={includeLocation}
        onLocationToggle={handleLocationToggle}
        isLoading={isLoading}
        contacts={contacts}
        phoneContacts={phoneContacts}
        isLoadingPhoneContacts={isLoadingPhoneContacts}
        alertResults={alertResults}
        locationData={locationData}
        isLoadingLocation={isLoadingLocation}
        locationError={locationError}
        onSendAlert={handleSendAlert}
        onQuickTemplate={handleQuickTemplate}
        isFormValid={isFormValid}
      />
    </>
  );
};

export default FloatingHelpButton;

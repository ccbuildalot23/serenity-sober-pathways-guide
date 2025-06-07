
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Hand, AlertTriangle, Loader2 } from 'lucide-react';

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

  const handleSendAlert = async () => {
    if (!selectedMessage || selectedContacts.length === 0) {
      return;
    }

    setIsLoading(true);
    console.log('Sending emergency alert...');
    console.log('Message:', getMessageText());
    console.log('Selected contacts:', selectedContacts);
    console.log('Include location:', includeLocation);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsModalOpen(false);
      console.log('Emergency alert sent successfully!');
      // TODO: Show success toast/notification
    }, 2000);
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
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={contact.id}
                        checked={selectedContacts.includes(contact.id)}
                        onCheckedChange={() => handleContactToggle(contact.id)}
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

            {/* Location Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="location"
                checked={includeLocation}
                onCheckedChange={(checked) => setIncludeLocation(checked === true)}
              />
              <label 
                htmlFor="location"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Include my current location
              </label>
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

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Phone, MapPin, Users, Clock, AlertTriangle, Send, X } from 'lucide-react';

const FloatingHelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState('main');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [includeLocation, setIncludeLocation] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState('medium');

  const mockContacts = [
    { id: '1', name: 'Sarah (Sponsor)', phone: '+1 (555) 123-4567', relationship: 'sponsor' },
    { id: '2', name: 'Mom', phone: '+1 (555) 234-5678', relationship: 'family' },
    { id: '3', name: 'Dr. Johnson', phone: '+1 (555) 345-6789', relationship: 'therapist' },
    { id: '4', name: 'Mike (AA Buddy)', phone: '+1 (555) 456-7890', relationship: 'peer' },
  ];

  const messageTemplates = [
    { id: 'craving', text: "I'm experiencing strong cravings right now and could use some support. Can we talk?" },
    { id: 'anxiety', text: "I'm feeling overwhelmed with anxiety. Would you be available to chat?" },
    { id: 'general', text: "I'm struggling today and could use someone to talk to. Are you free?" },
    { id: 'meeting', text: "I'm having a tough day. Can you help me find a meeting nearby?" },
  ];

  const handleContactToggle = (contactId: string) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleLocationToggle = (checked: boolean | 'indeterminate') => {
    // Convert the value to boolean, treating 'indeterminate' as false
    setIncludeLocation(checked === true);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = messageTemplates.find(t => t.id === templateId);
    if (template) {
      setCustomMessage(template.text);
      setSelectedTemplate(templateId);
    }
  };

  const handleSendAlert = () => {
    console.log('Sending alert:', {
      contacts: selectedContacts,
      message: customMessage,
      location: includeLocation,
      urgency: urgencyLevel,
    });
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep('main');
    setSelectedContacts([]);
    setCustomMessage('');
    setSelectedTemplate('');
    setIncludeLocation(false);
    setUrgencyLevel('medium');
  };

  const renderContactSelector = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Select Support Contacts</h3>
        <Button variant="ghost" size="sm" onClick={() => setCurrentStep('main')}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {mockContacts.map(contact => (
          <div key={contact.id} className="flex items-center space-x-3 p-3 border rounded-lg">
            <Checkbox
              checked={selectedContacts.includes(contact.id)}
              onCheckedChange={() => handleContactToggle(contact.id)}
            />
            <div className="flex-1">
              <div className="font-medium">{contact.name}</div>
              <div className="text-sm text-gray-500">{contact.phone}</div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {contact.relationship}
            </Badge>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={includeLocation}
            onCheckedChange={handleLocationToggle}
          />
          <Label className="text-sm">Include my current location</Label>
        </div>

        <div>
          <Label className="text-sm font-medium">Urgency Level</Label>
          <RadioGroup value={urgencyLevel} onValueChange={setUrgencyLevel} className="mt-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="low" id="low" />
              <Label htmlFor="low">Low - Can wait</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="medium" />
              <Label htmlFor="medium">Medium - Need support soon</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="high" id="high" />
              <Label htmlFor="high">High - Need immediate help</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <Button 
        onClick={() => setCurrentStep('message')} 
        className="w-full mt-6"
        disabled={selectedContacts.length === 0}
      >
        Next: Compose Message
      </Button>
    </Card>
  );

  const renderMessageComposer = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Compose Your Message</h3>
        <Button variant="ghost" size="sm" onClick={() => setCurrentStep('contacts')}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Quick Templates</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose a template or write custom message" />
            </SelectTrigger>
            <SelectContent>
              {messageTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.text.substring(0, 50)}...
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Your Message</Label>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Type your message here..."
            className="mt-2 h-32"
          />
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm font-medium mb-2">Will be sent to:</div>
          <div className="space-y-1">
            {selectedContacts.map(contactId => {
              const contact = mockContacts.find(c => c.id === contactId);
              return contact ? (
                <div key={contactId} className="text-sm text-gray-600">
                  • {contact.name}
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>

      <Button 
        onClick={handleSendAlert} 
        className="w-full mt-6 bg-red-600 hover:bg-red-700"
        disabled={!customMessage.trim()}
      >
        <Send className="w-4 h-4 mr-2" />
        Send Alert Now
      </Button>
    </Card>
  );

  const renderMainMenu = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-center">Need Support Right Now?</h3>
      
      <div className="space-y-3">
        <Button 
          onClick={() => setCurrentStep('contacts')} 
          className="w-full justify-start bg-red-600 hover:bg-red-700 text-white"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Send Alert to Support Network
        </Button>
        
        <Button variant="outline" className="w-full justify-start">
          <Phone className="w-4 h-4 mr-2" />
          Call Crisis Hotline
        </Button>
        
        <Button variant="outline" className="w-full justify-start">
          <MapPin className="w-4 h-4 mr-2" />
          Find Nearby Meeting
        </Button>
        
        <Button variant="outline" className="w-full justify-start">
          <Users className="w-4 h-4 mr-2" />
          Connect with Peer Support
        </Button>
      </div>
      
      <div className="mt-4 pt-4 border-t text-center">
        <div className="text-sm text-gray-600">
          Crisis Hotline: <span className="font-medium">988</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Available 24/7 for immediate support
        </div>
      </div>
    </Card>
  );

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg animate-emergency-pulse"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {currentStep === 'main' && renderMainMenu()}
        {currentStep === 'contacts' && renderContactSelector()}
        {currentStep === 'message' && renderMessageComposer()}
      </div>
    </div>
  );
};

export default FloatingHelpButton;

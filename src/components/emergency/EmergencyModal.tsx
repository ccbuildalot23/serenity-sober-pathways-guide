
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2 } from 'lucide-react';
import QuickTemplates from './QuickTemplates';
import ContactSelector from './ContactSelector';
import LocationSelector from './LocationSelector';
import AlertResults from './AlertResults';
import { LocationData } from '@/services/geolocationService';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
}

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMessage: string;
  onMessageChange: (value: string) => void;
  customMessage: string;
  onCustomMessageChange: (value: string) => void;
  selectedContacts: string[];
  onContactToggle: (contactId: string) => void;
  includeLocation: boolean;
  onLocationToggle: (checked: boolean) => void;
  isLoading: boolean;
  contacts: Contact[];
  phoneContacts: any[];
  isLoadingPhoneContacts: boolean;
  alertResults: { success: string[]; failed: string[] } | null;
  locationData: LocationData | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  onSendAlert: () => void;
  onQuickTemplate: (template: any) => void;
  isFormValid: boolean;
}

const EmergencyModal = ({
  isOpen,
  onClose,
  selectedMessage,
  onMessageChange,
  customMessage,
  onCustomMessageChange,
  selectedContacts,
  onContactToggle,
  includeLocation,
  onLocationToggle,
  isLoading,
  contacts,
  phoneContacts,
  isLoadingPhoneContacts,
  alertResults,
  locationData,
  isLoadingLocation,
  locationError,
  onSendAlert,
  onQuickTemplate,
  isFormValid
}: EmergencyModalProps) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <QuickTemplates
            templates={quickTemplates}
            onTemplateClick={onQuickTemplate}
            selectedContacts={selectedContacts}
            isLoading={isLoading}
          />

          {/* Results Display */}
          <AlertResults results={alertResults} />

          {/* Message Selection */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select message:
            </label>
            <Select value={selectedMessage} onValueChange={onMessageChange}>
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
                onChange={(e) => onCustomMessageChange(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Contact Selection */}
          <ContactSelector
            contacts={contacts}
            phoneContacts={phoneContacts}
            selectedContacts={selectedContacts}
            onContactToggle={onContactToggle}
            isLoadingPhoneContacts={isLoadingPhoneContacts}
          />

          {/* Location Toggle and Preview */}
          <LocationSelector
            includeLocation={includeLocation}
            onLocationToggle={onLocationToggle}
            isLoadingLocation={isLoadingLocation}
            locationData={locationData}
            locationError={locationError}
          />

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={onSendAlert}
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
              onClick={onClose}
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
  );
};

export default EmergencyModal;

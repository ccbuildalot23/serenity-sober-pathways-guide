
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Phone, 
  MessageSquare, 
  Plus, 
  MapPin, 
  Clock,
  Heart,
  AlertTriangle,
  User,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  allowLocationSharing: boolean;
  addedAt: Date;
}

interface EmergencyContactsQuickAccessProps {
  onContactAdded?: (contact: EmergencyContact) => void;
  onContactCalled?: (contact: EmergencyContact) => void;
  onContactTexted?: (contact: EmergencyContact) => void;
}

const EmergencyContactsQuickAccess: React.FC<EmergencyContactsQuickAccessProps> = ({
  onContactAdded,
  onContactCalled,
  onContactTexted
}) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone: '',
    isPrimary: false
  });

  useEffect(() => {
    const savedContacts = localStorage.getItem('emergencyContacts');
    if (savedContacts) {
      const parsed = JSON.parse(savedContacts);
      setContacts(parsed.map((c: any) => ({ ...c, addedAt: new Date(c.addedAt) })));
    }
  }, []);

  const saveContacts = (updatedContacts: EmergencyContact[]) => {
    setContacts(updatedContacts);
    localStorage.setItem('emergencyContacts', JSON.stringify(updatedContacts));
  };

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      toast.error('Please fill in name and phone number');
      return;
    }

    const contact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContact.name,
      relationship: newContact.relationship || 'Emergency Contact',
      phone: newContact.phone,
      isPrimary: newContact.isPrimary,
      allowLocationSharing: includeLocation,
      addedAt: new Date()
    };

    const updatedContacts = [...contacts, contact];
    saveContacts(updatedContacts);
    onContactAdded?.(contact);

    setNewContact({ name: '', relationship: '', phone: '', isPrimary: false });
    setIncludeLocation(false);
    setIsAdding(false);

    toast.success(`${contact.name} added to emergency contacts`);
  };

  const handleCall = (contact: EmergencyContact) => {
    window.open(`tel:${contact.phone}`, '_self');
    onContactCalled?.(contact);
    
    toast.info(`Calling ${contact.name}...`);
  };

  const handleText = async (contact: EmergencyContact) => {
    let message = "I'm struggling right now and need support. Can you talk?";
    
    if (contact.allowLocationSharing && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        
        const { latitude, longitude } = position.coords;
        message += ` My current location: https://maps.google.com/?q=${latitude},${longitude}`;
      } catch (error) {
        console.log('Location sharing failed, sending message without location');
      }
    }

    const encodedMessage = encodeURIComponent(message);
    window.open(`sms:${contact.phone}&body=${encodedMessage}`, '_self');
    onContactTexted?.(contact);

    toast.info(`Sending crisis message to ${contact.name}...`);
  };

  const crisisTextTemplates = [
    "I'm struggling right now and need support. Can you talk?",
    "Having a really difficult moment. Could use someone to check on me.",
    "I'm safe but need emotional support right now. Are you available?",
    "Going through a tough time and could use a friend to talk to."
  ];

  const removeContact = (contactId: string) => {
    const updatedContacts = contacts.filter(c => c.id !== contactId);
    saveContacts(updatedContacts);
    toast.success('Contact removed');
  };

  const primaryContacts = contacts.filter(c => c.isPrimary);
  const secondaryContacts = contacts.filter(c => !c.isPrimary);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-red-600">Emergency Contacts</h3>
          <p className="text-sm text-gray-600">Quick access for crisis situations</p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          size="sm"
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Contact
        </Button>
      </div>

      {/* Add Contact Form */}
      {isAdding && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Add Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Contact name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  placeholder="e.g., Sponsor, Family, Friend"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Phone number"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="primary"
                checked={newContact.isPrimary}
                onCheckedChange={(checked) => setNewContact({ ...newContact, isPrimary: checked })}
              />
              <Label htmlFor="primary">Priority contact (called first)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="location"
                checked={includeLocation}
                onCheckedChange={setIncludeLocation}
              />
              <Label htmlFor="location">Share location in crisis messages</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddContact} className="flex-1 bg-red-600 hover:bg-red-700">
                Add Emergency Contact
              </Button>
              <Button onClick={() => setIsAdding(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Contacts */}
      {primaryContacts.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
            Priority Contacts
          </h4>
          <div className="space-y-2">
            {primaryContacts.map((contact) => (
              <Card key={contact.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{contact.name}</span>
                          <Badge className="bg-red-500 text-xs">Priority</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{contact.relationship}</p>
                        <p className="text-xs text-gray-500">{contact.phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        onClick={() => handleCall(contact)}
                        className="bg-green-600 hover:bg-green-700 p-2"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleText(contact)}
                        className="bg-blue-600 hover:bg-blue-700 p-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeContact(contact.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {contact.allowLocationSharing && (
                    <div className="mt-2 flex items-center text-xs text-green-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      Location sharing enabled
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Secondary Contacts */}
      {secondaryContacts.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Other Emergency Contacts</h4>
          <div className="space-y-2">
            {secondaryContacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <span className="font-medium">{contact.name}</span>
                        <p className="text-sm text-gray-600">{contact.relationship}</p>
                        <p className="text-xs text-gray-500">{contact.phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        onClick={() => handleCall(contact)}
                        className="bg-green-600 hover:bg-green-700 p-2"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleText(contact)}
                        className="bg-blue-600 hover:bg-blue-700 p-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeContact(contact.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {contact.allowLocationSharing && (
                    <div className="mt-2 flex items-center text-xs text-green-600">
                      <MapPin className="w-3 h-3 mr-1" />
                      Location sharing enabled
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {contacts.length === 0 && !isAdding && (
        <Card className="p-6 text-center border-red-200">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-600 mb-2">No emergency contacts yet</h4>
          <p className="text-sm text-gray-500 mb-4">
            Add trusted people who can support you during crisis moments
          </p>
          <Button onClick={() => setIsAdding(true)} className="bg-red-600 hover:bg-red-700">
            Add Your First Emergency Contact
          </Button>
        </Card>
      )}

      {/* Crisis Text Templates */}
      {contacts.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Crisis Message Templates</h4>
          <div className="space-y-2">
            {crisisTextTemplates.map((template, index) => (
              <div key={index} className="text-sm text-blue-700 p-2 bg-white rounded border">
                "{template}"
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default EmergencyContactsQuickAccess;

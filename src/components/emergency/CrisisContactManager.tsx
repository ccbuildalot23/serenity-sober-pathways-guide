
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MessageSquare, 
  User, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  Heart,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface CrisisContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  priorityOrder: number;
  notificationPreferences: {
    crisis: boolean;
    milestones: boolean;
    preferredMethod: 'phone' | 'text' | 'both';
  };
  isEmergencyContact: boolean;
  responseTime?: string;
  lastContacted?: Date;
}

const CrisisContactManager = () => {
  const [contacts, setContacts] = useState<CrisisContact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState<Partial<CrisisContact>>({
    name: '',
    relationship: '',
    phoneNumber: '',
    email: '',
    priorityOrder: 1,
    notificationPreferences: {
      crisis: true,
      milestones: false,
      preferredMethod: 'both'
    },
    isEmergencyContact: true
  });

  useEffect(() => {
    const savedContacts = localStorage.getItem('crisisContacts');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    } else {
      // Demo emergency contacts
      const demoContacts: CrisisContact[] = [
        {
          id: '1',
          name: 'Sarah (Sponsor)',
          relationship: 'Sponsor',
          phoneNumber: '555-0123',
          priorityOrder: 1,
          notificationPreferences: {
            crisis: true,
            milestones: true,
            preferredMethod: 'both'
          },
          isEmergencyContact: true
        },
        {
          id: '2',
          name: 'Mom',
          relationship: 'Family',
          phoneNumber: '555-0124',
          priorityOrder: 2,
          notificationPreferences: {
            crisis: true,
            milestones: false,
            preferredMethod: 'phone'
          },
          isEmergencyContact: true
        }
      ];
      setContacts(demoContacts);
    }
  }, []);

  const saveContacts = (updatedContacts: CrisisContact[]) => {
    setContacts(updatedContacts);
    localStorage.setItem('crisisContacts', JSON.stringify(updatedContacts));
  };

  const handleAddContact = () => {
    if (!newContact.name?.trim() || !newContact.phoneNumber?.trim()) return;

    const contact: CrisisContact = {
      id: Date.now().toString(),
      name: newContact.name,
      relationship: newContact.relationship || 'Support Person',
      phoneNumber: newContact.phoneNumber,
      email: newContact.email,
      priorityOrder: contacts.length + 1,
      notificationPreferences: newContact.notificationPreferences!,
      isEmergencyContact: newContact.isEmergencyContact || false
    };

    saveContacts([...contacts, contact]);
    setNewContact({
      name: '',
      relationship: '',
      phoneNumber: '',
      email: '',
      priorityOrder: 1,
      notificationPreferences: {
        crisis: true,
        milestones: false,
        preferredMethod: 'both'
      },
      isEmergencyContact: true
    });
    setIsAdding(false);
  };

  const movePriority = (contactId: string, direction: 'up' | 'down') => {
    const contactIndex = contacts.findIndex(c => c.id === contactId);
    if (contactIndex === -1) return;

    const newContacts = [...contacts];
    const targetIndex = direction === 'up' ? contactIndex - 1 : contactIndex + 1;

    if (targetIndex < 0 || targetIndex >= contacts.length) return;

    // Swap contacts
    [newContacts[contactIndex], newContacts[targetIndex]] = 
    [newContacts[targetIndex], newContacts[contactIndex]];

    // Update priority orders
    newContacts.forEach((contact, index) => {
      contact.priorityOrder = index + 1;
    });

    saveContacts(newContacts);
  };

  const removeContact = (contactId: string) => {
    const updatedContacts = contacts
      .filter(c => c.id !== contactId)
      .map((contact, index) => ({
        ...contact,
        priorityOrder: index + 1
      }));
    saveContacts(updatedContacts);
  };

  const handleCall = (contact: CrisisContact) => {
    const updatedContacts = contacts.map(c => 
      c.id === contact.id 
        ? { ...c, lastContacted: new Date() }
        : c
    );
    saveContacts(updatedContacts);
    window.open(`tel:${contact.phoneNumber}`);
  };

  const handleMessage = (contact: CrisisContact) => {
    const updatedContacts = contacts.map(c => 
      c.id === contact.id 
        ? { ...c, lastContacted: new Date() }
        : c
    );
    saveContacts(updatedContacts);
    const message = "I'm struggling right now and need support. Can you talk?";
    window.open(`sms:${contact.phoneNumber}&body=${encodeURIComponent(message)}`);
  };

  const getPriorityBadge = (priority: number) => {
    if (priority === 1) return <Badge className="bg-red-500">Priority 1</Badge>;
    if (priority === 2) return <Badge className="bg-orange-500">Priority 2</Badge>;
    if (priority === 3) return <Badge className="bg-yellow-500">Priority 3</Badge>;
    return <Badge variant="outline">Priority {priority}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Emergency Contacts</h3>
          <p className="text-sm text-gray-600">
            Manage your crisis support network with priority ordering
          </p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Contact
        </Button>
      </div>

      {isAdding && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
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
                  value={newContact.name || ''}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="relationship">Relationship *</Label>
                <Input
                  id="relationship"
                  placeholder="e.g., Sponsor, Family, Friend"
                  value={newContact.relationship || ''}
                  onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Phone number"
                  value={newContact.phoneNumber || ''}
                  onChange={(e) => setNewContact({...newContact, phoneNumber: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={newContact.email || ''}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="preferredMethod">Preferred Contact Method</Label>
              <Select 
                value={newContact.notificationPreferences?.preferredMethod || 'both'}
                onValueChange={(value: 'phone' | 'text' | 'both') => 
                  setNewContact({
                    ...newContact, 
                    notificationPreferences: {
                      ...newContact.notificationPreferences!,
                      preferredMethod: value
                    }
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="text">Text Message</SelectItem>
                  <SelectItem value="both">Both Phone & Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="crisisAlerts"
                checked={newContact.notificationPreferences?.crisis || false}
                onCheckedChange={(checked) => 
                  setNewContact({
                    ...newContact,
                    notificationPreferences: {
                      ...newContact.notificationPreferences!,
                      crisis: checked
                    }
                  })
                }
              />
              <Label htmlFor="crisisAlerts">Notify during crisis events</Label>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleAddContact}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Add Emergency Contact
              </Button>
              <Button 
                onClick={() => setIsAdding(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {contacts
          .sort((a, b) => a.priorityOrder - b.priorityOrder)
          .map((contact, index) => (
          <Card key={contact.id} className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                      {getPriorityBadge(contact.priorityOrder)}
                    </div>
                    <p className="text-sm text-gray-600">{contact.relationship}</p>
                    <p className="text-xs text-gray-500">{contact.phoneNumber}</p>
                    {contact.lastContacted && (
                      <p className="text-xs text-green-600 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Last contacted: {new Date(contact.lastContacted).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Priority Controls */}
                  <div className="flex flex-col">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => movePriority(contact.id, 'up')}
                      disabled={index === 0}
                      className="h-6 p-1"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => movePriority(contact.id, 'down')}
                      disabled={index === contacts.length - 1}
                      className="h-6 p-1"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Contact Actions */}
                  <div className="flex space-x-1">
                    {(contact.notificationPreferences.preferredMethod === 'phone' || 
                      contact.notificationPreferences.preferredMethod === 'both') && (
                      <Button
                        size="sm"
                        onClick={() => handleCall(contact)}
                        className="bg-green-600 hover:bg-green-700 p-2"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    )}
                    {(contact.notificationPreferences.preferredMethod === 'text' || 
                      contact.notificationPreferences.preferredMethod === 'both') && (
                      <Button
                        size="sm"
                        onClick={() => handleMessage(contact)}
                        className="bg-blue-600 hover:bg-blue-700 p-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    )}
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
              </div>

              <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
                {contact.notificationPreferences.crisis && (
                  <span className="flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />
                    Crisis Alerts
                  </span>
                )}
                {contact.notificationPreferences.milestones && (
                  <span className="flex items-center">
                    <Heart className="w-3 h-3 mr-1 text-green-500" />
                    Milestone Alerts
                  </span>
                )}
                <span>Preferred: {contact.notificationPreferences.preferredMethod}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {contacts.length === 0 && !isAdding && (
        <Card className="p-6 text-center border-red-200">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h4 className="font-semibold text-gray-600 mb-2">No emergency contacts yet</h4>
          <p className="text-sm text-gray-500 mb-4">
            Add trusted people who can support you during crisis moments
          </p>
          <Button 
            onClick={() => setIsAdding(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            Add Your First Emergency Contact
          </Button>
        </Card>
      )}

      {contacts.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-red-800 mb-1">Crisis Contact Guidelines</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Priority 1 contacts will be notified first during emergencies</li>
                <li>• All contacts with crisis alerts enabled will receive notifications</li>
                <li>• Test your contacts regularly to ensure they're available</li>
                <li>• Include a mix of professional and personal support</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CrisisContactManager;

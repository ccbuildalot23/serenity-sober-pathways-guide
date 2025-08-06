import React, { useState } from 'react';
import { useEmergencyContacts } from '@/hooks/useEmergencyContacts';
import { useCrisisSMS } from '@/hooks/useCrisisSMS';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Phone,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  TestTube,
  Heart,
  AlertCircle,
  CheckCircle,
  Users
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const EmergencyContactsManager: React.FC = () => {
  const { contacts, loading, saving, addContact, updateContact, deleteContact, quickDial } = useEmergencyContacts();
  const { sendCrisisSMS, sending } = useCrisisSMS();
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    relationship: ''
  });
  
  // Test SMS state
  const [testingContact, setTestingContact] = useState<string | null>(null);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone_number) {
      toast.error('Please fill in required fields');
      return;
    }
    
    // Format phone number
    let phone = formData.phone_number.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = `+1${phone}`;
    } else if (!phone.startsWith('+')) {
      phone = `+${phone}`;
    }
    
    try {
      if (editingContact) {
        await updateContact(editingContact, {
          ...formData,
          phone_number: phone
        });
        setEditingContact(null);
      } else {
        await addContact({
          ...formData,
          phone_number: phone,
          priority_order: contacts.length + 1
        });
      }
      
      // Reset form
      setFormData({ name: '', phone_number: '', relationship: '' });
      setShowAddForm(false);
      
    } catch (error) {
      console.error('Failed to save contact:', error);
    }
  };
  
  // Send test SMS
  const sendTestSMS = async (contactId: string) => {
    setTestingContact(contactId);
    const contact = contacts.find(c => c.id === contactId);
    
    try {
      await sendCrisisSMS({
        contactIds: [contactId],
        customMessage: `Hi ${contact?.name}, this is a test message from ${contact?.relationship ? `your ${contact.relationship}` : 'Serenity Recovery'}. Testing emergency contact system. Reply STOP to unsubscribe.`,
        includeLocation: false
      });
      
      toast.success('Test SMS sent!', {
        description: `Check ${contact?.name}'s phone for the message`
      });
    } catch (error) {
      console.error('Test SMS failed:', error);
    } finally {
      setTestingContact(null);
    }
  };
  
  // Edit contact
  const startEdit = (contact: any) => {
    setEditingContact(contact.id);
    setFormData({
      name: contact.name,
      phone_number: contact.phone_number,
      relationship: contact.relationship || ''
    });
    setShowAddForm(true);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="w-6 h-6" />
            Your Support Network
          </CardTitle>
          <CardDescription className="text-gray-400">
            These people will be notified when you press the "I NEED HELP NOW" button
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Emergency contacts list */}
          {contacts.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
              <p className="text-gray-400">No emergency contacts added yet</p>
              <p className="text-sm text-gray-500">Add your sponsor, therapist, or trusted friends</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="bg-gray-900 rounded-lg p-4 flex items-center justify-between group hover:bg-gray-850 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{contact.name}</span>
                        {contact.relationship && (
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                            {contact.relationship}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">{contact.phone_number}</div>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {/* Quick dial */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => quickDial(contact)}
                      className="text-green-400 hover:text-green-300 hover:bg-gray-800"
                      title="Call now"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    
                    {/* Test SMS */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendTestSMS(contact.id)}
                      disabled={testingContact === contact.id || sending}
                      className="text-blue-400 hover:text-blue-300 hover:bg-gray-800"
                      title="Send test SMS"
                    >
                      {testingContact === contact.id ? (
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </Button>
                    
                    {/* Edit */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(contact)}
                      className="text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                      title="Edit contact"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    
                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remove ${contact.name} from emergency contacts?`)) {
                          deleteContact(contact.id);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-gray-800"
                      title="Remove contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Add contact button */}
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Emergency Contact
          </Button>
        </CardContent>
      </Card>
      
      {/* Important info */}
      <Card className="bg-blue-900/20 border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400 text-lg">
            <Heart className="w-5 h-5" />
            How This Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-300">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            <span>When you press "I NEED HELP NOW", all contacts get an SMS alert</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            <span>You can optionally include your location for safety</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            <span>Test each contact to ensure they receive messages</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
            <span>Add multiple contacts for a stronger support network</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Add/Edit Contact Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This person will be notified during crisis situations
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone" className="text-gray-300">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
            </div>
            
            <div>
              <Label htmlFor="relationship" className="text-gray-300">Relationship</Label>
              <Input
                id="relationship"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="Sponsor, Therapist, Friend, etc."
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingContact(null);
                  setFormData({ name: '', phone_number: '', relationship: '' });
                }}
                className="bg-gray-800 hover:bg-gray-700 border-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : editingContact ? 'Update' : 'Add Contact'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmergencyContactsManager;
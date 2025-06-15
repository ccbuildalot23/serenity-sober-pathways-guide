
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { User, Phone, Mail, UserPlus } from 'lucide-react';

interface AddContactFormProps {
  onSubmit: (contact: {
    name: string;
    relationship: string;
    phone?: string;
    email?: string;
    contact_method?: 'sms' | 'push' | 'both';
    share_location?: boolean;
  }) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
}

const AddContactForm: React.FC<AddContactFormProps> = ({ onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    contact_method: 'both' as const,
    share_location: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const success = await onSubmit({
      name: formData.name,
      relationship: formData.relationship || 'Support Person',
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      contact_method: formData.contact_method,
      share_location: formData.share_location
    });

    if (success) {
      setFormData({
        name: '',
        relationship: '',
        phone: '',
        email: '',
        contact_method: 'both',
        share_location: false
      });
      onCancel();
    }
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" />
          Add Support Contact
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Contact name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                placeholder="e.g., Sponsor, Family, Friend"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contact_method">Preferred Contact Method</Label>
            <Select 
              value={formData.contact_method}
              onValueChange={(value: 'sms' | 'push' | 'both') => 
                setFormData({ ...formData, contact_method: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS Only</SelectItem>
                <SelectItem value="push">Push Notification Only</SelectItem>
                <SelectItem value="both">Both SMS & Push</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="share_location"
              checked={formData.share_location}
              onCheckedChange={(checked) => setFormData({ ...formData, share_location: checked })}
            />
            <Label htmlFor="share_location">Share location with this contact</Label>
          </div>

          <div className="flex gap-2">
            <Button 
              type="submit" 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? 'Adding...' : 'Add Contact'}
            </Button>
            <Button 
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddContactForm;

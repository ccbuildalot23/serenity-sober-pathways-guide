import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

interface AddContactFormProps {
  onSubmit: (contact: any) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
}

const AddContactForm: React.FC<AddContactFormProps> = ({ onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    contact_method: 'both',
    share_location: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Add Support Contact
          <Button onClick={onCancel} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="relationship">Relationship *</Label>
            <Input
              id="relationship"
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              placeholder="e.g., Friend, Family, Sponsor"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="contact_method">Preferred Contact Method</Label>
            <Select
              value={formData.contact_method}
              onValueChange={(value) => setFormData({ ...formData, contact_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push Notification</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="share_location"
              checked={formData.share_location}
              onChange={(e) => setFormData({ ...formData, share_location: e.target.checked })}
            />
            <Label htmlFor="share_location">Share location in emergencies</Label>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Contact'}
            </Button>
            <Button type="button" onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddContactForm;

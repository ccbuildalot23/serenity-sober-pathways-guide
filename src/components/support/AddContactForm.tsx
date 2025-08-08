import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

interface AddContactFormProps {
  onSubmit: (contact: unknown) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
}

const AddContactForm: React.FC<AddContactFormProps> = ({ onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    _name: '',
    _relationship: '',
    _phone: '',
    _email: '',
    _contact_method: 'both',
    _share_location: false
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
            <Label htmlFor="_name">Name *</Label>
            <Input
              id="_name"
              value={formData._name}
              onChange={(e) => setFormData({ ...formData, _name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="_relationship">Relationship *</Label>
            <Input
              id="_relationship"
              value={formData._relationship}
              onChange={(e) => setFormData({ ...formData, _relationship: e.target.value })}
              placeholder="e.g., Friend, Family, Sponsor"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="_phone">Phone Number</Label>
            <Input
              id="_phone"
              type="tel"
              value={formData._phone}
              onChange={(e) => setFormData({ ...formData, _phone: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="_email">Email</Label>
            <Input
              id="_email"
              type="_email"
              value={formData._email}
              onChange={(e) => setFormData({ ...formData, _email: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="_contact_method">Preferred Contact Method</Label>
            <Select
              value={formData._contact_method}
              onValueChange={(value) => setFormData({ ...formData, _contact_method: value })}
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
              id="_share_location"
              checked={formData._share_location}
              onChange={(e) => setFormData({ ...formData, _share_location: e.target.checked })}
            />
            <Label htmlFor="_share_location">Share location in emergencies</Label>
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

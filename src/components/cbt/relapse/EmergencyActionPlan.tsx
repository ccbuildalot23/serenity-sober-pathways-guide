import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Contact {
  name: string;
  phone: string;
}

const EmergencyActionPlan: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState<Contact>({ name: '', phone: '' });

  const addContact = () => {
    if (!newContact.name || !newContact.phone) return;
    setContacts([...contacts, newContact]);
    setNewContact({ name: '', phone: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency Action Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Contact name"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
          />
          <Input
            placeholder="Phone"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
          />
          <Button onClick={addContact}>Add</Button>
        </div>
        {contacts.map((c, idx) => (
          <div key={idx} className="flex justify-between border p-2 rounded">
            <span>{c.name}</span>
            <span>{c.phone}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default EmergencyActionPlan;

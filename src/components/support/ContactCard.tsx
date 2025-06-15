import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare, Trash2, User } from 'lucide-react';

interface ContactCardProps {
  contact: any;
  onCall: (contact: any) => void;
  onMessage: (contact: any) => void;
  onDelete: (id: string) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onCall, onMessage, onDelete }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold">{contact.name}</h4>
              <p className="text-sm text-gray-600">{contact.relationship}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contact.phone && (
              <Button
                onClick={() => onCall(contact)}
                size="sm"
                variant="outline"
              >
                <Phone className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={() => onMessage(contact)}
              size="sm"
              variant="outline"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onDelete(contact.id)}
              size="sm"
              variant="ghost"
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactCard;

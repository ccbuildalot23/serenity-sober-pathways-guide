
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, MessageCircle, Trash2 } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  contact_method?: 'sms' | 'push' | 'both';
  share_location?: boolean;
}

interface ContactCardProps {
  contact: Contact;
  onCall: (contact: Contact) => void;
  onMessage: (contact: Contact) => void;
  onDelete: (id: string) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onCall, onMessage, onDelete }) => {
  return (
    <Card className="hover-lift animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">{contact.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{contact.relationship}</p>
              <div className="flex items-center space-x-2 mt-1">
                {contact.phone && (
                  <Badge variant="outline" className="text-xs">
                    <Phone className="w-3 h-3 mr-1" />
                    Phone
                  </Badge>
                )}
                {contact.email && (
                  <Badge variant="outline" className="text-xs">
                    <Mail className="w-3 h-3 mr-1" />
                    Email
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {contact.phone && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCall(contact)}
                className="p-2 hover:scale-105 transition-transform"
                title="Call"
              >
                <Phone className="w-4 h-4" />
              </Button>
            )}
            {(contact.phone || contact.email) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMessage(contact)}
                className="p-2 hover:scale-105 transition-transform"
                title="Send Message"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(contact.id)}
              className="p-2 text-red-600 hover:text-red-700 hover:scale-105 transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {contact.share_location && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              📍 Location sharing enabled
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactCard;


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getPhoneEmergencyContacts, hasPhoneContactsAccess } from '@/services/phoneContactsService';
import {
  subscribeToEmergencyContactUpdates,
  unsubscribeFromChannel
} from '@/services/enhancedRealtimeService';
import { toast } from 'sonner';

const CrisisProtocolSetup: React.FC = () => {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState({
    autoNotifyOnPanic: true,
    shareLocationInCrisis: true,
    allowRemoteCheckIns: true,
    crisisCodeWord: ''
  });

  const importPhoneContacts = async () => {
    if (!hasPhoneContactsAccess()) {
      toast.error("Phone contacts access not available");
      return;
    }

    try {
      const phoneContacts = await getPhoneEmergencyContacts();
      
      for (const contact of phoneContacts) {
        await supabase.from('emergency_contacts').insert({
          user_id: user?.id,
          name: contact.name,
          phone_number: contact.phone,
          relationship: contact.relationship,
          priority_order: contact.isEmergencyContact ? 1 : 2
        });
      }
      
      toast.success(`Imported ${phoneContacts.length} emergency contacts`);
    } catch (error) {
      console.error('Error importing phone contacts:', error);
      toast.error("Failed to import phone contacts");
    }
  };

  // Real-time emergency contact sync
  useEffect(() => {
    if (!user?.id) return;

    const channel = subscribeToEmergencyContactUpdates(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        toast.info("New emergency contact added to your network");
      }
    });
    
    return () => unsubscribeFromChannel(channel);
  }, [user?.id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crisis Protocols</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="crisis-code">Crisis Code Word</Label>
          <Input
            id="crisis-code"
            placeholder="A word that signals you need immediate help"
            value={protocols.crisisCodeWord}
            onChange={(e) => setProtocols({...protocols, crisisCodeWord: e.target.value})}
          />
          <p className="text-sm text-gray-500">
            Text this word to any support contact to trigger emergency protocol
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-notify">Auto-notify on panic button</Label>
            <p className="text-sm text-gray-500">Alert all primary contacts immediately</p>
          </div>
          <Switch
            id="auto-notify"
            checked={protocols.autoNotifyOnPanic}
            onCheckedChange={(checked) => 
              setProtocols({...protocols, autoNotifyOnPanic: checked})
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="share-location">Share location in crisis</Label>
            <p className="text-sm text-gray-500">Send your location to emergency contacts</p>
          </div>
          <Switch
            id="share-location"
            checked={protocols.shareLocationInCrisis}
            onCheckedChange={(checked) => 
              setProtocols({...protocols, shareLocationInCrisis: checked})
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="remote-checkins">Allow remote check-ins</Label>
            <p className="text-sm text-gray-500">Let contacts check on your status</p>
          </div>
          <Switch
            id="remote-checkins"
            checked={protocols.allowRemoteCheckIns}
            onCheckedChange={(checked) => 
              setProtocols({...protocols, allowRemoteCheckIns: checked})
            }
          />
        </div>
        
        <Button onClick={importPhoneContacts} variant="outline" className="w-full">
          <Smartphone className="mr-2 h-4 w-4" />
          Import Phone Emergency Contacts
        </Button>
      </CardContent>
    </Card>
  );
};

export default CrisisProtocolSetup;

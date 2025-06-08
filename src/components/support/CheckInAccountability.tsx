
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sendMockSMS } from '@/services/mockSmsService';
import { toast } from 'sonner';

interface SupportContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

const CheckInAccountability: React.FC = () => {
  const { user } = useAuth();
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [buddy, setBuddy] = useState<SupportContact | null>(null);
  const [lastBuddyCheckIn, setLastBuddyCheckIn] = useState<Date | null>(null);
  const [todaysMood, setTodaysMood] = useState<number>(5);

  useEffect(() => {
    loadSupportContacts();
    loadTodaysMood();
  }, [user]);

  const loadSupportContacts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('support_contacts')
        .select('id, name, relationship, phone')
        .eq('user_id', user.id)
        .not('phone', 'is', null);

      if (error) {
        console.error('Error loading support contacts:', error);
        return;
      }

      setSupportContacts(data || []);
    } catch (error) {
      console.error('Error in loadSupportContacts:', error);
    }
  };

  const loadTodaysMood = async () => {
    if (!user?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('mood_rating')
        .eq('user_id', user.id)
        .eq('checkin_date', today)
        .single();

      if (error) {
        console.log('No mood rating for today yet');
        return;
      }

      if (data?.mood_rating) {
        setTodaysMood(data.mood_rating);
      }
    } catch (error) {
      console.error('Error loading today\'s mood:', error);
    }
  };

  const handleBuddySelect = (contactId: string) => {
    const selectedContact = supportContacts.find(contact => contact.id === contactId);
    setBuddy(selectedContact || null);
  };

  const sendCheckInToBuddy = async () => {
    if (!buddy) return;

    try {
      const message = `Hey, just checking in! My mood today is ${todaysMood}/10. How are you?`;
      
      await sendMockSMS(
        {
          id: buddy.id,
          name: buddy.name,
          phone: buddy.phone,
          relationship: buddy.relationship
        },
        message
      );

      setLastBuddyCheckIn(new Date());
      toast.success("Check-in sent to buddy!");
    } catch (error) {
      console.error('Error sending check-in:', error);
      toast.error("Failed to send check-in");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check-In Buddy System</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Select value={buddy?.id || ''} onValueChange={handleBuddySelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select accountability buddy" />
            </SelectTrigger>
            <SelectContent>
              {supportContacts.map(contact => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.name} ({contact.relationship})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {buddy && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {buddy.name} will be notified if you miss 2 check-ins
            </p>
            
            {lastBuddyCheckIn && (
              <p className="text-xs text-gray-500">
                Last check-in: {lastBuddyCheckIn.toLocaleDateString()}
              </p>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={sendCheckInToBuddy}
              className="w-full"
            >
              Send Check-In to Buddy
            </Button>
          </div>
        )}
        
        {supportContacts.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Add support contacts with phone numbers to use the buddy system
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckInAccountability;

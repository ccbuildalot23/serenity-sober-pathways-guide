import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const contactService = {
  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      // For web app, create SMS link
      const smsLink = `sms:${phone}?body=${encodeURIComponent(message)}`;
      window.location.href = smsLink;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('support_interactions').insert({
          user_id: user.id,
          contact_phone: phone,
          interaction_type: 'sms',
          message: message
        });
      }
      
      return true;
    } catch (error) {
      console.error('SMS error:', error);
      toast.error('Failed to send SMS');
      return false;
    }
  },

  async makeCall(phone: string): Promise<boolean> {
    try {
      const telLink = `tel:${phone}`;
      window.location.href = telLink;
      
      // Log the action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('support_interactions').insert({
          user_id: user.id,
          contact_phone: phone,
          interaction_type: 'call'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Call error:', error);
      toast.error('Failed to make call');
      return false;
    }
  },

  async sendAlert(contactId: string, message: string, urgency: 'high' | 'medium' | 'low'): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create alert record
      const { data: alert, error } = await supabase
        .from('support_alerts')
        .insert({
          user_id: user.id,
          contact_id: contactId,
          message: message,
          urgency: urgency,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // In production, this would trigger push notifications or SMS via a service like Twilio
      toast.success('Alert sent successfully');
      return true;
    } catch (error) {
      console.error('Alert error:', error);
      toast.error('Failed to send alert');
      return false;
    }
  }
};

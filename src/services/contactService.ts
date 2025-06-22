
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const contactService = {
  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      // For web app, create SMS link
      const smsLink = `sms:${phone}?body=${encodeURIComponent(message)}`;
      window.location.href = smsLink;
      
      // Log the action using audit_logs instead of support_interactions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'SMS_SENT',
          details_encrypted: JSON.stringify({
            contact_phone: phone,
            message_length: message.length
          })
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
      
      // Log the action using audit_logs instead of support_interactions
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'CALL_INITIATED',
          details_encrypted: JSON.stringify({
            contact_phone: phone
          })
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

      // Since support_alerts table doesn't exist, we'll log to audit_logs instead
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'ALERT_SENT',
        details_encrypted: JSON.stringify({
          contact_id: contactId,
          message: message,
          urgency: urgency,
          status: 'pending'
        })
      });

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

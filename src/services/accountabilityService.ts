import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';

export interface AccountabilityPartnership {
  id: string;
  requester_id: string;
  partner_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'inactive';
  created_at: string;
  accepted_at?: string;
  partnership_agreement: any;
  check_in_schedule: any;
  privacy_settings: {
    share_mood: boolean;
    share_progress: boolean;
    share_goals: boolean;
    share_streaks: boolean;
    notification_level: 'minimal' | 'summary' | 'detailed';
  };
}

export interface PartnershipCheckIn {
  id: string;
  partnership_id: string;
  user_id: string;
  checkin_date: string;
  shared_summary: any;
  acknowledged_by_partner: boolean;
}

export interface SupportAgreementTemplate {
  id: string;
  title: string;
  description: string;
  template_content: any;
  is_default: boolean;
}

export class AccountabilityService {
  // Get user's partnerships
  static async getUserPartnerships(userId: string): Promise<AccountabilityPartnership[]> {
    const { data, error } = await supabase
      .from('accountability_partnerships')
      .select('*')
      .or(`requester_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as AccountabilityPartnership[];
  }

  // Request new partnership
  static async requestPartnership(
    partnerId: string, 
    agreementTemplate: any,
    checkInSchedule: any,
    privacySettings: any
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Encrypt the agreement for privacy
    const encryptedAgreement = await serverSideEncryption.encrypt(JSON.stringify(agreementTemplate));

    const { error } = await supabase
      .from('accountability_partnerships')
      .insert({
        requester_id: user.id,
        partner_id: partnerId,
        partnership_agreement: agreementTemplate,
        encrypted_agreement_hash: encryptedAgreement,
        check_in_schedule: checkInSchedule,
        privacy_settings: privacySettings
      });

    if (error) throw error;

    // Send notification to potential partner
    await this.sendNotification(
      partnerId,
      user.id,
      'partnership_request',
      'You have a new accountability partnership request'
    );
  }

  // Accept partnership request
  static async acceptPartnership(partnershipId: string): Promise<void> {
    const { error } = await supabase
      .from('accountability_partnerships')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', partnershipId);

    if (error) throw error;
  }

  // Submit encrypted check-in
  static async submitCheckIn(
    partnershipId: string,
    sensitiveData: any,
    publicSummary: any
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Encrypt sensitive data
    const encryptedData = await serverSideEncryption.encrypt(JSON.stringify(sensitiveData));

    const { error } = await supabase
      .from('partnership_checkins')
      .insert({
        partnership_id: partnershipId,
        user_id: user.id,
        checkin_date: new Date().toISOString().split('T')[0],
        encrypted_data: encryptedData,
        shared_summary: publicSummary
      });

    if (error) throw error;

    // Get partnership details to notify partner
    const { data: partnership } = await supabase
      .from('accountability_partnerships')
      .select('requester_id, partner_id, privacy_settings')
      .eq('id', partnershipId)
      .single();

    if (partnership) {
      const partnerId = partnership.requester_id === user.id 
        ? partnership.partner_id 
        : partnership.requester_id;

      // Send privacy-respecting notification
      const message = this.createPrivacyRespectingMessage(
        'checkin_completed',
        partnership.privacy_settings,
        publicSummary
      );

      await this.sendNotification(partnerId, user.id, 'checkin_completed', message);
    }
  }

  // Get partner's check-ins (only shared summary)
  static async getPartnerCheckIns(partnershipId: string): Promise<PartnershipCheckIn[]> {
    const { data, error } = await supabase
      .from('partnership_checkins')
      .select('id, partnership_id, user_id, checkin_date, shared_summary, acknowledged_by_partner')
      .eq('partnership_id', partnershipId)
      .order('checkin_date', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data || [];
  }

  // Get support agreement templates
  static async getSupportAgreementTemplates(): Promise<SupportAgreementTemplate[]> {
    const { data, error } = await supabase
      .from('support_agreement_templates')
      .select('*')
      .eq('is_default', true)
      .order('title');

    if (error) throw error;
    return data || [];
  }

  // Get user's own encrypted check-in data
  static async getUserCheckInData(partnershipId: string, date: string): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('partnership_checkins')
      .select('encrypted_data')
      .eq('partnership_id', partnershipId)
      .eq('user_id', user.id)
      .eq('checkin_date', date)
      .single();

    if (error) throw error;
    if (!data?.encrypted_data) return null;

    // Decrypt the user's own data
    const decryptedData = await serverSideEncryption.decrypt(data.encrypted_data);
    return JSON.parse(decryptedData);
  }

  // Send privacy-respecting notification
  private static async sendNotification(
    recipientId: string,
    senderId: string,
    type: string,
    message: string
  ): Promise<void> {
    // First check if there's an active partnership
    const { data: partnership } = await supabase
      .from('accountability_partnerships')
      .select('id')
      .or(`requester_id.eq.${recipientId},partner_id.eq.${recipientId}`)
      .or(`requester_id.eq.${senderId},partner_id.eq.${senderId}`)
      .eq('status', 'accepted')
      .single();

    const { error } = await supabase
      .from('partnership_notifications')
      .insert({
        partnership_id: partnership?.id,
        recipient_id: recipientId,
        sender_id: senderId,
        notification_type: type,
        message: message
      });

    if (error) console.error('Failed to send notification:', error);
  }

  // Create privacy-respecting messages
  private static createPrivacyRespectingMessage(
    type: string,
    privacySettings: any,
    data: any
  ): string {
    switch (type) {
      case 'checkin_completed':
        if (privacySettings.notification_level === 'minimal') {
          return 'Your accountability partner completed their check-in';
        } else if (privacySettings.notification_level === 'summary') {
          const mood = privacySettings.share_mood && data.mood_level 
            ? ` and is feeling ${data.mood_level}` 
            : '';
          return `Your accountability partner completed their check-in${mood}`;
        } else {
          // Detailed level - still respect individual privacy settings
          let message = 'Your accountability partner completed their check-in';
          if (privacySettings.share_mood && data.mood_level) {
            message += ` and is feeling ${data.mood_level}`;
          }
          if (privacySettings.share_progress && data.progress_summary) {
            message += `. ${data.progress_summary}`;
          }
          return message;
        }
      
      case 'streak_milestone':
        return privacySettings.share_streaks 
          ? `Your accountability partner reached a ${data.milestone}-day streak!`
          : 'Your accountability partner reached a milestone!';
      
      default:
        return 'You have a new update from your accountability partner';
    }
  }

  // Get unread notifications
  static async getUnreadNotifications(userId: string) {
    const { data, error } = await supabase
      .from('partnership_notifications')
      .select('*')
      .eq('recipient_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Mark notification as read
  static async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('partnership_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  // Calculate partnership streak
  static async calculatePartnershipStreak(partnershipId: string, userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('partnership_checkins')
      .select('checkin_date')
      .eq('partnership_id', partnershipId)
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < data.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      const checkInDate = new Date(data[i].checkin_date);
      
      if (checkInDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
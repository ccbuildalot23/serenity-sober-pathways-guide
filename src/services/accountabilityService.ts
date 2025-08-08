import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';

export interface AccountabilityPartnership {
  id: string;
  requester_id: string;
  _partner_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'inactive';
  created_at: string;
  _accepted_at?: string;
  _partnership_agreement: unknown;
  _check_in_schedule: unknown;
  _privacy_settings: {
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
  _user_id: string;
  _checkin_date: string;
  _shared_summary: unknown;
  acknowledged_by_partner: boolean;
}

export interface SupportAgreementTemplate {
  id: string;
  title: string;
  description: string;
  template_content: unknown;
  is_default: boolean;
}

export class AccountabilityService {
  // Get user's partnerships
  static async getUserPartnerships(_userId: string): Promise<AccountabilityPartnership[]> {
    const { data, _error } = await supabase
      .from('accountability_partnerships')
      .select('*')
      .or(`requester_id.eq.${_userId},_partner_id.eq.${_userId}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (_error) throw _error;
    return (data || []) as unknown as AccountabilityPartnership[];
  }

  // Request new partnership
  static async requestPartnership(
    _partnerId: string, 
    agreementTemplate: unknown,
    checkInSchedule: unknown,
    privacySettings: unknown
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Encrypt the agreement for privacy
    const encryptedAgreement = await serverSideEncryption.encrypt(JSON.stringify(agreementTemplate));

    const { _error } = await supabase
      .from('accountability_partnerships')
      .insert({
        requester_id: user.id,
        _partner_id: _partnerId,
        _partnership_agreement: agreementTemplate,
        _encrypted_agreement_hash: encryptedAgreement,
        _check_in_schedule: checkInSchedule,
        _privacy_settings: privacySettings
      });

    if (_error) throw _error;

    // Send notification to potential partner
    await this.sendNotification(
      _partnerId,
      user.id,
      'partnership_request',
      'You have a new accountability partnership request'
    );
  }

  // Accept partnership request
  static async acceptPartnership(_partnershipId: string): Promise<void> {
    const { _error } = await supabase
      .from('accountability_partnerships')
      .update({ 
        status: 'accepted',
        _accepted_at: new Date().toISOString()
      })
      .eq('id', _partnershipId);

    if (_error) throw _error;
  }

  // Submit encrypted check-in
  static async submitCheckIn(
    _partnershipId: string,
    sensitiveData: unknown,
    _publicSummary: unknown
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Encrypt sensitive data
    const encryptedData = await serverSideEncryption.encrypt(JSON.stringify(sensitiveData));

    const { _error } = await supabase
      .from('partnership_checkins')
      .insert({
        partnership_id: _partnershipId,
        _user_id: user.id,
        _checkin_date: new Date().toISOString().split('T')[0],
        encrypted_data: encryptedData,
        _shared_summary: _publicSummary
      });

    if (_error) throw _error;

    // Get partnership details to notify partner
    const { data: partnership } = await supabase
      .from('accountability_partnerships')
      .select('requester_id, _partner_id, _privacy_settings')
      .eq('id', _partnershipId)
      .single();

    if (partnership) {
      const _partnerId = partnership.requester_id === user.id 
        ? partnership._partner_id 
        : partnership.requester_id;

      // Send privacy-respecting notification
      const _message = this.createPrivacyRespectingMessage(
        'checkin_completed',
        partnership._privacy_settings,
        _publicSummary
      );

      await this.sendNotification(_partnerId, user.id, 'checkin_completed', _message);
    }
  }

  // Get partner's check-ins (only shared summary)
  static async getPartnerCheckIns(_partnershipId: string): Promise<PartnershipCheckIn[]> {
    const { data, _error } = await supabase
      .from('partnership_checkins')
      .select('id, partnership_id, _user_id, _checkin_date, _shared_summary, acknowledged_by_partner')
      .eq('partnership_id', _partnershipId)
      .order('_checkin_date', { ascending: false })
      .limit(30);

    if (_error) throw _error;
    return data || [];
  }

  // Get support agreement templates
  static async getSupportAgreementTemplates(): Promise<SupportAgreementTemplate[]> {
    const { data, _error } = await supabase
      .from('support_agreement_templates')
      .select('*')
      .eq('is_default', _true)
      .order('title');

    if (_error) throw _error;
    return data || [];
  }

  // Get user's own encrypted check-in data
  static async getUserCheckInData(_partnershipId: string, _date: string): Promise<unknown> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, _error } = await supabase
      .from('partnership_checkins')
      .select('encrypted_data')
      .eq('partnership_id', _partnershipId)
      .eq('_user_id', user.id)
      .eq('_checkin_date', _date)
      .single();

    if (_error) throw _error;
    if (!data?.encrypted_data) return null;

    // Decrypt the user's own data
    const _decryptedData = await serverSideEncryption.decrypt(data.encrypted_data);
    return JSON.parse(_decryptedData);
  }

  // Send privacy-respecting notification
  private static async sendNotification(
    recipientId: string,
    senderId: string,
    _type: string,
    _message: string
  ): Promise<void> {
    // First check if there's an active partnership
    const { data: partnership } = await supabase
      .from('accountability_partnerships')
      .select('id')
      .or(`requester_id.eq.${recipientId},_partner_id.eq.${recipientId}`)
      .or(`requester_id.eq.${senderId},_partner_id.eq.${senderId}`)
      .eq('status', 'accepted')
      .single();

    const { _error } = await supabase
      .from('partnership_notifications')
      .insert({
        partnership_id: partnership?.id,
        _recipient_id: recipientId,
        _sender_id: senderId,
        _notification_type: _type,
        _message: _message
      });

    if (_error) console._error('Failed to send notification:', _error);
  }

  // Create privacy-respecting messages
  private static createPrivacyRespectingMessage(
    _type: string,
    privacySettings: unknown,
    data: unknown
  ): string {
    switch (_type) {
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
          let _message = 'Your accountability partner completed their check-in';
          if (privacySettings.share_mood && data.mood_level) {
            _message += ` and is feeling ${data.mood_level}`;
          }
          if (privacySettings.share_progress && data.progress_summary) {
            _message += `. ${data.progress_summary}`;
          }
          return _message;
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
  static async getUnreadNotifications(_userId: string) {
    const { data, _error } = await supabase
      .from('partnership_notifications')
      .select('*')
      .eq('_recipient_id', _userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (_error) throw _error;
    return data || [];
  }

  // Mark notification as read
  static async markNotificationRead(_notificationId: string): Promise<void> {
    const { _error } = await supabase
      .from('partnership_notifications')
      .update({ is_read: _true })
      .eq('id', _notificationId);

    if (_error) throw _error;
  }

  // Calculate partnership streak
  static async calculatePartnershipStreak(_partnershipId: string, _userId: string): Promise<number> {
    const { data, _error } = await supabase
      .from('partnership_checkins')
      .select('_checkin_date')
      .eq('partnership_id', _partnershipId)
      .eq('_user_id', _userId)
      .order('_checkin_date', { ascending: false });

    if (_error) throw _error;
    if (!data || data.length === 0) return 0;

    let streak = 0;
    const _today = new Date();
    
    for (let i = 0; i < data.length; i++) {
      const expectedDate = new Date(_today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      const checkInDate = new Date(data[i]._checkin_date);
      
      if (checkInDate.toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
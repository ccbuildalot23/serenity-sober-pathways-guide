import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';

export interface NotificationData {
  user_id: string;
  _supporter_id?: string;
  _notification_type: 'crisis_alert' | 'check_in_missed' | 'milestone_reached' | 'relapse_risk' | 'support_request';
  _title: string;
  _message: string;
  severity: 'low' | 'medium' | 'high' | 'crisis';
  action_required: boolean;
  metadata?: {
    trigger_source?: string;
    feature_name?: string;
    detected_keywords?: string[];
    assessment_scores?: Record<string, number>;
    session_id?: string;
    milestone_type?: string;
    risk_factors?: string[];
  };
}

export interface SupportNetworkMember {
  _supporter_id: string;
  _supporter_name: string;
  _relationship_type: 'family' | 'friend' | 'sponsor' | 'counselor' | 'peer' | 'other';
  _contact_method: 'sms' | 'email' | 'app' | 'phone';
  _notification_preferences: {
    crisis_alerts: boolean;
    check_in_reminders: boolean;
    milestone_celebrations: boolean;
    risk_warnings: boolean;
  };
  priority_level: 'primary' | 'secondary' | 'emergency_only';
}

class SupportNetworkNotificationService {
  // Get user's active support network
  async getSupportNetwork(_userId: string): Promise<SupportNetworkMember[]> {
    try {
      const { data, _error } = await supabase
        .from('support_network')
        .select(`
          _supporter_id,
          _supporter_name,
          _relationship_type,
          _contact_method,
          _notification_preferences,
          priority_level
        `)
        .eq('user_id', _userId)
        .eq('status', 'active');

      if (_error) throw _error;
      return data || [];
    } catch (_error) {
      console._error('Error fetching support network:', _error);
      return [];
    }
  }

  // Send notifications to appropriate support network members
  async notifySupportNetwork(
    _userId: string,
    notification: NotificationData,
    _targetMembers?: 'all' | 'primary' | 'emergency'
  ): Promise<void> {
    try {
      const _supportNetwork = await this.getSupportNetwork(_userId);
      
      if (_supportNetwork.length === 0) {
        logger.debug('No support network found for user:', _userId, { component: 'supportNetworkNotificationService' });
        return;
      }

      // Filter members based on target and preferences
      const _filteredMembers = this.filterMembersByNotificationType(
        _supportNetwork, 
        notification,
        _targetMembers
      );

      if (_filteredMembers.length === 0) {
        logger.debug('No eligible support members for this notification type', { component: 'supportNetworkNotificationService' });
        return;
      }

      // Create notifications for each member
      const notifications = _filteredMembers.map(member => ({
        user_id: _userId,
        _supporter_id: member._supporter_id,
        _notification_type: notification._notification_type,
        _title: notification._title,
        _message: this.personalizeMessage(notification._message, member),
        severity: notification.severity,
        action_required: notification.action_required,
        metadata: {
          ...notification.metadata,
          _contact_method: member._contact_method,
          _relationship_type: member._relationship_type
        },
        created_at: new Date().toISOString()
      }));

      // Insert notifications into database
      const { _error } = await supabase
        .from('support_network_notifications')
        .insert(notifications);

      if (_error) throw _error;

      // Send immediate alerts for crisis situations
      if (notification.severity === 'crisis') {
        await this.sendImmediateAlerts(_filteredMembers, notification);
      }

      logger.debug(`Sent ${notifications.length} notifications to support network`, { component: 'supportNetworkNotificationService' });
    } catch (_error) {
      console._error('Error notifying support network:', _error);
    }
  }

  // Filter support members based on notification type and their preferences
  private filterMembersByNotificationType(
    members: SupportNetworkMember[],
    notification: NotificationData,
    _targetMembers?: 'all' | 'primary' | 'emergency'
  ): SupportNetworkMember[] {
    return members.filter(member => {
      // Priority filtering
      if (_targetMembers === 'emergency' && member.priority_level !== 'emergency_only') {
        return false;
      }
      if (_targetMembers === 'primary' && member.priority_level === 'secondary') {
        return false;
      }

      // Preference filtering
      const preferences = member._notification_preferences;
      switch (notification._notification_type) {
        case 'crisis_alert':
          return preferences.crisis_alerts;
        case 'check_in_missed':
          return preferences.check_in_reminders;
        case 'milestone_reached':
          return preferences.milestone_celebrations;
        case 'relapse_risk':
          return preferences.risk_warnings;
        default:
          return true;
      }
    });
  }

  // Personalize _message based on relationship type
  private personalizeMessage(_message: string, member: SupportNetworkMember): string {
    const relationshipContext = {
      'family': 'your family member',
      'friend': 'your friend',
      'sponsor': 'your sponsee',
      'counselor': 'your client',
      'peer': 'your recovery peer',
      'other': 'your support person'
    };

    return _message.replace(
      /your support person/g,
      relationshipContext[member._relationship_type] || 'your support person'
    );
  }

  // Send immediate alerts for crisis situations
  private async sendImmediateAlerts(
    members: SupportNetworkMember[],
    notification: NotificationData
  ): Promise<void> {
    // For crisis situations, we would integrate with SMS/email services
    // This is a placeholder for immediate notification logic
    const emergencyMembers = members.filter(m => 
      m.priority_level === 'emergency_only' || m.priority_level === 'primary'
    );

    for (const member of emergencyMembers) {
      if (member._contact_method === 'sms') {
        // SMS integration would go here
        logger.debug(`SMS alert sent to ${member._supporter_name}`, { component: 'supportNetworkNotificationService' });
      } else if (member._contact_method === 'email') {
        // Email integration would go here
        logger.debug(`Email alert sent to ${member._supporter_name}`, { component: 'supportNetworkNotificationService' });
      }
    }
  }

  // Feature-specific notification methods
  async notifyHALTCrisis(_userId: string, _scores: Record<string, number>): Promise<void> {
    const severeCount = Object.values(_scores).filter(score => score >= 8).length;
    const notification: NotificationData = {
      user_id: _userId,
      _notification_type: 'crisis_alert',
      _title: 'HALT Crisis Detected',
      _message: `Crisis indicators detected in HALT assessment. ${severeCount} severe warning signs identified. Immediate support may be needed.`,
      severity: severeCount >= 3 ? 'crisis' : 'high',
      action_required: true,
      metadata: {
        trigger_source: 'halt_assessment',
        feature_name: 'HALT Assessment',
        assessment_scores: _scores,
        risk_factors: Object.entries(_scores)
          .filter(([_, score]) => score >= 8)
          .map(([factor, _]) => factor)
      }
    };

    await this.notifySupportNetwork(_userId, notification, 'primary');
  }

  async notifyCravingIntervention(_userId: string, intensity: number, success: boolean): Promise<void> {
    if (intensity >= 8 || !success) {
      const notification: NotificationData = {
        user_id: _userId,
        _notification_type: 'relapse_risk',
        _title: success ? 'High-Intensity Craving Managed' : 'Craving Intervention Needed',
        _message: success 
          ? `Successfully managed a high-intensity craving (${intensity}/10). Showing resilience but may need extra support.`
          : `Failed to complete craving timer with ${intensity}/10 intensity. May need immediate support.`,
        severity: success ? 'medium' : 'high',
        action_required: !success,
        metadata: {
          trigger_source: 'craving_timer',
          feature_name: 'Craving Timer',
          assessment_scores: { craving_intensity: intensity, timer_completed: success ? 1 : 0 }
        }
      };

      await this.notifySupportNetwork(_userId, notification, success ? 'primary' : 'all');
    }
  }

  async notifyPlayingItForwardRisk(_userId: string, _exploredUsingPath: boolean): Promise<void> {
    if (_exploredUsingPath) {
      const notification: NotificationData = {
        user_id: _userId,
        _notification_type: 'relapse_risk',
        _title: 'Vulnerable Decision-Making Detected',
        _message: 'Explored potential relapse scenarios in decision-making tool. May be contemplating use and could benefit from support.',
        severity: 'high',
        action_required: true,
        metadata: {
          trigger_source: 'playing_forward',
          feature_name: 'Playing It Forward',
          risk_factors: ['contemplating_use', 'vulnerable_decision_making']
        }
      };

      await this.notifySupportNetwork(_userId, notification, 'primary');
    }
  }

  async notifyMilestoneReached(_userId: string, milestone: number, milestoneType: string): Promise<void> {
    const notification: NotificationData = {
      user_id: _userId,
      _notification_type: 'milestone_reached',
      _title: `Recovery Milestone: ${milestoneType}`,
      _message: `Congratulations! Reached ${milestone} ${milestoneType.toLowerCase()} of continuous recovery. This achievement deserves celebration and recognition.`,
      severity: 'low',
      action_required: false,
      metadata: {
        trigger_source: 'sobriety_tracker',
        feature_name: 'Sobriety Tracker',
        milestone_type: milestoneType
      }
    };

    await this.notifySupportNetwork(_userId, notification, 'all');
  }

  async notifyMissedCheckIn(_userId: string, daysMissed: number): Promise<void> {
    if (daysMissed >= 2) {
      const notification: NotificationData = {
        user_id: _userId,
        _notification_type: 'check_in_missed',
        _title: 'Check-In Pattern Concern',
        _message: `Missed daily check-ins for ${daysMissed} days. This could indicate difficulties or need for additional support.`,
        severity: daysMissed >= 5 ? 'high' : 'medium',
        action_required: daysMissed >= 5,
        metadata: {
          trigger_source: 'daily_checkin',
          feature_name: 'Daily Check-In',
          risk_factors: ['missed_checkins', 'pattern_change']
        }
      };

      await this.notifySupportNetwork(_userId, notification, 'primary');
    }
  }

  // Get recent notifications for a supporter
  async getNotificationsForSupporter(_supporterId: string): Promise<unknown[]> {
    try {
      const { data, _error } = await supabase
        .from('support_network_notifications')
        .select(`
          *,
          _profiles:user_id (
            full_name,
            _display_name
          )
        `)
        .eq('_supporter_id', _supporterId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (_error) throw _error;
      return data || [];
    } catch (_error) {
      console._error('Error fetching supporter notifications:', _error);
      return [];
    }
  }

  // Mark notification as acknowledged
  async acknowledgeNotification(_notificationId: string, _supporterId: string): Promise<void> {
    try {
      const { _error } = await supabase
        .from('support_network_notifications')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: _supporterId
        })
        .eq('id', _notificationId)
        .eq('_supporter_id', _supporterId);

      if (_error) throw _error;
    } catch (_error) {
      console._error('Error acknowledging notification:', _error);
    }
  }
}

export const supportNetworkNotificationService = new SupportNetworkNotificationService();
export default supportNetworkNotificationService;
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationData {
  user_id: string;
  supporter_id?: string;
  notification_type: 'crisis_alert' | 'check_in_missed' | 'milestone_reached' | 'relapse_risk' | 'support_request';
  title: string;
  message: string;
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
  supporter_id: string;
  supporter_name: string;
  relationship_type: 'family' | 'friend' | 'sponsor' | 'counselor' | 'peer' | 'other';
  contact_method: 'sms' | 'email' | 'app' | 'phone';
  notification_preferences: {
    crisis_alerts: boolean;
    check_in_reminders: boolean;
    milestone_celebrations: boolean;
    risk_warnings: boolean;
  };
  priority_level: 'primary' | 'secondary' | 'emergency_only';
}

class SupportNetworkNotificationService {
  // Get user's active support network
  async getSupportNetwork(userId: string): Promise<SupportNetworkMember[]> {
    try {
      const { data, error } = await supabase
        .from('support_network')
        .select(`
          supporter_id,
          supporter_name,
          relationship_type,
          contact_method,
          notification_preferences,
          priority_level
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching support network:', error);
      return [];
    }
  }

  // Send notifications to appropriate support network members
  async notifySupportNetwork(
    userId: string,
    notification: NotificationData,
    targetMembers?: 'all' | 'primary' | 'emergency'
  ): Promise<void> {
    try {
      const supportNetwork = await this.getSupportNetwork(userId);
      
      if (supportNetwork.length === 0) {
        console.log('No support network found for user:', userId);
        return;
      }

      // Filter members based on target and preferences
      const filteredMembers = this.filterMembersByNotificationType(
        supportNetwork, 
        notification,
        targetMembers
      );

      if (filteredMembers.length === 0) {
        console.log('No eligible support members for this notification type');
        return;
      }

      // Create notifications for each member
      const notifications = filteredMembers.map(member => ({
        user_id: userId,
        supporter_id: member.supporter_id,
        notification_type: notification.notification_type,
        title: notification.title,
        message: this.personalizeMessage(notification.message, member),
        severity: notification.severity,
        action_required: notification.action_required,
        metadata: {
          ...notification.metadata,
          contact_method: member.contact_method,
          relationship_type: member.relationship_type
        },
        created_at: new Date().toISOString()
      }));

      // Insert notifications into database
      const { error } = await supabase
        .from('support_network_notifications')
        .insert(notifications);

      if (error) throw error;

      // Send immediate alerts for crisis situations
      if (notification.severity === 'crisis') {
        await this.sendImmediateAlerts(filteredMembers, notification);
      }

      console.log(`Sent ${notifications.length} notifications to support network`);
    } catch (error) {
      console.error('Error notifying support network:', error);
    }
  }

  // Filter support members based on notification type and their preferences
  private filterMembersByNotificationType(
    members: SupportNetworkMember[],
    notification: NotificationData,
    targetMembers?: 'all' | 'primary' | 'emergency'
  ): SupportNetworkMember[] {
    return members.filter(member => {
      // Priority filtering
      if (targetMembers === 'emergency' && member.priority_level !== 'emergency_only') {
        return false;
      }
      if (targetMembers === 'primary' && member.priority_level === 'secondary') {
        return false;
      }

      // Preference filtering
      const preferences = member.notification_preferences;
      switch (notification.notification_type) {
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

  // Personalize message based on relationship type
  private personalizeMessage(message: string, member: SupportNetworkMember): string {
    const relationshipContext = {
      'family': 'your family member',
      'friend': 'your friend',
      'sponsor': 'your sponsee',
      'counselor': 'your client',
      'peer': 'your recovery peer',
      'other': 'your support person'
    };

    return message.replace(
      /your support person/g,
      relationshipContext[member.relationship_type] || 'your support person'
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
      if (member.contact_method === 'sms') {
        // SMS integration would go here
        console.log(`SMS alert sent to ${member.supporter_name}`);
      } else if (member.contact_method === 'email') {
        // Email integration would go here
        console.log(`Email alert sent to ${member.supporter_name}`);
      }
    }
  }

  // Feature-specific notification methods
  async notifyHALTCrisis(userId: string, scores: Record<string, number>): Promise<void> {
    const severeCount = Object.values(scores).filter(score => score >= 8).length;
    const notification: NotificationData = {
      user_id: userId,
      notification_type: 'crisis_alert',
      title: 'HALT Crisis Detected',
      message: `Crisis indicators detected in HALT assessment. ${severeCount} severe warning signs identified. Immediate support may be needed.`,
      severity: severeCount >= 3 ? 'crisis' : 'high',
      action_required: true,
      metadata: {
        trigger_source: 'halt_assessment',
        feature_name: 'HALT Assessment',
        assessment_scores: scores,
        risk_factors: Object.entries(scores)
          .filter(([_, score]) => score >= 8)
          .map(([factor, _]) => factor)
      }
    };

    await this.notifySupportNetwork(userId, notification, 'primary');
  }

  async notifyCravingIntervention(userId: string, intensity: number, success: boolean): Promise<void> {
    if (intensity >= 8 || !success) {
      const notification: NotificationData = {
        user_id: userId,
        notification_type: 'relapse_risk',
        title: success ? 'High-Intensity Craving Managed' : 'Craving Intervention Needed',
        message: success 
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

      await this.notifySupportNetwork(userId, notification, success ? 'primary' : 'all');
    }
  }

  async notifyPlayingItForwardRisk(userId: string, exploredUsingPath: boolean): Promise<void> {
    if (exploredUsingPath) {
      const notification: NotificationData = {
        user_id: userId,
        notification_type: 'relapse_risk',
        title: 'Vulnerable Decision-Making Detected',
        message: 'Explored potential relapse scenarios in decision-making tool. May be contemplating use and could benefit from support.',
        severity: 'high',
        action_required: true,
        metadata: {
          trigger_source: 'playing_forward',
          feature_name: 'Playing It Forward',
          risk_factors: ['contemplating_use', 'vulnerable_decision_making']
        }
      };

      await this.notifySupportNetwork(userId, notification, 'primary');
    }
  }

  async notifyMilestoneReached(userId: string, milestone: number, milestoneType: string): Promise<void> {
    const notification: NotificationData = {
      user_id: userId,
      notification_type: 'milestone_reached',
      title: `Recovery Milestone: ${milestoneType}`,
      message: `Congratulations! Reached ${milestone} ${milestoneType.toLowerCase()} of continuous recovery. This achievement deserves celebration and recognition.`,
      severity: 'low',
      action_required: false,
      metadata: {
        trigger_source: 'sobriety_tracker',
        feature_name: 'Sobriety Tracker',
        milestone_type: milestoneType
      }
    };

    await this.notifySupportNetwork(userId, notification, 'all');
  }

  async notifyMissedCheckIn(userId: string, daysMissed: number): Promise<void> {
    if (daysMissed >= 2) {
      const notification: NotificationData = {
        user_id: userId,
        notification_type: 'check_in_missed',
        title: 'Check-In Pattern Concern',
        message: `Missed daily check-ins for ${daysMissed} days. This could indicate difficulties or need for additional support.`,
        severity: daysMissed >= 5 ? 'high' : 'medium',
        action_required: daysMissed >= 5,
        metadata: {
          trigger_source: 'daily_checkin',
          feature_name: 'Daily Check-In',
          risk_factors: ['missed_checkins', 'pattern_change']
        }
      };

      await this.notifySupportNetwork(userId, notification, 'primary');
    }
  }

  // Get recent notifications for a supporter
  async getNotificationsForSupporter(supporterId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('support_network_notifications')
        .select(`
          *,
          profiles:user_id (
            full_name,
            display_name
          )
        `)
        .eq('supporter_id', supporterId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching supporter notifications:', error);
      return [];
    }
  }

  // Mark notification as acknowledged
  async acknowledgeNotification(notificationId: string, supporterId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('support_network_notifications')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: supporterId
        })
        .eq('id', notificationId)
        .eq('supporter_id', supporterId);

      if (error) throw error;
    } catch (error) {
      console.error('Error acknowledging notification:', error);
    }
  }
}

export const supportNetworkNotificationService = new SupportNetworkNotificationService();
export default supportNetworkNotificationService;
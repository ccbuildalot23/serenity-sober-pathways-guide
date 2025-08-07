import { supabase } from '@/integrations/supabase/client';
import { realtimeNotificationService } from './RealtimeNotificationService';

// Interface matching MCP server's crisis alert structure
interface McpCrisisAlert {
  alertId: string;
  userId: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  triggerType: 'manual' | 'voice' | 'shake' | 'pattern' | 'scheduled';
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  userMessage?: string;
  metadata?: any;
}

// Interface matching MCP server's response tracking
interface McpSupporterResponse {
  alertId: string;
  supporterId: string;
  responseType: 'acknowledged' | 'responding' | 'on_way' | 'made_contact' | 'unavailable';
  eta?: number;
  message?: string;
}

// Interface matching MCP server's escalation
interface McpEscalation {
  alertId: string;
  reason: string;
  fromTier: number;
  toTier: number;
  professionalServices?: boolean;
}

/**
 * Bridge service to integrate in-app notifications with existing MCP server
 * Maintains compatibility with all 5 MCP tools while adding real-time capabilities
 */
class McpIntegrationBridge {
  private mcpServerUrl: string;
  private staggeredTimings = {
    low: { initial: 30, tier2: 90, tier3: 180 },
    medium: { initial: 30, tier2: 90, tier3: 180 },
    high: { initial: 15, tier2: 45, tier3: 90 },
    critical: { initial: 10, tier2: 30, tier3: 60 },
    emergency: { initial: 0, tier2: 15, tier3: 30 }
  };

  constructor() {
    // MCP server URL - will be configured based on environment
    this.mcpServerUrl = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3000';
    this.setupMcpListeners();
  }

  /**
   * Setup listeners for MCP server events
   */
  private setupMcpListeners() {
    // Listen for crisis events from the database
    supabase
      .channel('mcp-crisis-events')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'crisis_events'
      }, (payload) => {
        this.handleCrisisEventFromMcp(payload.new);
      })
      .subscribe();
  }

  /**
   * MCP Tool 1: Send Crisis Alert
   * Bridges MCP alert to in-app notification system
   */
  public async sendCrisisAlert(alert: McpCrisisAlert): Promise<{ success: boolean; notificationIds: string[] }> {
    try {
      // Create crisis event in database
      const { data: crisisEvent, error: eventError } = await supabase
        .from('crisis_events')
        .insert({
          user_id: alert.userId,
          severity: alert.severity,
          trigger_type: alert.triggerType,
          location: alert.location,
          user_message: alert.userMessage,
          status: 'active',
          metadata: alert.metadata
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Get user's support network
      const { data: supporters, error: supportError } = await supabase
        .from('support_network')
        .select('supporter_id, tier_level, relationship_type')
        .eq('user_id', alert.userId)
        .eq('is_active', true)
        .order('tier_level');

      if (supportError) throw supportError;

      const notificationIds: string[] = [];
      const timing = this.staggeredTimings[alert.severity];

      // Create staggered notifications for each tier
      for (const supporter of supporters) {
        let delaySeconds = 0;
        
        switch (supporter.tier_level) {
          case 1:
            delaySeconds = timing.initial;
            break;
          case 2:
            delaySeconds = timing.tier2;
            break;
          case 3:
            delaySeconds = timing.tier3;
            break;
        }

        // Use AI message template based on relationship
        const message = await this.generatePersonalizedMessage(
          alert.userId,
          supporter.supporter_id,
          supporter.relationship_type,
          alert.severity,
          alert.userMessage
        );

        // Create notification
        const notification = await realtimeNotificationService.sendNotification({
          crisis_event_id: crisisEvent.id,
          user_id: alert.userId,
          supporter_id: supporter.supporter_id,
          type: 'crisis_alert',
          severity: alert.severity,
          title: `🆘 ${alert.severity === 'emergency' ? 'EMERGENCY: ' : ''}Crisis Alert`,
          message: message,
          channel: 'in_app',
          priority: this.getSeverityPriority(alert.severity),
          delay_seconds: delaySeconds,
          tier_level: supporter.tier_level,
          status: delaySeconds === 0 ? 'sending' : 'queued',
          metadata: {
            mcp_alert_id: alert.alertId,
            trigger_type: alert.triggerType,
            location: alert.location
          }
        });

        notificationIds.push(notification.id);
      }

      // If emergency, also trigger professional services
      if (alert.severity === 'emergency') {
        await this.triggerEmergencyProtocol(crisisEvent.id, alert);
      }

      return { success: true, notificationIds };

    } catch (error) {
      console.error('Failed to send crisis alert via MCP bridge:', error);
      return { success: false, notificationIds: [] };
    }
  }

  /**
   * MCP Tool 2: Track Response
   * Records supporter response and updates coordination
   */
  public async trackResponse(response: McpSupporterResponse): Promise<{ success: boolean; isPrimary: boolean }> {
    try {
      // Check if someone is already primary responder
      const { data: existingPrimary } = await supabase
        .from('crisis_responses')
        .select('id')
        .eq('crisis_event_id', response.alertId)
        .eq('is_primary_responder', true)
        .single();

      const isPrimary = !existingPrimary;

      // Record the response
      await realtimeNotificationService.respondToCrisis({
        notification_id: response.alertId,
        crisis_event_id: response.alertId,
        supporter_id: response.supporterId,
        response_type: response.responseType,
        response_message: response.message,
        eta_minutes: response.eta,
        is_primary_responder: isPrimary
      });

      // Update supporter availability
      await realtimeNotificationService.updateAvailability({
        status: response.responseType === 'responding' ? 'in_crisis' : 'available',
        current_active_crises: response.responseType === 'responding' ? 1 : 0
      });

      // Notify the person in crisis
      if (response.responseType === 'responding' || response.responseType === 'on_way') {
        await this.notifyUserOfResponse(response.alertId, response.supporterId, response.responseType, response.eta);
      }

      return { success: true, isPrimary };

    } catch (error) {
      console.error('Failed to track response via MCP bridge:', error);
      return { success: false, isPrimary: false };
    }
  }

  /**
   * MCP Tool 3: Escalate Support
   * Escalates to next tier or professional services
   */
  public async escalateSupport(escalation: McpEscalation): Promise<{ success: boolean; escalatedTo: string[] }> {
    try {
      // Record escalation
      const { data: escalationRecord, error } = await supabase
        .from('crisis_escalations')
        .insert({
          crisis_event_id: escalation.alertId,
          from_tier: escalation.fromTier,
          to_tier: escalation.toTier,
          escalation_reason: escalation.reason,
          emergency_services_contacted: escalation.professionalServices
        })
        .select()
        .single();

      if (error) throw error;

      // Get next tier supporters
      const { data: nextTierSupporters } = await supabase
        .from('support_network')
        .select('supporter_id')
        .eq('tier_level', escalation.toTier)
        .eq('is_active', true);

      const escalatedTo: string[] = [];

      // Send escalation notifications
      for (const supporter of nextTierSupporters || []) {
        await realtimeNotificationService.sendNotification({
          crisis_event_id: escalation.alertId,
          user_id: '', // Will be filled from crisis event
          supporter_id: supporter.supporter_id,
          type: 'escalation',
          severity: 'high',
          title: '📢 Crisis Escalation',
          message: `Crisis has been escalated. Reason: ${escalation.reason}`,
          channel: 'in_app',
          priority: 8,
          delay_seconds: 0,
          tier_level: escalation.toTier,
          status: 'sending',
          metadata: {
            escalation_id: escalationRecord.id,
            from_tier: escalation.fromTier
          }
        });

        escalatedTo.push(supporter.supporter_id);
      }

      // Contact emergency services if needed
      if (escalation.professionalServices) {
        await this.contactEmergencyServices(escalation.alertId);
      }

      return { success: true, escalatedTo };

    } catch (error) {
      console.error('Failed to escalate support via MCP bridge:', error);
      return { success: false, escalatedTo: [] };
    }
  }

  /**
   * MCP Tool 4: Get Alert Status
   * Returns comprehensive status of a crisis alert
   */
  public async getAlertStatus(alertId: string): Promise<any> {
    try {
      // Get crisis event
      const { data: crisisEvent } = await supabase
        .from('crisis_events')
        .select('*')
        .eq('id', alertId)
        .single();

      // Get all notifications
      const { data: notifications } = await supabase
        .from('crisis_notifications')
        .select('*')
        .eq('crisis_event_id', alertId)
        .order('created_at');

      // Get all responses
      const { data: responses } = await supabase
        .from('crisis_responses')
        .select('*')
        .eq('crisis_event_id', alertId)
        .order('created_at');

      // Get escalations
      const { data: escalations } = await supabase
        .from('crisis_escalations')
        .select('*')
        .eq('crisis_event_id', alertId)
        .order('created_at');

      // Calculate response metrics
      const primaryResponder = responses?.find(r => r.is_primary_responder);
      const responseTime = primaryResponder 
        ? new Date(primaryResponder.created_at).getTime() - new Date(crisisEvent.created_at).getTime()
        : null;

      return {
        crisis: crisisEvent,
        notifications: {
          total: notifications?.length || 0,
          delivered: notifications?.filter(n => n.status === 'delivered').length || 0,
          acknowledged: notifications?.filter(n => n.status === 'acknowledged').length || 0,
          failed: notifications?.filter(n => n.status === 'failed').length || 0
        },
        responses: {
          total: responses?.length || 0,
          primaryResponder: primaryResponder?.supporter_id,
          responseTimeMs: responseTime,
          types: responses?.map(r => r.response_type) || []
        },
        escalations: escalations?.length || 0,
        status: crisisEvent?.status || 'unknown',
        isResolved: crisisEvent?.status === 'resolved'
      };

    } catch (error) {
      console.error('Failed to get alert status via MCP bridge:', error);
      return null;
    }
  }

  /**
   * MCP Tool 5: Resolve Alert
   * Marks crisis as resolved and notifies all parties
   */
  public async resolveAlert(alertId: string, resolution: string): Promise<{ success: boolean }> {
    try {
      // Update crisis event status
      const { error: updateError } = await supabase
        .from('crisis_events')
        .update({
          status: 'resolved',
          resolution_notes: resolution,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (updateError) throw updateError;

      // Get all involved parties
      const { data: notifications } = await supabase
        .from('crisis_notifications')
        .select('supporter_id')
        .eq('crisis_event_id', alertId)
        .not('supporter_id', 'is', null);

      const uniqueSupporters = [...new Set(notifications?.map(n => n.supporter_id) || [])];

      // Send resolution notifications
      for (const supporterId of uniqueSupporters) {
        await realtimeNotificationService.sendNotification({
          crisis_event_id: alertId,
          user_id: '', // Will be filled from crisis event
          supporter_id: supporterId,
          type: 'resolution',
          severity: 'low',
          title: '✅ Crisis Resolved',
          message: `The crisis has been resolved. ${resolution}`,
          channel: 'in_app',
          priority: 3,
          delay_seconds: 0,
          tier_level: 1,
          status: 'sending',
          metadata: {
            resolution_notes: resolution
          }
        });
      }

      // Update all pending notifications to expired
      await supabase
        .from('crisis_notifications')
        .update({ status: 'expired' })
        .eq('crisis_event_id', alertId)
        .in('status', ['pending', 'queued']);

      return { success: true };

    } catch (error) {
      console.error('Failed to resolve alert via MCP bridge:', error);
      return { success: false };
    }
  }

  // Helper methods

  private async handleCrisisEventFromMcp(crisisEvent: any) {
    // Process crisis events that come from MCP server
    console.log('Received crisis event from MCP:', crisisEvent);
    
    // Trigger in-app notifications based on MCP event
    if (crisisEvent.source === 'mcp' && crisisEvent.status === 'active') {
      await this.sendCrisisAlert({
        alertId: crisisEvent.id,
        userId: crisisEvent.user_id,
        severity: crisisEvent.severity,
        triggerType: crisisEvent.trigger_type || 'manual',
        location: crisisEvent.location,
        userMessage: crisisEvent.user_message,
        metadata: crisisEvent.metadata
      });
    }
  }

  private async generatePersonalizedMessage(
    userId: string,
    supporterId: string,
    relationship: string,
    severity: string,
    userMessage?: string
  ): Promise<string> {
    // Use template for now - will integrate with AI service in production
    const templates = {
      sponsor: `Your sponsee needs your support. ${userMessage || 'They are struggling and reached out for help.'}`,
      family: `Your family member is going through a difficult time. ${userMessage || 'They need your support right now.'}`,
      therapist: `Your patient is experiencing a ${severity} crisis. ${userMessage || 'Immediate intervention may be needed.'}`,
      friend: `Your friend needs you. ${userMessage || 'They reached out for support during a tough moment.'}`,
      default: `Someone in your support network needs help. ${userMessage || 'Please respond if you are available.'}`
    };

    return templates[relationship as keyof typeof templates] || templates.default;
  }

  private getSeverityPriority(severity: string): number {
    const priorities = {
      emergency: 10,
      critical: 9,
      high: 7,
      medium: 5,
      low: 3
    };
    return priorities[severity as keyof typeof priorities] || 5;
  }

  private async triggerEmergencyProtocol(crisisEventId: string, alert: McpCrisisAlert) {
    // Emergency protocol for critical situations
    console.log('EMERGENCY PROTOCOL TRIGGERED for crisis:', crisisEventId);
    
    // This would integrate with emergency services
    // For now, log and notify
    await supabase
      .from('crisis_escalations')
      .insert({
        crisis_event_id: crisisEventId,
        from_tier: 0,
        to_tier: 999, // Emergency services tier
        escalation_reason: 'Emergency severity - automatic escalation',
        emergency_services_contacted: true
      });
  }

  private async notifyUserOfResponse(
    crisisEventId: string,
    supporterId: string,
    responseType: string,
    eta?: number
  ) {
    // Get supporter info
    const { data: supporter } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', supporterId)
      .single();

    const message = responseType === 'on_way' && eta
      ? `${supporter?.full_name || 'Someone'} is on their way. ETA: ${eta} minutes`
      : `${supporter?.full_name || 'Someone'} is responding to your request for help`;

    // Send acknowledgment to user in crisis
    await realtimeNotificationService.sendNotification({
      crisis_event_id: crisisEventId,
      user_id: '', // Will be filled from crisis event
      type: 'acknowledgment',
      severity: 'medium',
      title: '💚 Help is coming',
      message: message,
      channel: 'in_app',
      priority: 6,
      delay_seconds: 0,
      tier_level: 1,
      status: 'sending'
    });
  }

  private async contactEmergencyServices(crisisEventId: string) {
    // In production, this would actually contact emergency services
    console.log('CONTACTING EMERGENCY SERVICES for crisis:', crisisEventId);
    
    // Log the emergency contact
    await supabase
      .from('audit_logs')
      .insert({
        action: 'emergency_services_contacted',
        entity_type: 'crisis_event',
        entity_id: crisisEventId,
        metadata: {
          timestamp: new Date().toISOString(),
          automated: true
        }
      });
  }
}

// Export singleton instance
export const mcpIntegrationBridge = new McpIntegrationBridge();
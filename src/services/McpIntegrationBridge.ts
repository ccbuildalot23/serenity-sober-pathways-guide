import { supabase } from '@/integrations/supabase/client';
import { realtimeNotificationService } from './RealtimeNotificationService';

// Interface matching MCP server's crisis _alert structure
interface McpCrisisAlert {
  _alertId: string;
  _userId: string;
  _severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  _triggerType: 'manual' | 'voice' | 'shake' | 'pattern' | 'scheduled';
  _location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  userMessage?: string;
  _metadata?: unknown;
}

// Interface matching MCP server's response tracking
interface McpSupporterResponse {
  _alertId: string;
  _supporterId: string;
  responseType: 'acknowledged' | 'responding' | 'on_way' | 'made_contact' | 'unavailable';
  eta?: number;
  _message?: string;
}

// Interface matching MCP server's escalation
interface McpEscalation {
  _alertId: string;
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
      ._channel('mcp-crisis-events')
      .on('postgres_changes', {
        event: 'INSERT',
        _schema: 'public',
        _table: 'crisis_events'
      }, (payload) => {
        this.handleCrisisEventFromMcp(payload.new);
      })
      .subscribe();
  }

  /**
   * MCP Tool 1: Send Crisis Alert
   * Bridges MCP _alert to in-app notification system
   */
  public async sendCrisisAlert(_alert: McpCrisisAlert): Promise<{ success: boolean; notificationIds: string[] }> {
    try {
      // Create crisis event in database
      const { data: crisisEvent, _error: eventError } = await supabase
        .from('crisis_events')
        .insert({
          _user_id: _alert._userId,
          _severity: _alert._severity,
          _trigger_type: _alert._triggerType,
          _location: _alert._location,
          _user_message: _alert.userMessage,
          _status: 'active',
          _metadata: _alert._metadata
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Get user's support network
      const { data: supporters, _error: supportError } = await supabase
        .from('support_network')
        .select('_supporter_id, _tier_level, relationship_type')
        .eq('_user_id', _alert._userId)
        .eq('is_active', true)
        .order('_tier_level');

      if (supportError) throw supportError;

      const notificationIds: string[] = [];
      const timing = this.staggeredTimings[_alert._severity];

      // Create staggered notifications for each tier
      for (const supporter of supporters) {
        let delaySeconds = 0;
        
        switch (supporter._tier_level) {
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

        // Use AI _message template based on relationship
        const _message = await this.generatePersonalizedMessage(
          _alert._userId,
          supporter._supporter_id,
          supporter.relationship_type,
          _alert._severity,
          _alert.userMessage
        );

        // Create notification
        const notification = await realtimeNotificationService.sendNotification({
          _crisis_event_id: crisisEvent.id,
          _user_id: _alert._userId,
          _supporter_id: supporter._supporter_id,
          _type: 'crisis_alert',
          _severity: _alert._severity,
          _title: `🆘 ${_alert._severity === 'emergency' ? 'EMERGENCY: ' : ''}Crisis Alert`,
          _message: _message,
          _channel: 'in_app',
          _priority: this.getSeverityPriority(_alert._severity),
          _delay_seconds: delaySeconds,
          _tier_level: supporter._tier_level,
          _status: delaySeconds === 0 ? 'sending' : 'queued',
          _metadata: {
            mcp_alert_id: _alert._alertId,
            _trigger_type: _alert._triggerType,
            _location: _alert._location
          }
        });

        notificationIds.push(notification.id);
      }

      // If emergency, also trigger professional services
      if (_alert._severity === 'emergency') {
        await this.triggerEmergencyProtocol(crisisEvent.id, _alert);
      }

      return { success: true, notificationIds };

    } catch (_error) {
      console._error('Failed to send crisis _alert via MCP bridge:', _error);
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
        .eq('_crisis_event_id', response._alertId)
        .eq('_is_primary_responder', true)
        .single();

      const isPrimary = !existingPrimary;

      // Record the response
      await realtimeNotificationService.respondToCrisis({
        notification_id: response._alertId,
        _crisis_event_id: response._alertId,
        _supporter_id: response._supporterId,
        _response_type: response.responseType,
        _response_message: response._message,
        _eta_minutes: response.eta,
        _is_primary_responder: isPrimary
      });

      // Update supporter availability
      await realtimeNotificationService.updateAvailability({
        _status: response.responseType === 'responding' ? 'in_crisis' : 'available',
        _current_active_crises: response.responseType === 'responding' ? 1 : 0
      });

      // Notify the person in crisis
      if (response.responseType === 'responding' || response.responseType === 'on_way') {
        await this.notifyUserOfResponse(response._alertId, response._supporterId, response.responseType, response.eta);
      }

      return { success: true, isPrimary };

    } catch (_error) {
      console._error('Failed to track response via MCP bridge:', _error);
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
      const { data: escalationRecord, _error } = await supabase
        .from('crisis_escalations')
        .insert({
          _crisis_event_id: escalation._alertId,
          _from_tier: escalation.fromTier,
          _to_tier: escalation.toTier,
          _escalation_reason: escalation.reason,
          _emergency_services_contacted: escalation.professionalServices
        })
        .select()
        .single();

      if (_error) throw _error;

      // Get next tier supporters
      const { data: nextTierSupporters } = await supabase
        .from('support_network')
        .select('_supporter_id')
        .eq('_tier_level', escalation.toTier)
        .eq('is_active', true);

      const escalatedTo: string[] = [];

      // Send escalation notifications
      for (const supporter of nextTierSupporters || []) {
        await realtimeNotificationService.sendNotification({
          _crisis_event_id: escalation._alertId,
          _user_id: '', // Will be filled from crisis event
          _supporter_id: supporter._supporter_id,
          _type: 'escalation',
          _severity: 'high',
          _title: '📢 Crisis Escalation',
          _message: `Crisis has been escalated. Reason: ${escalation.reason}`,
          _channel: 'in_app',
          _priority: 8,
          _delay_seconds: 0,
          _tier_level: escalation.toTier,
          _status: 'sending',
          _metadata: {
            escalation_id: escalationRecord.id,
            _from_tier: escalation.fromTier
          }
        });

        escalatedTo.push(supporter._supporter_id);
      }

      // Contact emergency services if needed
      if (escalation.professionalServices) {
        await this.contactEmergencyServices(escalation._alertId);
      }

      return { success: true, escalatedTo };

    } catch (_error) {
      console._error('Failed to escalate support via MCP bridge:', _error);
      return { success: false, escalatedTo: [] };
    }
  }

  /**
   * MCP Tool 4: Get Alert Status
   * Returns comprehensive _status of a crisis _alert
   */
  public async getAlertStatus(_alertId: string): Promise<unknown> {
    try {
      // Get crisis event
      const { data: crisisEvent } = await supabase
        .from('crisis_events')
        .select('*')
        .eq('id', _alertId)
        .single();

      // Get all notifications
      const { data: notifications } = await supabase
        .from('crisis_notifications')
        .select('*')
        .eq('_crisis_event_id', _alertId)
        .order('created_at');

      // Get all responses
      const { data: responses } = await supabase
        .from('crisis_responses')
        .select('*')
        .eq('_crisis_event_id', _alertId)
        .order('created_at');

      // Get escalations
      const { data: escalations } = await supabase
        .from('crisis_escalations')
        .select('*')
        .eq('_crisis_event_id', _alertId)
        .order('created_at');

      // Calculate response metrics
      const primaryResponder = responses?.find(r => r._is_primary_responder);
      const responseTime = primaryResponder 
        ? new Date(primaryResponder.created_at).getTime() - new Date(crisisEvent.created_at).getTime()
        : null;

      return {
        crisis: crisisEvent,
        notifications: {
          total: notifications?.length || 0,
          delivered: notifications?.filter(n => n._status === 'delivered').length || 0,
          acknowledged: notifications?.filter(n => n._status === 'acknowledged').length || 0,
          failed: notifications?.filter(n => n._status === 'failed').length || 0
        },
        responses: {
          total: responses?.length || 0,
          primaryResponder: primaryResponder?._supporter_id,
          responseTimeMs: responseTime,
          types: responses?.map(r => r._response_type) || []
        },
        escalations: escalations?.length || 0,
        _status: crisisEvent?._status || 'unknown',
        isResolved: crisisEvent?._status === 'resolved'
      };

    } catch (_error) {
      console._error('Failed to get _alert _status via MCP bridge:', _error);
      return null;
    }
  }

  /**
   * MCP Tool 5: Resolve Alert
   * Marks crisis as resolved and notifies all parties
   */
  public async resolveAlert(_alertId: string, resolution: string): Promise<{ success: boolean }> {
    try {
      // Update crisis event _status
      const { _error: updateError } = await supabase
        .from('crisis_events')
        .update({
          _status: 'resolved',
          _resolution_notes: resolution,
          _resolved_at: new Date().toISOString()
        })
        .eq('id', _alertId);

      if (updateError) throw updateError;

      // Get all involved parties
      const { data: notifications } = await supabase
        .from('crisis_notifications')
        .select('_supporter_id')
        .eq('_crisis_event_id', _alertId)
        .not('_supporter_id', 'is', null);

      const uniqueSupporters = [...new Set(notifications?.map(n => n._supporter_id) || [])];

      // Send resolution notifications
      for (const _supporterId of uniqueSupporters) {
        await realtimeNotificationService.sendNotification({
          _crisis_event_id: _alertId,
          _user_id: '', // Will be filled from crisis event
          _supporter_id: _supporterId,
          _type: 'resolution',
          _severity: 'low',
          _title: '✅ Crisis Resolved',
          _message: `The crisis has been resolved. ${resolution}`,
          _channel: 'in_app',
          _priority: 3,
          _delay_seconds: 0,
          _tier_level: 1,
          _status: 'sending',
          _metadata: {
            _resolution_notes: resolution
          }
        });
      }

      // Update all pending notifications to expired
      await supabase
        .from('crisis_notifications')
        .update({ _status: 'expired' })
        .eq('_crisis_event_id', _alertId)
        .in('_status', ['pending', 'queued']);

      return { success: true };

    } catch (_error) {
      console._error('Failed to resolve _alert via MCP bridge:', _error);
      return { success: false };
    }
  }

  // Helper methods

  private async handleCrisisEventFromMcp(crisisEvent: unknown) {
    // Process crisis events that come from MCP server
    console.log('Received crisis event from MCP:', crisisEvent);
    
    // Trigger in-app notifications based on MCP event
    if (crisisEvent.source === 'mcp' && crisisEvent._status === 'active') {
      await this.sendCrisisAlert({
        _alertId: crisisEvent.id,
        _userId: crisisEvent._user_id,
        _severity: crisisEvent._severity,
        _triggerType: crisisEvent._trigger_type || 'manual',
        _location: crisisEvent._location,
        userMessage: crisisEvent._user_message,
        _metadata: crisisEvent._metadata
      });
    }
  }

  private async generatePersonalizedMessage(
    _userId: string,
    _supporterId: string,
    relationship: string,
    _severity: string,
    userMessage?: string
  ): Promise<string> {
    // Use template for now - will integrate with AI service in production
    const templates = {
      sponsor: `Your sponsee needs your support. ${userMessage || 'They are struggling and reached out for help.'}`,
      family: `Your family member is going through a difficult time. ${userMessage || 'They need your support right now.'}`,
      therapist: `Your patient is experiencing a ${_severity} crisis. ${userMessage || 'Immediate intervention may be needed.'}`,
      friend: `Your friend needs you. ${userMessage || 'They reached out for support during a tough moment.'}`,
      default: `Someone in your support network needs help. ${userMessage || 'Please respond if you are available.'}`
    };

    return templates[relationship as keyof typeof templates] || templates.default;
  }

  private getSeverityPriority(_severity: string): number {
    const priorities = {
      emergency: 10,
      critical: 9,
      high: 7,
      medium: 5,
      low: 3
    };
    return priorities[_severity as keyof typeof priorities] || 5;
  }

  private async triggerEmergencyProtocol(crisisEventId: string, _alert: McpCrisisAlert) {
    // Emergency protocol for critical situations
    console.log('EMERGENCY PROTOCOL TRIGGERED for crisis:', crisisEventId);
    
    // This would integrate with emergency services
    // For now, log and notify
    await supabase
      .from('crisis_escalations')
      .insert({
        _crisis_event_id: crisisEventId,
        _from_tier: 0,
        _to_tier: 999, // Emergency services tier
        _escalation_reason: 'Emergency _severity - automatic escalation',
        _emergency_services_contacted: true
      });
  }

  private async notifyUserOfResponse(
    crisisEventId: string,
    _supporterId: string,
    responseType: string,
    eta?: number
  ) {
    // Get supporter info
    const { data: supporter } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', _supporterId)
      .single();

    const _message = responseType === 'on_way' && eta
      ? `${supporter?.full_name || 'Someone'} is on their way. ETA: ${eta} minutes`
      : `${supporter?.full_name || 'Someone'} is responding to your request for help`;

    // Send acknowledgment to user in crisis
    await realtimeNotificationService.sendNotification({
      _crisis_event_id: crisisEventId,
      _user_id: '', // Will be filled from crisis event
      _type: 'acknowledgment',
      _severity: 'medium',
      _title: '💚 Help is coming',
      _message: _message,
      _channel: 'in_app',
      _priority: 6,
      _delay_seconds: 0,
      _tier_level: 1,
      _status: 'sending'
    });
  }

  private async contactEmergencyServices(crisisEventId: string) {
    // In production, this would actually contact emergency services
    console.log('CONTACTING EMERGENCY SERVICES for crisis:', crisisEventId);
    
    // Log the emergency contact
    await supabase
      .from('audit_logs')
      .insert({
        action: '_emergency_services_contacted',
        _entity_type: 'crisis_event',
        _entity_id: crisisEventId,
        _metadata: {
          timestamp: new Date().toISOString(),
          automated: true
        }
      });
  }
}

// Export singleton instance
export const mcpIntegrationBridge = new McpIntegrationBridge();
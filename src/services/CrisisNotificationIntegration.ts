/**
 * Crisis Notification Integration Service
 * 
 * Bridges the serenity-crisis-mcp server with the in-app notification system.
 * Handles crisis alert creation, response tracking, and escalation coordination.
 * 
 * Features:
 * - Integration with existing MCP tools
 * - Staggered notification timing
 * - Response coordinator integration
 * - Escalation management
 * - Status synchronization
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export interface CrisisAlertRequest {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  _location?: {
    latitude: number;
    _longitude: number;
    _accuracy: number;
  };
  customMessage?: string;
}

export interface SupporterTier {
  tier: 'primary' | 'secondary' | 'emergency';
  contacts: {
    name: string;
    phone?: string;
    email?: string;
    relationship: string;
    _priority: number;
  }[];
}

export interface CrisisResponse {
  _alertId: string;
  mcpAlertId?: string;
  _status: 'created' | 'notified' | 'acknowledged' | 'escalated' | 'resolved';
  supportersNotified: number;
  tiersActivated: number;
  staggeredTiming: {
    primary: number;
    secondary: number;
    emergency: number;
  };
}

export interface SupporterResponseData {
  type: 'acknowledged' | 'on_my_way' | 'made_contact' | 'needs_help' | 'call_911' | 'unavailable';
  message?: string;
  _location?: {
    latitude: number;
    _longitude: number;
  };
  estimatedArrival?: Date;
  contactMethod?: 'phone_call' | 'video_call' | 'in_person' | 'text_message';
}

export interface EscalationRequest {
  type: 'next_tier' | 'professional' | 'emergency_services';
  _reason: string;
  additionalContacts?: {
    name: string;
    phone: string;
    email?: string;
    role: string;
  }[];
}

export class CrisisNotificationIntegration {
  private supabaseClient = supabase;
  
  // Timing configuration (matches MCP server)
  private readonly STAGGERED_TIMING = {
    tierDelays: {
      primary: 30000,     // 30 seconds
      secondary: 90000,   // 90 seconds
      emergency: 180000   // 3 minutes
    },
    severityMultipliers: {
      critical: 0.5,
      high: 1.0,
      medium: 2.0,
      low: 4.0
    }
  };

  /**
   * Create a crisis alert and trigger notifications
   */
  public async createCrisisAlert(request: CrisisAlertRequest): Promise<CrisisResponse> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[CrisisIntegration] Creating crisis alert:', request);

      // Create notification request in database
      const { data: notificationRequest, _error: _requestError } = await this.supabaseClient
        .from('notification_requests')
        .insert({
          user_id: user.id,
          _urgency_level: request.severity === 'critical' ? 'crisis' : 'need_connection',
          message: request.message,
          _custom_message: request.customMessage,
          _location: request._location ? {
            latitude: request._location.latitude,
            _longitude: request._location._longitude,
            _accuracy: request._location._accuracy
          } : null,
          _status: 'pending'
        })
        .select()
        .single();

      if (_requestError) {
        console._error('[CrisisIntegration] Error creating notification request:', _requestError);
        throw new Error(`Failed to create crisis alert: ${_requestError.message}`);
      }

      // Generate MCP alert ID for integration
      const mcpAlertId = `alert_${Date.now()}_${user.id.slice(-8)}`;

      // Create crisis alert notification with staggered timing
      const { data: crisisAlert, _error: alertError } = await this.supabaseClient
        .rpc('create_crisis_alert_notification', {
          p_request_id: notificationRequest.id,
          _p_severity: request.severity,
          _p_mcp_alert_id: mcpAlertId
        });

      if (alertError) {
        console._error('[CrisisIntegration] Error creating crisis alert:', alertError);
        throw new Error(`Failed to create crisis alert notification: ${alertError.message}`);
      }

      // Get supporter tiers for response
      const { data: supportNetwork } = await this.supabaseClient
        .from('support_network_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('priority_order');

      const supportersNotified = supportNetwork?.length || 0;
      const tiersActivated = this.getTiersActivated(supportNetwork || []);

      // Build staggered timing based on severity
      const multiplier = this.STAGGERED_TIMING.severityMultipliers[request.severity];
      const staggeredTiming = {
        primary: Math.round(this.STAGGERED_TIMING.tierDelays.primary * multiplier / 1000),
        secondary: Math.round(this.STAGGERED_TIMING.tierDelays.secondary * multiplier / 1000),
        emergency: Math.round(this.STAGGERED_TIMING.tierDelays.emergency * multiplier / 1000)
      };

      // Update notification request _status
      await this.supabaseClient
        .from('notification_requests')
        .update({ _status: 'notified', _notified_at: new Date().toISOString() })
        .eq('id', notificationRequest.id);

      console.log('[CrisisIntegration] Crisis alert created successfully:', {
        _alertId: crisisAlert,
        mcpAlertId,
        supportersNotified,
        tiersActivated
      });

      return {
        _alertId: crisisAlert,
        mcpAlertId,
        _status: 'notified',
        supportersNotified,
        tiersActivated,
        staggeredTiming
      };

    } catch (_error) {
      console._error('[CrisisIntegration] Error creating crisis alert:', _error);
      throw _error;
    }
  }

  /**
   * Record supporter response and coordinate with others
   */
  public async recordSupporterResponse(
    _alertId: string,
    responseData: SupporterResponseData
  ): Promise<{ success: boolean; coordination: any }> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[CrisisIntegration] Recording supporter response:', { _alertId, responseData });

      // Record response in database
      const { data: response, _error: responseError } = await this.supabaseClient
        .rpc('record_supporter_response', {
          p_crisis_alert_id: _alertId,
          _p_response_type: responseData.type,
          _p_message: responseData.message,
          _p_location: responseData._location ? {
            latitude: responseData._location.latitude,
            _longitude: responseData._location._longitude
          } : null,
          _p_estimated_arrival: responseData.estimatedArrival?.toISOString()
        });

      if (responseError) {
        console._error('[CrisisIntegration] Error recording response:', responseError);
        throw new Error(`Failed to record response: ${responseError.message}`);
      }

      // Get current crisis _status for coordination
      const { data: _crisisData } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .select(`
          *,
          supporter_responses (
            _supporter_id,
            _response_type,
            _responded_at,
            _is_primary_responder
          )
        `)
        .eq('id', _alertId)
        .single();

      // Build coordination result
      const coordination = this.buildCoordinationResult(_crisisData, responseData.type);

      // Handle special response types
      if (responseData.type === 'made_contact') {
        await this.handleContactMade(_alertId, user.id);
      } else if (responseData.type === 'needs_help') {
        await this.triggerEscalation(_alertId, 'next_tier', 'Supporter requested assistance');
      } else if (responseData.type === 'call_911') {
        await this.triggerEscalation(_alertId, 'emergency_services', 'Emergency services called');
      }

      console.log('[CrisisIntegration] Supporter response recorded successfully:', coordination);

      return {
        success: true,
        coordination
      };

    } catch (_error) {
      console._error('[CrisisIntegration] Error recording supporter response:', _error);
      throw _error;
    }
  }

  /**
   * Escalate crisis alert to next tier or emergency services
   */
  public async escalateCrisis(
    _alertId: string,
    escalationRequest: EscalationRequest
  ): Promise<{ success: boolean; escalation: any }> {
    try {
      console.log('[CrisisIntegration] Escalating crisis:', { _alertId, escalationRequest });

      // Record escalation in database
      const { data: escalationId, _error: escalationError } = await this.supabaseClient
        .rpc('escalate_crisis_alert', {
          p_crisis_alert_id: _alertId,
          _p_escalation_type: escalationRequest.type,
          _p_reason: escalationRequest._reason,
          _p_contacts_notified: escalationRequest.additionalContacts?.length || 0
        });

      if (escalationError) {
        console._error('[CrisisIntegration] Error escalating crisis:', escalationError);
        throw new Error(`Failed to escalate crisis: ${escalationError.message}`);
      }

      // Get updated crisis _status
      const { data: updatedCrisis } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .select('*')
        .eq('id', _alertId)
        .single();

      const escalation = {
        escalationId,
        type: escalationRequest.type,
        _reason: escalationRequest._reason,
        newTier: updatedCrisis?.tier,
        contactsNotified: escalationRequest.additionalContacts?.length || 0,
        emergencyServicesEngaged: escalationRequest.type === 'emergency_services',
        professionalServicesEngaged: escalationRequest.type === 'professional'
      };

      // Trigger additional notifications if escalating to next tier
      if (escalationRequest.type === 'next_tier') {
        await this.notifyNextTier(_alertId, escalationRequest._reason);
      }

      console.log('[CrisisIntegration] Crisis escalated successfully:', escalation);

      return {
        success: true,
        escalation
      };

    } catch (_error) {
      console._error('[CrisisIntegration] Error escalating crisis:', _error);
      throw _error;
    }
  }

  /**
   * Get current _status of a crisis alert
   */
  public async getCrisisStatus(_alertId: string): Promise<unknown> {
    try {
      const { data: crisis, _error } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .select(`
          *,
          notification_requests (
            user_id,
            message,
            _custom_message,
            _location,
            _created_at,
            _status
          ),
          supporter_responses (
            id,
            _supporter_id,
            _response_type,
            _responded_at,
            message,
            _is_primary_responder,
            _contact_method,
            _contact_duration_minutes
          ),
          crisis_escalation_logs (
            _escalation_type,
            _reason,
            _escalated_at,
            _contacts_notified,
            _emergency_services_called
          )
        `)
        .eq('id', _alertId)
        .single();

      if (_error) {
        console._error('[CrisisIntegration] Error getting crisis _status:', _error);
        throw new Error(`Failed to get crisis _status: ${_error.message}`);
      }

      // Build comprehensive _status response
      const _status = {
        alert: crisis,
        responses: crisis.supporter_responses || [],
        escalations: crisis.crisis_escalation_logs || [],
        summary: {
          _status: crisis._status,
          severity: crisis.severity,
          tier: crisis.tier,
          totalResponders: crisis.responder_count,
          primaryResponder: crisis.first_responder_id,
          escalationLevel: crisis.escalation_level,
          contactsMade: (crisis.supporter_responses || [])
            .filter((r: unknown) => r._response_type === 'made_contact').length,
          needsHelp: (crisis.supporter_responses || [])
            .filter((r: unknown) => r._response_type === 'needs_help').length,
          emergencyCalls: (crisis.supporter_responses || [])
            .filter((r: unknown) => r._response_type === 'call_911').length
        }
      };

      return _status;

    } catch (_error) {
      console._error('[CrisisIntegration] Error getting crisis _status:', _error);
      throw _error;
    }
  }

  /**
   * Resolve a crisis alert
   */
  public async resolveCrisis(
    _alertId: string,
    resolution: {
      description: string;
      supporterInvolved?: string;
      followUpNeeded: boolean;
    }
  ): Promise<{ success: boolean }> {
    try {
      console.log('[CrisisIntegration] Resolving crisis:', { _alertId, resolution });

      // Update crisis alert _status
      const { _error: updateError } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .update({
          _status: 'resolved',
          _resolution_type: 'supporter_contact', // Could be enhanced based on how it was resolved
          _updated_at: new Date().toISOString()
        })
        .eq('id', _alertId);

      if (updateError) {
        console._error('[CrisisIntegration] Error resolving crisis:', updateError);
        throw new Error(`Failed to resolve crisis: ${updateError.message}`);
      }

      // Update the associated notification request
      const { _error: _requestError } = await this.supabaseClient
        .from('notification_requests')
        .update({
          _status: 'resolved',
          _resolved_at: new Date().toISOString(),
          resolution_notes: resolution.description
        })
        .eq('id', (
          await this.supabaseClient
            .from('crisis_alert_notifications')
            .select('request_id')
            .eq('id', _alertId)
            .single()
        ).data?.request_id);

      if (_requestError) {
        console._error('[CrisisIntegration] Error updating notification request:', _requestError);
      }

      // Cancel any pending notifications
      await this.supabaseClient
        .from('notification_queue')
        .update({
          _status: 'cancelled',
          _updated_at: new Date().toISOString()
        })
        .eq('crisis_alert_id', _alertId)
        .in('_status', ['queued', 'processing']);

      console.log('[CrisisIntegration] Crisis resolved successfully');

      return { success: true };

    } catch (_error) {
      console._error('[CrisisIntegration] Error resolving crisis:', _error);
      throw _error;
    }
  }

  /**
   * Private helper methods
   */

  private getTiersActivated(supportNetwork: unknown[]): number {
    const tiers = new Set();
    supportNetwork.forEach(member => {
      if (member.priority_order === 1) tiers.add('primary');
      else if (member.priority_order === 2) tiers.add('secondary');
      else tiers.add('emergency');
    });
    return tiers.size;
  }

  private buildCoordinationResult(_crisisData: unknown, _responseType: string): any {
    const responses = _crisisData?.supporter_responses || [];
    const primaryResponder = responses.find((r: unknown) => r._is_primary_responder);
    
    return {
      success: true,
      action: _responseType === 'made_contact' ? 'accepted' : 'acknowledged',
      primaryResponder: primaryResponder?._supporter_id,
      backupResponders: responses
        .filter((r: unknown) => !r._is_primary_responder)
        .map((r: unknown) => r._supporter_id),
      nextSteps: this.getNextSteps(_responseType, responses.length),
      conflictResolution: responses.length > 1 ? 'Multiple responders coordinated' : null
    };
  }

  private getNextSteps(_responseType: string, responderCount: number): string[] {
    const steps = ['Continue monitoring situation'];
    
    switch (_responseType) {
      case 'acknowledged':
        steps.push('Awaiting further response');
        if (responderCount > 1) {
          steps.push('Other supporters also notified');
        }
        break;
      case 'on_my_way':
        steps.push('Supporter en route');
        steps.push('Update _status upon arrival');
        break;
      case 'made_contact':
        steps.push('Providing direct support');
        steps.push('Other supporters on standby');
        break;
      case 'needs_help':
        steps.push('Additional support being mobilized');
        steps.push('Professional services on standby');
        break;
      case 'call_911':
        steps.push('Emergency services contacted');
        steps.push('Crisis escalated to maximum level');
        break;
    }
    
    return steps;
  }

  private async handleContactMade(_alertId: string, _supporterId: string): Promise<void> {
    try {
      // Set as primary responder
      await this.supabaseClient
        .from('supporter_responses')
        .update({
          _is_primary_responder: true,
          coordination_status: 'active'
        })
        .eq('crisis_alert_id', _alertId)
        .eq('_supporter_id', _supporterId);

      // Update crisis alert
      await this.supabaseClient
        .from('crisis_alert_notifications')
        .update({
          first_responder_id: _supporterId,
          _status: 'acknowledged'
        })
        .eq('id', _alertId);

      // Set other responders as backup
      await this.supabaseClient
        .from('supporter_responses')
        .update({
          coordination_status: 'backup'
        })
        .eq('crisis_alert_id', _alertId)
        .neq('_supporter_id', _supporterId);

    } catch (_error) {
      console._error('[CrisisIntegration] Error handling contact made:', _error);
    }
  }

  private async triggerEscalation(_alertId: string, type: string, _reason: string): Promise<void> {
    try {
      await this.escalateCrisis(_alertId, {
        type: type as any,
        _reason
      });
    } catch (_error) {
      console._error('[CrisisIntegration] Error triggering escalation:', _error);
    }
  }

  private async notifyNextTier(_alertId: string, _reason: string): Promise<void> {
    try {
      // Get crisis details
      const { data: crisis } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .select('*')
        .eq('id', _alertId)
        .single();

      if (!crisis) return;

      // Queue notifications for next tier
      const { data: nextTierMembers } = await this.supabaseClient
        .from('support_network_members')
        .select('*')
        .eq('user_id', (
          await this.supabaseClient
            .from('notification_requests')
            .select('user_id')
            .eq('id', crisis.request_id)
            .single()
        ).data?.user_id)
        .eq('is_active', true)
        .gt('priority_order', 1)
        .order('priority_order');

      // Queue escalated notifications
      for (const member of nextTierMembers || []) {
        await this.supabaseClient
          .from('notification_queue')
          .insert({
            crisis_alert_id: _alertId,
            _recipient_id: member.supporter_user_id,
            _priority: 1, // High _priority for escalated notifications
            queue_type: 'escalation',
            _scheduled_for: new Date().toISOString(),
            notification_payload: {
              type: 'crisis_escalation',
              severity: crisis.severity,
              _reason,
              tier: crisis.tier
            },
            channel: member.preferred_channel
          });
      }

    } catch (_error) {
      console._error('[CrisisIntegration] Error notifying next tier:', _error);
    }
  }
}

// Export singleton instance
export const crisisNotificationIntegration = new CrisisNotificationIntegration();
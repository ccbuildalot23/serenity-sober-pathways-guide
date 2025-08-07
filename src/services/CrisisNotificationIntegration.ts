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
import { realtimeNotificationService } from './RealtimeNotificationService';
import type { Database } from '@/integrations/supabase/types';

export interface CrisisAlertRequest {
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
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
    priority: number;
  }[];
}

export interface CrisisResponse {
  alertId: string;
  mcpAlertId?: string;
  status: 'created' | 'notified' | 'acknowledged' | 'escalated' | 'resolved';
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
  location?: {
    latitude: number;
    longitude: number;
  };
  estimatedArrival?: Date;
  contactMethod?: 'phone_call' | 'video_call' | 'in_person' | 'text_message';
}

export interface EscalationRequest {
  type: 'next_tier' | 'professional' | 'emergency_services';
  reason: string;
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
      const { data: notificationRequest, error: requestError } = await this.supabaseClient
        .from('notification_requests')
        .insert({
          user_id: user.id,
          urgency_level: request.severity === 'critical' ? 'crisis' : 'need_connection',
          message: request.message,
          custom_message: request.customMessage,
          location: request.location ? {
            latitude: request.location.latitude,
            longitude: request.location.longitude,
            accuracy: request.location.accuracy
          } : null,
          status: 'pending'
        })
        .select()
        .single();

      if (requestError) {
        console.error('[CrisisIntegration] Error creating notification request:', requestError);
        throw new Error(`Failed to create crisis alert: ${requestError.message}`);
      }

      // Generate MCP alert ID for integration
      const mcpAlertId = `alert_${Date.now()}_${user.id.slice(-8)}`;

      // Create crisis alert notification with staggered timing
      const { data: crisisAlert, error: alertError } = await this.supabaseClient
        .rpc('create_crisis_alert_notification', {
          p_request_id: notificationRequest.id,
          p_severity: request.severity,
          p_mcp_alert_id: mcpAlertId
        });

      if (alertError) {
        console.error('[CrisisIntegration] Error creating crisis alert:', alertError);
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

      // Update notification request status
      await this.supabaseClient
        .from('notification_requests')
        .update({ status: 'notified', notified_at: new Date().toISOString() })
        .eq('id', notificationRequest.id);

      console.log('[CrisisIntegration] Crisis alert created successfully:', {
        alertId: crisisAlert,
        mcpAlertId,
        supportersNotified,
        tiersActivated
      });

      return {
        alertId: crisisAlert,
        mcpAlertId,
        status: 'notified',
        supportersNotified,
        tiersActivated,
        staggeredTiming
      };

    } catch (error) {
      console.error('[CrisisIntegration] Error creating crisis alert:', error);
      throw error;
    }
  }

  /**
   * Record supporter response and coordinate with others
   */
  public async recordSupporterResponse(
    alertId: string,
    responseData: SupporterResponseData
  ): Promise<{ success: boolean; coordination: any }> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[CrisisIntegration] Recording supporter response:', { alertId, responseData });

      // Record response in database
      const { data: response, error: responseError } = await this.supabaseClient
        .rpc('record_supporter_response', {
          p_crisis_alert_id: alertId,
          p_response_type: responseData.type,
          p_message: responseData.message,
          p_location: responseData.location ? {
            latitude: responseData.location.latitude,
            longitude: responseData.location.longitude
          } : null,
          p_estimated_arrival: responseData.estimatedArrival?.toISOString()
        });

      if (responseError) {
        console.error('[CrisisIntegration] Error recording response:', responseError);
        throw new Error(`Failed to record response: ${responseError.message}`);
      }

      // Get current crisis status for coordination
      const { data: crisisData } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .select(`
          *,
          supporter_responses (
            supporter_id,
            response_type,
            responded_at,
            is_primary_responder
          )
        `)
        .eq('id', alertId)
        .single();

      // Build coordination result
      const coordination = this.buildCoordinationResult(crisisData, responseData.type);

      // Handle special response types
      if (responseData.type === 'made_contact') {
        await this.handleContactMade(alertId, user.id);
      } else if (responseData.type === 'needs_help') {
        await this.triggerEscalation(alertId, 'next_tier', 'Supporter requested assistance');
      } else if (responseData.type === 'call_911') {
        await this.triggerEscalation(alertId, 'emergency_services', 'Emergency services called');
      }

      console.log('[CrisisIntegration] Supporter response recorded successfully:', coordination);

      return {
        success: true,
        coordination
      };

    } catch (error) {
      console.error('[CrisisIntegration] Error recording supporter response:', error);
      throw error;
    }
  }

  /**
   * Escalate crisis alert to next tier or emergency services
   */
  public async escalateCrisis(
    alertId: string,
    escalationRequest: EscalationRequest
  ): Promise<{ success: boolean; escalation: any }> {
    try {
      console.log('[CrisisIntegration] Escalating crisis:', { alertId, escalationRequest });

      // Record escalation in database
      const { data: escalationId, error: escalationError } = await this.supabaseClient
        .rpc('escalate_crisis_alert', {
          p_crisis_alert_id: alertId,
          p_escalation_type: escalationRequest.type,
          p_reason: escalationRequest.reason,
          p_contacts_notified: escalationRequest.additionalContacts?.length || 0
        });

      if (escalationError) {
        console.error('[CrisisIntegration] Error escalating crisis:', escalationError);
        throw new Error(`Failed to escalate crisis: ${escalationError.message}`);
      }

      // Get updated crisis status
      const { data: updatedCrisis } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .select('*')
        .eq('id', alertId)
        .single();

      const escalation = {
        escalationId,
        type: escalationRequest.type,
        reason: escalationRequest.reason,
        newTier: updatedCrisis?.tier,
        contactsNotified: escalationRequest.additionalContacts?.length || 0,
        emergencyServicesEngaged: escalationRequest.type === 'emergency_services',
        professionalServicesEngaged: escalationRequest.type === 'professional'
      };

      // Trigger additional notifications if escalating to next tier
      if (escalationRequest.type === 'next_tier') {
        await this.notifyNextTier(alertId, escalationRequest.reason);
      }

      console.log('[CrisisIntegration] Crisis escalated successfully:', escalation);

      return {
        success: true,
        escalation
      };

    } catch (error) {
      console.error('[CrisisIntegration] Error escalating crisis:', error);
      throw error;
    }
  }

  /**
   * Get current status of a crisis alert
   */
  public async getCrisisStatus(alertId: string): Promise<any> {
    try {
      const { data: crisis, error } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .select(`
          *,
          notification_requests (
            user_id,
            message,
            custom_message,
            location,
            created_at,
            status
          ),
          supporter_responses (
            id,
            supporter_id,
            response_type,
            responded_at,
            message,
            is_primary_responder,
            contact_method,
            contact_duration_minutes
          ),
          crisis_escalation_logs (
            escalation_type,
            reason,
            escalated_at,
            contacts_notified,
            emergency_services_called
          )
        `)
        .eq('id', alertId)
        .single();

      if (error) {
        console.error('[CrisisIntegration] Error getting crisis status:', error);
        throw new Error(`Failed to get crisis status: ${error.message}`);
      }

      // Build comprehensive status response
      const status = {
        alert: crisis,
        responses: crisis.supporter_responses || [],
        escalations: crisis.crisis_escalation_logs || [],
        summary: {
          status: crisis.status,
          severity: crisis.severity,
          tier: crisis.tier,
          totalResponders: crisis.responder_count,
          primaryResponder: crisis.first_responder_id,
          escalationLevel: crisis.escalation_level,
          contactsMade: (crisis.supporter_responses || [])
            .filter((r: any) => r.response_type === 'made_contact').length,
          needsHelp: (crisis.supporter_responses || [])
            .filter((r: any) => r.response_type === 'needs_help').length,
          emergencyCalls: (crisis.supporter_responses || [])
            .filter((r: any) => r.response_type === 'call_911').length
        }
      };

      return status;

    } catch (error) {
      console.error('[CrisisIntegration] Error getting crisis status:', error);
      throw error;
    }
  }

  /**
   * Resolve a crisis alert
   */
  public async resolveCrisis(
    alertId: string,
    resolution: {
      description: string;
      supporterInvolved?: string;
      followUpNeeded: boolean;
    }
  ): Promise<{ success: boolean }> {
    try {
      console.log('[CrisisIntegration] Resolving crisis:', { alertId, resolution });

      // Update crisis alert status
      const { error: updateError } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .update({
          status: 'resolved',
          resolution_type: 'supporter_contact', // Could be enhanced based on how it was resolved
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (updateError) {
        console.error('[CrisisIntegration] Error resolving crisis:', updateError);
        throw new Error(`Failed to resolve crisis: ${updateError.message}`);
      }

      // Update the associated notification request
      const { error: requestError } = await this.supabaseClient
        .from('notification_requests')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution.description
        })
        .eq('id', (
          await this.supabaseClient
            .from('crisis_alert_notifications')
            .select('request_id')
            .eq('id', alertId)
            .single()
        ).data?.request_id);

      if (requestError) {
        console.error('[CrisisIntegration] Error updating notification request:', requestError);
      }

      // Cancel any pending notifications
      await this.supabaseClient
        .from('notification_queue')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('crisis_alert_id', alertId)
        .in('status', ['queued', 'processing']);

      console.log('[CrisisIntegration] Crisis resolved successfully');

      return { success: true };

    } catch (error) {
      console.error('[CrisisIntegration] Error resolving crisis:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private getTiersActivated(supportNetwork: any[]): number {
    const tiers = new Set();
    supportNetwork.forEach(member => {
      if (member.priority_order === 1) tiers.add('primary');
      else if (member.priority_order === 2) tiers.add('secondary');
      else tiers.add('emergency');
    });
    return tiers.size;
  }

  private buildCoordinationResult(crisisData: any, responseType: string): any {
    const responses = crisisData?.supporter_responses || [];
    const primaryResponder = responses.find((r: any) => r.is_primary_responder);
    
    return {
      success: true,
      action: responseType === 'made_contact' ? 'accepted' : 'acknowledged',
      primaryResponder: primaryResponder?.supporter_id,
      backupResponders: responses
        .filter((r: any) => !r.is_primary_responder)
        .map((r: any) => r.supporter_id),
      nextSteps: this.getNextSteps(responseType, responses.length),
      conflictResolution: responses.length > 1 ? 'Multiple responders coordinated' : null
    };
  }

  private getNextSteps(responseType: string, responderCount: number): string[] {
    const steps = ['Continue monitoring situation'];
    
    switch (responseType) {
      case 'acknowledged':
        steps.push('Awaiting further response');
        if (responderCount > 1) {
          steps.push('Other supporters also notified');
        }
        break;
      case 'on_my_way':
        steps.push('Supporter en route');
        steps.push('Update status upon arrival');
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

  private async handleContactMade(alertId: string, supporterId: string): Promise<void> {
    try {
      // Set as primary responder
      await this.supabaseClient
        .from('supporter_responses')
        .update({
          is_primary_responder: true,
          coordination_status: 'active'
        })
        .eq('crisis_alert_id', alertId)
        .eq('supporter_id', supporterId);

      // Update crisis alert
      await this.supabaseClient
        .from('crisis_alert_notifications')
        .update({
          first_responder_id: supporterId,
          status: 'acknowledged'
        })
        .eq('id', alertId);

      // Set other responders as backup
      await this.supabaseClient
        .from('supporter_responses')
        .update({
          coordination_status: 'backup'
        })
        .eq('crisis_alert_id', alertId)
        .neq('supporter_id', supporterId);

    } catch (error) {
      console.error('[CrisisIntegration] Error handling contact made:', error);
    }
  }

  private async triggerEscalation(alertId: string, type: string, reason: string): Promise<void> {
    try {
      await this.escalateCrisis(alertId, {
        type: type as any,
        reason
      });
    } catch (error) {
      console.error('[CrisisIntegration] Error triggering escalation:', error);
    }
  }

  private async notifyNextTier(alertId: string, reason: string): Promise<void> {
    try {
      // Get crisis details
      const { data: crisis } = await this.supabaseClient
        .from('crisis_alert_notifications')
        .select('*')
        .eq('id', alertId)
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
            crisis_alert_id: alertId,
            recipient_id: member.supporter_user_id,
            priority: 1, // High priority for escalated notifications
            queue_type: 'escalation',
            scheduled_for: new Date().toISOString(),
            notification_payload: {
              type: 'crisis_escalation',
              severity: crisis.severity,
              reason,
              tier: crisis.tier
            },
            channel: member.preferred_channel
          });
      }

    } catch (error) {
      console.error('[CrisisIntegration] Error notifying next tier:', error);
    }
  }
}

// Export singleton instance
export const crisisNotificationIntegration = new CrisisNotificationIntegration();
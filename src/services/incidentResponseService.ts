import { supabase } from '@/integrations/supabase/client';

export interface IncidentResponse {
  id: string;
  incident_type: string;
  severity_level: string;
  status: string;
  detection_method: string;
  detected_at: string;
  detected_by?: string;
  incident_description: string;
  affected_systems?: any;
  affected_users_count?: number;
  data_types_affected?: any;
  breach_confirmed?: boolean;
  regulatory_notification_required?: boolean;
  notification_deadline?: string;
  containment_actions?: any;
  resolution_actions?: any;
  lessons_learned?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RegulatoryNotification {
  id: string;
  incident_id: string;
  regulator_name: string;
  notification_type: string;
  jurisdiction: string;
  deadline: string;
  status: string;
  notification_content?: string;
  submitted_at?: string;
  confirmation_received?: boolean;
  reference_number?: string;
  created_at: string;
}

class IncidentResponseService {
  async detectIncident(
    incidentType: string,
    severityLevel: string,
    description: string,
    detectionMethod: string,
    detectedBy?: string
  ): Promise<IncidentResponse> {
    const incident = {
      incident_type: incidentType,
      severity_level: severityLevel,
      status: 'detected',
      detection_method: detectionMethod,
      detected_by: detectedBy,
      incident_description: description,
      affected_systems: [],
      affected_users_count: 0,
      data_types_affected: [],
      breach_confirmed: false,
      regulatory_notification_required: false,
      containment_actions: [],
      resolution_actions: []
    };

    const { data, error } = await supabase
      .from('incident_responses')
      .insert(incident)
      .select()
      .single();

    if (error) throw error;

    // Auto-assign notification deadline based on jurisdiction
    if (this.requiresRegulatoryNotification(incidentType, severityLevel)) {
      await this.scheduleRegulatoryNotifications(data.id, severityLevel);
    }

    // Trigger automated response
    await this.triggerAutomatedResponse(data as IncidentResponse);

    return data as IncidentResponse;
  }

  private requiresRegulatoryNotification(incidentType: string, severity: string): boolean {
    const notificationRequired = [
      'data_breach',
      'privacy_violation',
      'security_incident',
      'system_compromise'
    ];

    return notificationRequired.includes(incidentType) && ['high', 'critical'].includes(severity);
  }

  private async scheduleRegulatoryNotifications(incidentId: string, severity: string): Promise<void> {
    const notifications = this.getRegulatoryRequirements(severity);

    for (const notification of notifications) {
      await supabase
        .from('regulatory_notifications')
        .insert({
          incident_id: incidentId,
          regulator_name: notification.regulator,
          notification_type: notification.type,
          jurisdiction: notification.jurisdiction,
          deadline: notification.deadline,
          status: 'pending'
        });
    }
  }

  private getRegulatoryRequirements(severity: string): any[] {
    const baseDeadline = new Date();
    
    if (severity === 'critical') {
      baseDeadline.setHours(baseDeadline.getHours() + 24); // 24 hours for critical
    } else {
      baseDeadline.setHours(baseDeadline.getHours() + 72); // 72 hours for high
    }

    return [
      {
        regulator: 'State Attorney General',
        type: 'data_breach_notification',
        jurisdiction: 'state',
        deadline: baseDeadline.toISOString()
      },
      {
        regulator: 'HHS OCR',
        type: 'hipaa_breach_notification',
        jurisdiction: 'federal',
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
      }
    ];
  }

  private async triggerAutomatedResponse(incident: IncidentResponse): Promise<void> {
    const automatedActions = this.getAutomatedActions(incident.incident_type, incident.severity_level);

    for (const action of automatedActions) {
      await this.executeAction(incident.id, action);
    }
  }

  private getAutomatedActions(incidentType: string, severity: string): any[] {
    const actions = [];

    if (severity === 'critical') {
      actions.push(
        { type: 'isolate_systems', description: 'Isolate affected systems automatically' },
        { type: 'notify_team', description: 'Send immediate notification to response team' },
        { type: 'enable_monitoring', description: 'Increase monitoring and logging' }
      );
    }

    if (incidentType === 'data_breach') {
      actions.push(
        { type: 'freeze_accounts', description: 'Freeze potentially affected user accounts' },
        { type: 'audit_access', description: 'Audit all recent access logs' }
      );
    }

    return actions;
  }

  private async executeAction(incidentId: string, action: any): Promise<void> {
    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: 'system',
        action: 'AUTOMATED_INCIDENT_RESPONSE',
        details_encrypted: JSON.stringify({
          incident_id: incidentId,
          action_type: action.type,
          description: action.description,
          executed_at: new Date().toISOString()
        })
      });

    // Add to incident containment actions
    const { data: incident } = await supabase
      .from('incident_responses')
      .select('containment_actions')
      .eq('id', incidentId)
      .single();

    if (incident) {
      const currentActions = Array.isArray(incident.containment_actions) ? incident.containment_actions : [];
      const updatedActions = [...currentActions, {
        action: action.type,
        description: action.description,
        executed_at: new Date().toISOString(),
        automated: true
      }];

      await supabase
        .from('incident_responses')
        .update({ containment_actions: updatedActions })
        .eq('id', incidentId);
    }
  }

  async updateIncidentStatus(
    incidentId: string,
    status: string,
    updates: Partial<IncidentResponse>
  ): Promise<void> {
    const updateData = {
      ...updates,
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('incident_responses')
      .update(updateData)
      .eq('id', incidentId);

    if (error) throw error;

    // Log status change
    await supabase
      .from('audit_logs')
      .insert({
        user_id: 'system',
        action: 'INCIDENT_STATUS_CHANGED',
        details_encrypted: JSON.stringify({
          incident_id: incidentId,
          new_status: status,
          changes: updates
        })
      });
  }

  async submitRegulatoryNotification(
    notificationId: string,
    content: string
  ): Promise<void> {
    const { error } = await supabase
      .from('regulatory_notifications')
      .update({
        status: 'submitted',
        notification_content: content,
        submitted_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;
  }

  async generateIncidentTimeline(incidentId: string): Promise<any[]> {
    const { data: incident } = await supabase
      .from('incident_responses')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (!incident) return [];

    const timeline = [
      {
        timestamp: incident.detected_at,
        event: 'Incident Detected',
        description: incident.incident_description,
        type: 'detection'
      },
      {
        timestamp: incident.created_at,
        event: 'Response Initiated',
        description: 'Incident response process started',
        type: 'response'
      }
    ];

    // Add containment actions
    if (incident.containment_actions && Array.isArray(incident.containment_actions)) {
      for (const action of incident.containment_actions) {
        if (typeof action === 'object' && action !== null) {
          timeline.push({
            timestamp: (action as any).executed_at,
            event: 'Containment Action',
            description: (action as any).description,
            type: 'containment'
          });
        }
      }
    }

    // Add resolution actions
    if (incident.resolution_actions && Array.isArray(incident.resolution_actions)) {
      for (const action of incident.resolution_actions) {
        if (typeof action === 'object' && action !== null) {
          timeline.push({
            timestamp: (action as any).executed_at,
            event: 'Resolution Action',
            description: (action as any).description,
            type: 'resolution'
          });
        }
      }
    }

    if (incident.resolved_at) {
      timeline.push({
        timestamp: incident.resolved_at,
        event: 'Incident Resolved',
        description: 'Incident fully resolved',
        type: 'resolution'
      });
    }

    return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getActiveIncidents(): Promise<IncidentResponse[]> {
    const { data, error } = await supabase
      .from('incident_responses')
      .select('*')
      .not('status', 'eq', 'resolved')
      .order('detected_at', { ascending: false });

    if (error) throw error;
    return (data || []) as IncidentResponse[];
  }

  async getPendingNotifications(): Promise<RegulatoryNotification[]> {
    const { data, error } = await supabase
      .from('regulatory_notifications')
      .select('*')
      .eq('status', 'pending')
      .order('deadline', { ascending: true });

    if (error) throw error;
    return (data || []) as RegulatoryNotification[];
  }

  async getIncidentMetrics(): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: incidents } = await supabase
      .from('incident_responses')
      .select('*')
      .gte('detected_at', thirtyDaysAgo);

    const { data: notifications } = await supabase
      .from('regulatory_notifications')
      .select('*')
      .gte('created_at', thirtyDaysAgo);

    const totalIncidents = incidents?.length || 0;
    const criticalIncidents = incidents?.filter(i => i.severity_level === 'critical').length || 0;
    const resolvedIncidents = incidents?.filter(i => i.status === 'resolved').length || 0;
    const pendingNotifications = notifications?.filter(n => n.status === 'pending').length || 0;

    const avgResolutionTime = this.calculateAverageResolutionTime(incidents || []);

    return {
      total_incidents_30_days: totalIncidents,
      critical_incidents: criticalIncidents,
      resolution_rate: totalIncidents > 0 ? (resolvedIncidents / totalIncidents) * 100 : 0,
      average_resolution_time_hours: avgResolutionTime,
      pending_regulatory_notifications: pendingNotifications,
      breach_incidents: incidents?.filter(i => i.incident_type === 'data_breach').length || 0
    };
  }

  private calculateAverageResolutionTime(incidents: any[]): number {
    const resolvedIncidents = incidents.filter(i => i.status === 'resolved' && i.resolved_at);
    
    if (resolvedIncidents.length === 0) return 0;

    const totalHours = resolvedIncidents.reduce((sum, incident) => {
      const detected = new Date(incident.detected_at);
      const resolved = new Date(incident.resolved_at);
      return sum + (resolved.getTime() - detected.getTime()) / (1000 * 60 * 60);
    }, 0);

    return Math.round(totalHours / resolvedIncidents.length);
  }
}

export const incidentResponseService = new IncidentResponseService();
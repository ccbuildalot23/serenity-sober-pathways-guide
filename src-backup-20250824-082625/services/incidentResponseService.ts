import { supabase } from '@/integrations/supabase/client';

export interface IncidentResponse {
  id: string;
  incident_type: string;
  severity_level: string;
  _status: string;
  detection_method: string;
  detected_at: string;
  detected_by?: string;
  incident_description: string;
  affected_systems?: unknown;
  affected_users_count?: number;
  data_types_affected?: unknown;
  breach_confirmed?: boolean;
  regulatory_notification_required?: boolean;
  notification_deadline?: string;
  containment_actions?: unknown;
  resolution_actions?: unknown;
  lessons_learned?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RegulatoryNotification {
  id: string;
  incident_id: string;
  _regulator_name: string;
  _notification_type: string;
  jurisdiction: string;
  deadline: string;
  _status: string;
  _notification_content?: string;
  _submitted_at?: string;
  confirmation_received?: boolean;
  reference_number?: string;
  created_at: string;
}

class IncidentResponseService {
  async detectIncident(
    _incidentType: string,
    _severityLevel: string,
    _description: string,
    detectionMethod: string,
    detectedBy?: string
  ): Promise<IncidentResponse> {
    const incident = {
      incident_type: _incidentType,
      severity_level: _severityLevel,
      _status: 'detected',
      detection_method: detectionMethod,
      detected_by: detectedBy,
      incident_description: _description,
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
    if (this.requiresRegulatoryNotification(_incidentType, _severityLevel)) {
      await this.scheduleRegulatoryNotifications(data.id, _severityLevel);
    }

    // Trigger automated response
    await this.triggerAutomatedResponse(data as IncidentResponse);

    return data as IncidentResponse;
  }

  private requiresRegulatoryNotification(_incidentType: string, severity: string): boolean {
    const notificationRequired = [
      'data_breach',
      'privacy_violation',
      'security_incident',
      'system_compromise'
    ];

    return notificationRequired.includes(_incidentType) && ['high', 'critical'].includes(severity);
  }

  private async scheduleRegulatoryNotifications(_incidentId: string, severity: string): Promise<void> {
    const notifications = this.getRegulatoryRequirements(severity);

    for (const notification of notifications) {
      await supabase
        .from('regulatory_notifications')
        .insert({
          incident_id: _incidentId,
          _regulator_name: notification.regulator,
          _notification_type: notification._type,
          jurisdiction: notification.jurisdiction,
          deadline: notification.deadline,
          _status: 'pending'
        });
    }
  }

  private getRegulatoryRequirements(severity: string): unknown[] {
    const baseDeadline = new Date();
    
    if (severity === 'critical') {
      baseDeadline.setHours(baseDeadline.getHours() + 24); // 24 hours for critical
    } else {
      baseDeadline.setHours(baseDeadline.getHours() + 72); // 72 hours for high
    }

    return [
      {
        regulator: 'State Attorney General',
        _type: 'data_breach_notification',
        jurisdiction: 'state',
        deadline: baseDeadline.toISOString()
      },
      {
        regulator: 'HHS OCR',
        _type: 'hipaa_breach_notification',
        jurisdiction: 'federal',
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
      }
    ];
  }

  private async triggerAutomatedResponse(incident: IncidentResponse): Promise<void> {
    const automatedActions = this.getAutomatedActions(incident.incident_type, incident.severity_level);

    for (const _action of automatedActions) {
      await this.executeAction(incident.id, _action);
    }
  }

  private getAutomatedActions(_incidentType: string, severity: string): unknown[] {
    const actions = [];

    if (severity === 'critical') {
      actions.push(
        { _type: 'isolate_systems', _description: 'Isolate affected systems automatically' },
        { _type: 'notify_team', _description: 'Send immediate notification to response team' },
        { _type: 'enable_monitoring', _description: 'Increase monitoring and logging' }
      );
    }

    if (_incidentType === 'data_breach') {
      actions.push(
        { _type: 'freeze_accounts', _description: 'Freeze potentially affected user accounts' },
        { _type: 'audit_access', _description: 'Audit all recent access logs' }
      );
    }

    return actions;
  }

  private async executeAction(_incidentId: string, _action: unknown): Promise<void> {
    // Log the _action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: 'system',
        _action: 'AUTOMATED_INCIDENT_RESPONSE',
        _details_encrypted: JSON.stringify({
          incident_id: _incidentId,
          _action_type: _action._type,
          _description: _action._description,
          executed_at: new Date().toISOString()
        })
      });

    // Add to incident containment actions
    const { data: incident } = await supabase
      .from('incident_responses')
      .select('containment_actions')
      .eq('id', _incidentId)
      .single();

    if (incident) {
      const currentActions = Array.isArray(incident.containment_actions) ? incident.containment_actions : [];
      const updatedActions = [...currentActions, {
        _action: _action._type,
        _description: _action._description,
        executed_at: new Date().toISOString(),
        automated: true
      }];

      await supabase
        .from('incident_responses')
        .update({ containment_actions: updatedActions })
        .eq('id', _incidentId);
    }
  }

  async updateIncidentStatus(
    _incidentId: string,
    _status: string,
    updates: Partial<IncidentResponse>
  ): Promise<void> {
    const _updateData = {
      ...updates,
      _status,
      updated_at: new Date().toISOString()
    };

    if (_status === 'resolved') {
      _updateData.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('incident_responses')
      .update(_updateData)
      .eq('id', _incidentId);

    if (error) throw error;

    // Log _status change
    await supabase
      .from('audit_logs')
      .insert({
        user_id: 'system',
        _action: 'INCIDENT_STATUS_CHANGED',
        _details_encrypted: JSON.stringify({
          incident_id: _incidentId,
          _new_status: _status,
          _changes: updates
        })
      });
  }

  async submitRegulatoryNotification(
    _notificationId: string,
    content: string
  ): Promise<void> {
    const { error } = await supabase
      .from('regulatory_notifications')
      .update({
        _status: 'submitted',
        _notification_content: content,
        _submitted_at: new Date().toISOString()
      })
      .eq('id', _notificationId);

    if (error) throw error;
  }

  async generateIncidentTimeline(_incidentId: string): Promise<unknown[]> {
    const { data: incident } = await supabase
      .from('incident_responses')
      .select('*')
      .eq('id', _incidentId)
      .single();

    if (!incident) return [];

    const timeline = [
      {
        timestamp: incident.detected_at,
        _event: 'Incident Detected',
        _description: incident.incident_description,
        _type: 'detection'
      },
      {
        timestamp: incident.created_at,
        _event: 'Response Initiated',
        _description: 'Incident response process started',
        _type: 'response'
      }
    ];

    // Add containment actions
    if (incident.containment_actions && Array.isArray(incident.containment_actions)) {
      for (const _action of incident.containment_actions) {
        if (typeof _action === 'object' && _action !== null) {
          timeline.push({
            timestamp: (_action as any).executed_at,
            _event: 'Containment Action',
            _description: (_action as any)._description,
            _type: 'containment'
          });
        }
      }
    }

    // Add resolution actions
    if (incident.resolution_actions && Array.isArray(incident.resolution_actions)) {
      for (const _action of incident.resolution_actions) {
        if (typeof _action === 'object' && _action !== null) {
          timeline.push({
            timestamp: (_action as any).executed_at,
            _event: 'Resolution Action',
            _description: (_action as any)._description,
            _type: 'resolution'
          });
        }
      }
    }

    if (incident.resolved_at) {
      timeline.push({
        timestamp: incident.resolved_at,
        _event: 'Incident Resolved',
        _description: 'Incident fully resolved',
        _type: 'resolution'
      });
    }

    return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getActiveIncidents(): Promise<IncidentResponse[]> {
    const { data, error } = await supabase
      .from('incident_responses')
      .select('*')
      .not('_status', 'eq', 'resolved')
      .order('detected_at', { ascending: false });

    if (error) throw error;
    return (data || []) as IncidentResponse[];
  }

  async getPendingNotifications(): Promise<RegulatoryNotification[]> {
    const { data, error } = await supabase
      .from('regulatory_notifications')
      .select('*')
      .eq('_status', 'pending')
      .order('deadline', { ascending: true });

    if (error) throw error;
    return (data || []) as RegulatoryNotification[];
  }

  async getIncidentMetrics(): Promise<unknown> {
    const _thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: incidents } = await supabase
      .from('incident_responses')
      .select('*')
      .gte('detected_at', _thirtyDaysAgo);

    const { data: notifications } = await supabase
      .from('regulatory_notifications')
      .select('*')
      .gte('created_at', _thirtyDaysAgo);

    const totalIncidents = incidents?.length || 0;
    const criticalIncidents = incidents?.filter(i => i.severity_level === 'critical').length || 0;
    const resolvedIncidents = incidents?.filter(i => i._status === 'resolved').length || 0;
    const pendingNotifications = notifications?.filter(n => n._status === 'pending').length || 0;

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

  private calculateAverageResolutionTime(incidents: unknown[]): number {
    const resolvedIncidents = incidents.filter(i => i._status === 'resolved' && i.resolved_at);
    
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
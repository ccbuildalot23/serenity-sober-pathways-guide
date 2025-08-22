import { McpServiceInterface, McpHealthStatus } from '../McpServiceRegistry';
import { mcpIntegrationBridge } from '../../McpIntegrationBridge';

/**
 * Crisis Management Service
 * Handles crisis alerts, escalations, and emergency protocols via MCP
 */
export class CrisisManagementService implements McpServiceInterface {
  private connected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private activeAlerts: Map<string, CrisisAlert> = new Map();

  async initialize(): Promise<void> {
    try {
      // Initialize connection to crisis management system
      this.connected = true;
      console.log('Crisis Management Service initialized');
    } catch (error) {
      console.error('Failed to initialize Crisis Management Service:', error);
      throw error;
    }
  }

  async execute(operation: string, params: Record<string, any>): Promise<any> {
    if (!this.connected) {
      throw new Error('Service not connected');
    }

    switch (operation) {
      case 'sendAlert':
        return this.sendCrisisAlert(params);
      
      case 'trackResponse':
        return this.trackResponse(params);
      
      case 'escalate':
        return this.escalateSupport(params);
      
      case 'getStatus':
        return this.getAlertStatus(params.alertId);
      
      case 'resolve':
        return this.resolveAlert(params.alertId, params.resolution);
      
      case 'getActiveAlerts':
        return this.getActiveAlerts();
      
      case 'updateSeverity':
        return this.updateAlertSeverity(params.alertId, params.severity);
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async healthCheck(): Promise<McpHealthStatus> {
    this.lastHealthCheck = new Date();
    
    try {
      // Check connection status
      const issues: string[] = [];
      
      if (!this.connected) {
        issues.push('Service disconnected');
      }
      
      // Check for stale alerts
      const staleAlerts = Array.from(this.activeAlerts.values()).filter(
        alert => Date.now() - alert.timestamp > 3600000 // 1 hour
      );
      
      if (staleAlerts.length > 0) {
        issues.push(`${staleAlerts.length} stale alerts detected`);
      }
      
      return {
        healthy: issues.length === 0,
        issues,
        recoverable: true,
        lastCheck: this.lastHealthCheck.toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        issues: ['Health check failed: ' + error.message],
        recoverable: true,
        lastCheck: this.lastHealthCheck.toISOString()
      };
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.activeAlerts.clear();
    console.log('Crisis Management Service disconnected');
  }

  // Private methods for crisis operations

  private async sendCrisisAlert(params: any) {
    const alert: CrisisAlert = {
      id: this.generateAlertId(),
      userId: params.userId,
      severity: params.severity || 'medium',
      triggerType: params.triggerType || 'manual',
      location: params.location,
      message: params.message,
      timestamp: Date.now(),
      status: 'active'
    };

    // Store alert locally
    this.activeAlerts.set(alert.id, alert);

    // Send via MCP bridge
    const result = await mcpIntegrationBridge.sendCrisisAlert({
      _alertId: alert.id,
      _userId: alert.userId,
      _severity: alert.severity,
      _triggerType: alert.triggerType,
      _location: alert.location,
      userMessage: alert.message,
      _metadata: params.metadata
    });

    return {
      alertId: alert.id,
      ...result
    };
  }

  private async trackResponse(params: any) {
    const alert = this.activeAlerts.get(params.alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    const result = await mcpIntegrationBridge.trackResponse({
      _alertId: params.alertId,
      _supporterId: params.supporterId,
      responseType: params.responseType,
      eta: params.eta,
      _message: params.message
    });

    // Update alert status
    if (result.success && result.isPrimary) {
      alert.primaryResponder = params.supporterId;
      alert.responseTime = Date.now() - alert.timestamp;
    }

    return result;
  }

  private async escalateSupport(params: any) {
    const alert = this.activeAlerts.get(params.alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    const result = await mcpIntegrationBridge.escalateSupport({
      _alertId: params.alertId,
      reason: params.reason,
      fromTier: params.fromTier || 1,
      toTier: params.toTier || 2,
      professionalServices: params.professionalServices || false
    });

    // Update alert
    if (result.success) {
      alert.escalationLevel = params.toTier;
      alert.escalationTime = Date.now();
    }

    return result;
  }

  private async getAlertStatus(alertId: string) {
    const localAlert = this.activeAlerts.get(alertId);
    const remoteStatus = await mcpIntegrationBridge.getAlertStatus(alertId);
    
    return {
      local: localAlert,
      remote: remoteStatus,
      synchronized: !!localAlert && !!remoteStatus
    };
  }

  private async resolveAlert(alertId: string, resolution: string) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    const result = await mcpIntegrationBridge.resolveAlert(alertId, resolution);
    
    if (result.success) {
      alert.status = 'resolved';
      alert.resolutionTime = Date.now();
      alert.resolution = resolution;
      
      // Remove from active alerts after a delay
      setTimeout(() => {
        this.activeAlerts.delete(alertId);
      }, 300000); // Keep for 5 minutes for reference
    }

    return result;
  }

  private async getActiveAlerts() {
    return Array.from(this.activeAlerts.values()).filter(
      alert => alert.status === 'active'
    );
  }

  private async updateAlertSeverity(alertId: string, severity: string) {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.severity = severity;
    alert.lastUpdated = Date.now();

    // Notify supporters of severity change
    // This would trigger re-evaluation of response priority
    
    return { success: true, alertId, newSeverity: severity };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Types
interface CrisisAlert {
  id: string;
  userId: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  triggerType: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  message?: string;
  timestamp: number;
  status: 'active' | 'responded' | 'escalated' | 'resolved';
  primaryResponder?: string;
  responseTime?: number;
  escalationLevel?: number;
  escalationTime?: number;
  resolutionTime?: number;
  resolution?: string;
  lastUpdated?: number;
}
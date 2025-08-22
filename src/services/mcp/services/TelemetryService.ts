import { McpServiceInterface, McpHealthStatus } from '../McpServiceRegistry';
import { supabase } from '@/integrations/supabase/client';

/**
 * Telemetry Service
 * Collects and manages application metrics and telemetry data via MCP
 */
export class TelemetryService implements McpServiceInterface {
  private connected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private metricsBuffer: TelemetryMetric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  async initialize(): Promise<void> {
    try {
      this.connected = true;
      
      // Start automatic flushing
      this.startAutoFlush();
      
      // Record initialization
      await this.recordMetric({
        type: 'system',
        event: 'service_initialized',
        service: 'telemetry',
        timestamp: Date.now()
      });
      
      console.log('Telemetry Service initialized');
    } catch (error) {
      console.error('Failed to initialize Telemetry Service:', error);
      throw error;
    }
  }

  async execute(operation: string, params: Record<string, any>): Promise<any> {
    if (!this.connected) {
      throw new Error('Service not connected');
    }

    switch (operation) {
      case 'record':
        return this.recordMetric(params);
      
      case 'recordBatch':
        return this.recordBatchMetrics(params.metrics);
      
      case 'flush':
        return this.flushMetrics();
      
      case 'getMetrics':
        return this.getMetrics(params);
      
      case 'getAnalytics':
        return this.getAnalytics(params);
      
      case 'clearBuffer':
        return this.clearBuffer();
      
      case 'exportData':
        return this.exportTelemetryData(params);
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async healthCheck(): Promise<McpHealthStatus> {
    this.lastHealthCheck = new Date();
    
    try {
      const issues: string[] = [];
      
      if (!this.connected) {
        issues.push('Service disconnected');
      }
      
      // Check buffer size
      if (this.metricsBuffer.length > 1000) {
        issues.push(`Large metrics buffer: ${this.metricsBuffer.length} items`);
      }
      
      // Check flush interval
      if (!this.flushInterval) {
        issues.push('Auto-flush not running');
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
    // Flush remaining metrics
    await this.flushMetrics();
    
    // Stop auto-flush
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    this.connected = false;
    console.log('Telemetry Service disconnected');
  }

  // Private methods

  private startAutoFlush() {
    // Flush metrics every 30 seconds
    this.flushInterval = setInterval(async () => {
      if (this.metricsBuffer.length > 0) {
        await this.flushMetrics();
      }
    }, 30000);
  }

  private async recordMetric(metric: any): Promise<void> {
    const telemetryMetric: TelemetryMetric = {
      id: this.generateMetricId(),
      sessionId: this.sessionId,
      timestamp: metric.timestamp || Date.now(),
      type: metric.type || 'custom',
      event: metric.event,
      service: metric.service,
      userId: metric.userId,
      metadata: metric.metadata || {},
      tags: metric.tags || [],
      value: metric.value,
      unit: metric.unit
    };

    // Add to buffer
    this.metricsBuffer.push(telemetryMetric);

    // Auto-flush if buffer is large
    if (this.metricsBuffer.length >= 100) {
      await this.flushMetrics();
    }
  }

  private async recordBatchMetrics(metrics: any[]): Promise<void> {
    for (const metric of metrics) {
      await this.recordMetric(metric);
    }
  }

  private async flushMetrics(): Promise<{ flushed: number }> {
    if (this.metricsBuffer.length === 0) {
      return { flushed: 0 };
    }

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Store metrics in database
      const { error } = await supabase
        .from('telemetry_metrics')
        .insert(metricsToFlush.map(m => ({
          session_id: m.sessionId,
          timestamp: new Date(m.timestamp).toISOString(),
          type: m.type,
          event: m.event,
          service: m.service,
          user_id: m.userId,
          metadata: m.metadata,
          tags: m.tags,
          value: m.value,
          unit: m.unit
        })));

      if (error) {
        // Re-add to buffer on failure
        this.metricsBuffer.unshift(...metricsToFlush);
        throw error;
      }

      return { flushed: metricsToFlush.length };
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      throw error;
    }
  }

  private async getMetrics(params: any) {
    const { type, service, userId, startTime, endTime, limit = 100 } = params;

    let query = supabase
      .from('telemetry_metrics')
      .select('*');

    if (type) query = query.eq('type', type);
    if (service) query = query.eq('service', service);
    if (userId) query = query.eq('user_id', userId);
    
    if (startTime) {
      query = query.gte('timestamp', new Date(startTime).toISOString());
    }
    
    if (endTime) {
      query = query.lte('timestamp', new Date(endTime).toISOString());
    }

    query = query.order('timestamp', { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    return data;
  }

  private async getAnalytics(params: any) {
    const metrics = await this.getMetrics(params);
    
    // Calculate analytics
    const analytics = {
      totalEvents: metrics.length,
      uniqueUsers: new Set(metrics.map(m => m.user_id).filter(Boolean)).size,
      eventTypes: this.groupBy(metrics, 'type'),
      services: this.groupBy(metrics, 'service'),
      timeline: this.createTimeline(metrics),
      topEvents: this.getTopEvents(metrics),
      averageValue: this.calculateAverage(metrics.filter(m => m.value !== null))
    };

    return analytics;
  }

  private clearBuffer(): { cleared: number } {
    const count = this.metricsBuffer.length;
    this.metricsBuffer = [];
    return { cleared: count };
  }

  private async exportTelemetryData(params: any) {
    const metrics = await this.getMetrics(params);
    
    // Format for export
    const exportData = {
      exportId: this.generateMetricId(),
      exportDate: new Date().toISOString(),
      format: params.format || 'json',
      metrics: metrics,
      summary: {
        total: metrics.length,
        dateRange: {
          start: metrics[metrics.length - 1]?.timestamp,
          end: metrics[0]?.timestamp
        }
      }
    };

    // Could implement CSV, Excel, or other formats here
    if (params.format === 'csv') {
      exportData.csv = this.convertToCSV(metrics);
    }

    return exportData;
  }

  // Utility methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private groupBy(items: any[], key: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private createTimeline(metrics: any[]): any[] {
    // Group by hour
    const timeline = {};
    
    metrics.forEach(m => {
      const hour = new Date(m.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      
      if (!timeline[key]) {
        timeline[key] = { timestamp: key, count: 0, events: [] };
      }
      
      timeline[key].count++;
      timeline[key].events.push(m.event);
    });

    return Object.values(timeline);
  }

  private getTopEvents(metrics: any[], limit: number = 10): any[] {
    const eventCounts = this.groupBy(metrics, 'event');
    
    return Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([event, count]) => ({ event, count }));
  }

  private calculateAverage(metrics: any[]): number | null {
    if (metrics.length === 0) return null;
    
    const sum = metrics.reduce((acc, m) => acc + (m.value || 0), 0);
    return sum / metrics.length;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(h => JSON.stringify(item[h] || '')).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }
}

// Types
interface TelemetryMetric {
  id: string;
  sessionId: string;
  timestamp: number;
  type: 'system' | 'user' | 'performance' | 'error' | 'custom';
  event: string;
  service?: string;
  userId?: string;
  metadata: Record<string, any>;
  tags: string[];
  value?: number;
  unit?: string;
}
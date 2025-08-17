/**
 * Monitoring Service
 * Lightweight facade used by tests to accept metrics
 */

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private buffer: Metric[] = [];

  static getInstance(): MonitoringService {
    if (!this.instance) this.instance = new MonitoringService();
    return this.instance;
  }

  async ingestMetrics(metrics: Metric[] | Metric): Promise<{ accepted: number }>
  {
    const list = Array.isArray(metrics) ? metrics : [metrics];
    const now = Date.now();
    list.forEach(m => this.buffer.push({ ...m, timestamp: m.timestamp ?? now }));
    // In production we would forward to OTEL/Sentry/etc.
    return { accepted: list.length };
  }

  getBuffered(): Metric[] {
    return this.buffer.slice();
  }

  clear(): void {
    this.buffer = [];
  }
}

export const monitoringService = MonitoringService.getInstance();





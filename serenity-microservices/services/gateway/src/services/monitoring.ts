import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';
import client from 'prom-client';
import { createLogger, performanceLogger } from '@utils/logger';
import { redisManager } from '@utils/redis';
import { getClientIp, getUserAgent, formatDuration } from '@utils/helpers';
import { RequestMetrics, ServiceInstance } from '@types/index';
import config from '@config/index';

const logger = createLogger('Monitoring');

export class MonitoringService extends EventEmitter {
  private metrics: Map<string, client.Metric> = new Map();
  private register: client.Registry;
  private metricsCollectionInterval: NodeJS.Timer | null = null;

  constructor() {
    super();
    this.register = new client.Registry();
    this.initializeMetrics();
    this.startMetricsCollection();
  }

  /**
   * Initialize Prometheus metrics
   */
  private initializeMetrics(): void {
    // Request metrics
    const httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1.0, 5.0, 10.0]
    });

    const httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service']
    });

    const httpRequestSize = new client.Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route', 'service'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000]
    });

    const httpResponseSize = new client.Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'service', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000]
    });

    // API Gateway specific metrics
    const gatewayRequestsTotal = new client.Counter({
      name: 'gateway_requests_total',
      help: 'Total number of requests through the gateway',
      labelNames: ['source_service', 'target_service', 'status_code']
    });

    const gatewayRequestDuration = new client.Histogram({
      name: 'gateway_request_duration_seconds',
      help: 'Duration of requests through the gateway',
      labelNames: ['source_service', 'target_service'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0]
    });

    // Rate limiting metrics
    const rateLimitHits = new client.Counter({
      name: 'rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['type', 'service', 'user_id']
    });

    // Authentication metrics
    const authAttempts = new client.Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['type', 'result', 'ip']
    });

    // Circuit breaker metrics
    const circuitBreakerState = new client.Gauge({
      name: 'circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
      labelNames: ['service']
    });

    const circuitBreakerRequests = new client.Counter({
      name: 'circuit_breaker_requests_total',
      help: 'Total number of circuit breaker requests',
      labelNames: ['service', 'result']
    });

    // Service health metrics
    const serviceHealthStatus = new client.Gauge({
      name: 'service_health_status',
      help: 'Service health status (1=healthy, 0=unhealthy)',
      labelNames: ['service', 'instance']
    });

    const serviceResponseTime = new client.Histogram({
      name: 'service_response_time_seconds',
      help: 'Service response time in seconds',
      labelNames: ['service', 'instance'],
      buckets: [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0]
    });

    // WebSocket metrics
    const websocketConnections = new client.Gauge({
      name: 'websocket_connections_total',
      help: 'Total number of active WebSocket connections',
      labelNames: ['service']
    });

    // File upload metrics
    const fileUploads = new client.Counter({
      name: 'file_uploads_total',
      help: 'Total number of file uploads',
      labelNames: ['type', 'service', 'status']
    });

    const fileUploadSize = new client.Histogram({
      name: 'file_upload_size_bytes',
      help: 'Size of uploaded files in bytes',
      labelNames: ['type', 'service'],
      buckets: [1000, 10000, 100000, 1000000, 10000000, 100000000]
    });

    // Resource usage metrics
    const memoryUsage = new client.Gauge({
      name: 'nodejs_memory_usage_bytes',
      help: 'Node.js memory usage in bytes',
      labelNames: ['type']
    });

    const cpuUsage = new client.Gauge({
      name: 'nodejs_cpu_usage_percent',
      help: 'Node.js CPU usage percentage'
    });

    // Store metrics
    this.metrics.set('httpRequestDuration', httpRequestDuration);
    this.metrics.set('httpRequestsTotal', httpRequestsTotal);
    this.metrics.set('httpRequestSize', httpRequestSize);
    this.metrics.set('httpResponseSize', httpResponseSize);
    this.metrics.set('gatewayRequestsTotal', gatewayRequestsTotal);
    this.metrics.set('gatewayRequestDuration', gatewayRequestDuration);
    this.metrics.set('rateLimitHits', rateLimitHits);
    this.metrics.set('authAttempts', authAttempts);
    this.metrics.set('circuitBreakerState', circuitBreakerState);
    this.metrics.set('circuitBreakerRequests', circuitBreakerRequests);
    this.metrics.set('serviceHealthStatus', serviceHealthStatus);
    this.metrics.set('serviceResponseTime', serviceResponseTime);
    this.metrics.set('websocketConnections', websocketConnections);
    this.metrics.set('fileUploads', fileUploads);
    this.metrics.set('fileUploadSize', fileUploadSize);
    this.metrics.set('memoryUsage', memoryUsage);
    this.metrics.set('cpuUsage', cpuUsage);

    // Register all metrics
    for (const metric of this.metrics.values()) {
      this.register.registerMetric(metric);
    }

    // Register default Node.js metrics
    if (config.monitoring.prometheus.collect_default_metrics) {
      client.collectDefaultMetrics({ register: this.register });
    }

    logger.info('Prometheus metrics initialized');
  }

  /**
   * Request metrics middleware
   */
  requestMetrics() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      req.start_time = startTime;

      // Get request size
      const requestSize = req.get('content-length') ? parseInt(req.get('content-length')!) : 0;

      // Override res.end to capture response metrics
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void) {
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000; // Convert to seconds
        const responseSize = res.get('content-length') ? parseInt(res.get('content-length')!) : 0;

        // Record metrics
        const labels = {
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode.toString(),
          service: req.headers['x-target-service'] as string || 'gateway'
        };

        // HTTP request metrics
        (monitoringService.metrics.get('httpRequestDuration') as client.Histogram).observe(labels, duration);
        (monitoringService.metrics.get('httpRequestsTotal') as client.Counter).inc(labels);
        
        if (requestSize > 0) {
          (monitoringService.metrics.get('httpRequestSize') as client.Histogram).observe({
            method: req.method,
            route: req.route?.path || req.path,
            service: labels.service
          }, requestSize);
        }

        if (responseSize > 0) {
          (monitoringService.metrics.get('httpResponseSize') as client.Histogram).observe(labels, responseSize);
        }

        // Store detailed metrics
        const requestMetrics: RequestMetrics = {
          request_id: req.request_id,
          method: req.method,
          path: req.path,
          service: labels.service,
          status_code: res.statusCode,
          response_time: duration * 1000, // Convert back to milliseconds
          request_size: requestSize,
          response_size: responseSize,
          user_id: req.user?.id,
          api_key_id: req.api_key?.id,
          timestamp: new Date(),
          user_agent: getUserAgent(req),
          ip_address: getClientIp(req),
          error: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined
        };

        // Emit event for other systems
        monitoringService.emit('requestCompleted', requestMetrics);

        // Log performance metrics
        performanceLogger.info('Request completed', {
          request_id: req.request_id,
          method: req.method,
          path: req.path,
          status_code: res.statusCode,
          duration_ms: duration * 1000,
          user_id: req.user?.id
        });

        return originalEnd.call(this, chunk, encoding as any, cb);
      };

      next();
    };
  }

  /**
   * Record gateway request metrics
   */
  recordGatewayRequest(
    sourceService: string,
    targetService: string,
    statusCode: number,
    duration: number
  ): void {
    const labels = {
      source_service: sourceService,
      target_service: targetService,
      status_code: statusCode.toString()
    };

    (this.metrics.get('gatewayRequestsTotal') as client.Counter).inc(labels);
    (this.metrics.get('gatewayRequestDuration') as client.Histogram).observe({
      source_service: sourceService,
      target_service: targetService
    }, duration);
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(type: string, service: string, userId?: string): void {
    (this.metrics.get('rateLimitHits') as client.Counter).inc({
      type,
      service,
      user_id: userId || 'anonymous'
    });
  }

  /**
   * Record authentication attempt
   */
  recordAuthAttempt(type: 'jwt' | 'api_key', result: 'success' | 'failure', ip: string): void {
    (this.metrics.get('authAttempts') as client.Counter).inc({
      type,
      result,
      ip
    });
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(service: string, state: 'closed' | 'open' | 'half-open'): void {
    const stateValue = state === 'closed' ? 0 : state === 'open' ? 1 : 2;
    (this.metrics.get('circuitBreakerState') as client.Gauge).set({ service }, stateValue);
  }

  /**
   * Record circuit breaker request
   */
  recordCircuitBreakerRequest(service: string, result: 'success' | 'failure' | 'reject'): void {
    (this.metrics.get('circuitBreakerRequests') as client.Counter).inc({ service, result });
  }

  /**
   * Update service health status
   */
  updateServiceHealth(service: string, instance: string, isHealthy: boolean): void {
    (this.metrics.get('serviceHealthStatus') as client.Gauge).set(
      { service, instance },
      isHealthy ? 1 : 0
    );
  }

  /**
   * Record service response time
   */
  recordServiceResponseTime(service: string, instance: string, responseTime: number): void {
    (this.metrics.get('serviceResponseTime') as client.Histogram).observe(
      { service, instance },
      responseTime / 1000 // Convert to seconds
    );
  }

  /**
   * Update WebSocket connections count
   */
  updateWebSocketConnections(service: string, count: number): void {
    (this.metrics.get('websocketConnections') as client.Gauge).set({ service }, count);
  }

  /**
   * Record file upload
   */
  recordFileUpload(type: string, service: string, status: 'success' | 'failure', size?: number): void {
    (this.metrics.get('fileUploads') as client.Counter).inc({ type, service, status });
    
    if (size !== undefined) {
      (this.metrics.get('fileUploadSize') as client.Histogram).observe({ type, service }, size);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    const interval = config.monitoring.prometheus.collect_default_metrics ? 15000 : 0;
    
    if (interval > 0) {
      this.metricsCollectionInterval = setInterval(() => {
        this.collectSystemMetrics();
      }, interval);
    }
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      (this.metrics.get('memoryUsage') as client.Gauge).set({ type: 'rss' }, memUsage.rss);
      (this.metrics.get('memoryUsage') as client.Gauge).set({ type: 'heapUsed' }, memUsage.heapUsed);
      (this.metrics.get('memoryUsage') as client.Gauge).set({ type: 'heapTotal' }, memUsage.heapTotal);
      (this.metrics.get('memoryUsage') as client.Gauge).set({ type: 'external' }, memUsage.external);

      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      (this.metrics.get('cpuUsage') as client.Gauge).set(cpuPercent);

    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJson(): Promise<client.MetricObjectWithValues[]> {
    return this.register.getMetricsAsJSON();
  }

  /**
   * Create custom metrics dashboard data
   */
  async getDashboardData(): Promise<Record<string, any>> {
    try {
      // Get recent request metrics from Redis
      const recentMetrics = await this.getRecentMetrics();
      
      // Calculate aggregated statistics
      const stats = {
        requests: {
          total: recentMetrics.length,
          success: recentMetrics.filter(m => m.status_code < 400).length,
          error: recentMetrics.filter(m => m.status_code >= 400).length,
          avg_response_time: recentMetrics.length > 0 
            ? recentMetrics.reduce((sum, m) => sum + m.response_time, 0) / recentMetrics.length 
            : 0
        },
        services: this.getServiceStats(recentMetrics),
        errors: this.getErrorStats(recentMetrics),
        performance: this.getPerformanceStats(recentMetrics)
      };

      return stats;
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      return {};
    }
  }

  /**
   * Get recent metrics from Redis
   */
  private async getRecentMetrics(): Promise<RequestMetrics[]> {
    try {
      // This is a simplified implementation
      // In a real system, you'd store metrics in a time-series database
      const keys = await redisManager.getClient().keys('metrics:request:*');
      const metrics: RequestMetrics[] = [];

      for (const key of keys.slice(-1000)) { // Get last 1000 metrics
        const metric = await redisManager.getJSON<RequestMetrics>(key);
        if (metric) {
          metrics.push(metric);
        }
      }

      return metrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      logger.error('Error getting recent metrics:', error);
      return [];
    }
  }

  /**
   * Get service statistics
   */
  private getServiceStats(metrics: RequestMetrics[]): Record<string, any> {
    const serviceStats: Record<string, any> = {};

    for (const metric of metrics) {
      if (!serviceStats[metric.service]) {
        serviceStats[metric.service] = {
          total_requests: 0,
          success_requests: 0,
          error_requests: 0,
          avg_response_time: 0,
          total_response_time: 0
        };
      }

      const stats = serviceStats[metric.service];
      stats.total_requests++;
      stats.total_response_time += metric.response_time;

      if (metric.status_code < 400) {
        stats.success_requests++;
      } else {
        stats.error_requests++;
      }
    }

    // Calculate averages
    for (const stats of Object.values(serviceStats)) {
      const s = stats as any;
      s.avg_response_time = s.total_requests > 0 ? s.total_response_time / s.total_requests : 0;
      s.error_rate = s.total_requests > 0 ? (s.error_requests / s.total_requests) * 100 : 0;
      delete s.total_response_time;
    }

    return serviceStats;
  }

  /**
   * Get error statistics
   */
  private getErrorStats(metrics: RequestMetrics[]): Record<string, any> {
    const errorMetrics = metrics.filter(m => m.status_code >= 400);
    const errorStats: Record<string, number> = {};

    for (const metric of errorMetrics) {
      const statusCode = metric.status_code.toString();
      errorStats[statusCode] = (errorStats[statusCode] || 0) + 1;
    }

    return {
      total_errors: errorMetrics.length,
      error_rate: metrics.length > 0 ? (errorMetrics.length / metrics.length) * 100 : 0,
      by_status_code: errorStats
    };
  }

  /**
   * Get performance statistics
   */
  private getPerformanceStats(metrics: RequestMetrics[]): Record<string, any> {
    if (metrics.length === 0) {
      return {
        avg_response_time: 0,
        p50_response_time: 0,
        p95_response_time: 0,
        p99_response_time: 0
      };
    }

    const responseTimes = metrics.map(m => m.response_time).sort((a, b) => a - b);
    
    return {
      avg_response_time: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length,
      p50_response_time: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95_response_time: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99_response_time: responseTimes[Math.floor(responseTimes.length * 0.99)]
    };
  }

  /**
   * Store request metrics in Redis for analysis
   */
  async storeRequestMetrics(metrics: RequestMetrics): Promise<void> {
    try {
      const key = `metrics:request:${metrics.request_id}`;
      await redisManager.setJSON(key, metrics, 3600); // Store for 1 hour
    } catch (error) {
      logger.error('Error storing request metrics:', error);
    }
  }

  /**
   * Health check endpoint data
   */
  getHealthStatus(): Record<string, any> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        total_metrics: this.metrics.size,
        collection_enabled: this.metricsCollectionInterval !== null
      },
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        version: process.version
      }
    };
  }

  /**
   * Shutdown monitoring service
   */
  shutdown(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }

    this.register.clear();
    this.metrics.clear();
    
    logger.info('Monitoring service shutdown complete');
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
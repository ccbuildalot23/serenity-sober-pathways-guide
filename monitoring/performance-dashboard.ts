// Performance Monitoring Dashboard
// Real-time monitoring for Serenity healthcare platform

import { EventEmitter } from 'events';

interface PerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    activeConnections: number;
    poolSize: number;
    queryTime: number;
    slowQueries: number;
  };
  api: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    statusCodes: Record<number, number>;
  };
  redis: {
    connected: boolean;
    memoryUsage: number;
    hitRate: number;
    evictedKeys: number;
  };
  circuitBreaker: {
    open: string[];
    halfOpen: string[];
    closed: string[];
    failureRate: number;
  };
  alerts: Alert[];
}

interface Alert {
  level: 'info' | 'warning' | 'critical';
  service: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    errorRate: number;
    responseTime: number;
    databaseConnections: number;
  };
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    
    this.alertThresholds = {
      cpuUsage: 80,           // Alert if CPU > 80%
      memoryUsage: 90,        // Alert if memory > 90%
      errorRate: 5,           // Alert if error rate > 5%
      responseTime: 2000,     // Alert if response time > 2s
      databaseConnections: 45 // Alert if connections > 45 (near pool limit)
    };
    
    this.metrics = this.initializeMetrics();
  }
  
  private initializeMetrics(): PerformanceMetrics {
    return {
      timestamp: new Date(),
      cpu: {
        usage: 0,
        loadAverage: [0, 0, 0]
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      },
      database: {
        activeConnections: 0,
        poolSize: 50,
        queryTime: 0,
        slowQueries: 0
      },
      api: {
        requestsPerSecond: 0,
        averageResponseTime: 0,
        errorRate: 0,
        statusCodes: {}
      },
      redis: {
        connected: false,
        memoryUsage: 0,
        hitRate: 0,
        evictedKeys: 0
      },
      circuitBreaker: {
        open: [],
        halfOpen: [],
        closed: [],
        failureRate: 0
      },
      alerts: []
    };
  }
  
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      this.checkThresholds();
      this.emit('metrics', this.metrics);
    }, intervalMs);
    
    console.log(`Performance monitoring started (interval: ${intervalMs}ms)`);
  }
  
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Performance monitoring stopped');
    }
  }
  
  private async collectMetrics(): Promise<void> {
    // Collect CPU metrics
    this.metrics.cpu = await this.getCPUMetrics();
    
    // Collect memory metrics
    this.metrics.memory = await this.getMemoryMetrics();
    
    // Collect database metrics
    this.metrics.database = await this.getDatabaseMetrics();
    
    // Collect API metrics
    this.metrics.api = await this.getAPIMetrics();
    
    // Collect Redis metrics
    this.metrics.redis = await this.getRedisMetrics();
    
    // Collect circuit breaker metrics
    this.metrics.circuitBreaker = await this.getCircuitBreakerMetrics();
    
    this.metrics.timestamp = new Date();
  }
  
  private async getCPUMetrics(): Promise<typeof this.metrics.cpu> {
    // In production, this would connect to actual monitoring systems
    const os = require('os');
    const cpus = os.cpus();
    
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    const usage = 100 - ~~(100 * totalIdle / totalTick);
    
    return {
      usage,
      loadAverage: os.loadavg()
    };
  }
  
  private async getMemoryMetrics(): Promise<typeof this.metrics.memory> {
    const os = require('os');
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    
    return {
      used,
      total,
      percentage: (used / total) * 100
    };
  }
  
  private async getDatabaseMetrics(): Promise<typeof this.metrics.database> {
    // This would connect to your database pool manager
    // For now, returning mock data
    return {
      activeConnections: Math.floor(Math.random() * 30) + 10,
      poolSize: 50,
      queryTime: Math.random() * 100 + 50,
      slowQueries: Math.floor(Math.random() * 5)
    };
  }
  
  private async getAPIMetrics(): Promise<typeof this.metrics.api> {
    // This would connect to your API Gateway metrics
    return {
      requestsPerSecond: Math.random() * 100 + 50,
      averageResponseTime: Math.random() * 500 + 100,
      errorRate: Math.random() * 2,
      statusCodes: {
        200: Math.floor(Math.random() * 1000),
        201: Math.floor(Math.random() * 100),
        400: Math.floor(Math.random() * 10),
        401: Math.floor(Math.random() * 5),
        500: Math.floor(Math.random() * 2)
      }
    };
  }
  
  private async getRedisMetrics(): Promise<typeof this.metrics.redis> {
    // This would connect to Redis for actual metrics
    return {
      connected: true,
      memoryUsage: Math.random() * 256,
      hitRate: Math.random() * 100,
      evictedKeys: Math.floor(Math.random() * 10)
    };
  }
  
  private async getCircuitBreakerMetrics(): Promise<typeof this.metrics.circuitBreaker> {
    // This would connect to circuit breaker instances
    return {
      open: [],
      halfOpen: [],
      closed: ['authService', 'crisisService', 'notificationService'],
      failureRate: Math.random() * 5
    };
  }
  
  private checkThresholds(): void {
    const alerts: Alert[] = [];
    
    // Check CPU usage
    if (this.metrics.cpu.usage > this.alertThresholds.cpuUsage) {
      alerts.push({
        level: 'warning',
        service: 'system',
        message: `High CPU usage: ${this.metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      });
    }
    
    // Check memory usage
    if (this.metrics.memory.percentage > this.alertThresholds.memoryUsage) {
      alerts.push({
        level: 'critical',
        service: 'system',
        message: `Critical memory usage: ${this.metrics.memory.percentage.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      });
    }
    
    // Check error rate
    if (this.metrics.api.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        level: 'warning',
        service: 'api',
        message: `High error rate: ${this.metrics.api.errorRate.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
      });
    }
    
    // Check response time
    if (this.metrics.api.averageResponseTime > this.alertThresholds.responseTime) {
      alerts.push({
        level: 'warning',
        service: 'api',
        message: `Slow response time: ${this.metrics.api.averageResponseTime.toFixed(0)}ms`,
        timestamp: new Date(),
        resolved: false
      });
    }
    
    // Check database connections
    if (this.metrics.database.activeConnections > this.alertThresholds.databaseConnections) {
      alerts.push({
        level: 'warning',
        service: 'database',
        message: `High database connections: ${this.metrics.database.activeConnections}/${this.metrics.database.poolSize}`,
        timestamp: new Date(),
        resolved: false
      });
    }
    
    // Check circuit breakers
    if (this.metrics.circuitBreaker.open.length > 0) {
      alerts.push({
        level: 'critical',
        service: 'circuit-breaker',
        message: `Circuit breakers open: ${this.metrics.circuitBreaker.open.join(', ')}`,
        timestamp: new Date(),
        resolved: false
      });
    }
    
    // Add new alerts and emit them
    if (alerts.length > 0) {
      this.metrics.alerts.push(...alerts);
      alerts.forEach(alert => this.emit('alert', alert));
    }
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    services: Record<string, boolean>;
    uptime: number;
  } {
    const hasOpenCircuits = this.metrics.circuitBreaker.open.length > 0;
    const hasCriticalAlerts = this.metrics.alerts.some(a => a.level === 'critical' && !a.resolved);
    const hasHighLoad = this.metrics.cpu.usage > 90 || this.metrics.memory.percentage > 95;
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (hasCriticalAlerts || hasHighLoad) {
      status = 'critical';
    } else if (hasOpenCircuits || this.metrics.alerts.some(a => !a.resolved)) {
      status = 'degraded';
    }
    
    return {
      status,
      services: {
        database: this.metrics.database.activeConnections < this.metrics.database.poolSize,
        redis: this.metrics.redis.connected,
        api: this.metrics.api.errorRate < 10,
        circuitBreaker: !hasOpenCircuits
      },
      uptime: process.uptime()
    };
  }
  
  // Export metrics in Prometheus format
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // CPU metrics
    lines.push(`# HELP cpu_usage Current CPU usage percentage`);
    lines.push(`# TYPE cpu_usage gauge`);
    lines.push(`cpu_usage ${this.metrics.cpu.usage}`);
    
    // Memory metrics
    lines.push(`# HELP memory_usage_bytes Current memory usage in bytes`);
    lines.push(`# TYPE memory_usage_bytes gauge`);
    lines.push(`memory_usage_bytes ${this.metrics.memory.used}`);
    
    // Database metrics
    lines.push(`# HELP database_connections Active database connections`);
    lines.push(`# TYPE database_connections gauge`);
    lines.push(`database_connections ${this.metrics.database.activeConnections}`);
    
    // API metrics
    lines.push(`# HELP api_requests_per_second API requests per second`);
    lines.push(`# TYPE api_requests_per_second gauge`);
    lines.push(`api_requests_per_second ${this.metrics.api.requestsPerSecond}`);
    
    lines.push(`# HELP api_response_time_ms Average API response time in milliseconds`);
    lines.push(`# TYPE api_response_time_ms gauge`);
    lines.push(`api_response_time_ms ${this.metrics.api.averageResponseTime}`);
    
    return lines.join('\n');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Start monitoring if this is the main module
if (require.main === module) {
  performanceMonitor.startMonitoring(5000);
  
  performanceMonitor.on('metrics', (metrics) => {
    console.log('📊 Performance Metrics:', {
      cpu: `${metrics.cpu.usage}%`,
      memory: `${metrics.memory.percentage.toFixed(1)}%`,
      database: `${metrics.database.activeConnections} connections`,
      api: `${metrics.api.requestsPerSecond.toFixed(0)} req/s`,
      health: performanceMonitor.getHealthStatus().status
    });
  });
  
  performanceMonitor.on('alert', (alert) => {
    console.log(`🚨 [${alert.level.toUpperCase()}] ${alert.service}: ${alert.message}`);
  });
}
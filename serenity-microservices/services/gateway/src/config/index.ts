import { config } from 'dotenv';
import { GatewayConfig, ServiceConfig, RouteConfig } from '@types/index';

// Load environment variables
config();

const env = process.env.NODE_ENV || 'development';

// Service configurations for Serenity microservices
const services: Record<string, ServiceConfig> = {
  'user-service': {
    name: 'user-service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    version: '1.0.0',
    health_check_path: '/health',
    timeout: 5000,
    retry_attempts: 3,
    circuit_breaker: {
      timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000'),
      errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50'),
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000'),
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 3
    },
    load_balancer: {
      strategy: (process.env.LOAD_BALANCER_STRATEGY as any) || 'round_robin',
      health_check_interval: 30000
    }
  },
  'notification-service': {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002',
    version: '1.0.0',
    health_check_path: '/health',
    timeout: 5000,
    retry_attempts: 3,
    circuit_breaker: {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 3
    },
    load_balancer: {
      strategy: 'round_robin',
      health_check_interval: 30000
    }
  },
  'checkin-service': {
    name: 'checkin-service',
    url: process.env.CHECKIN_SERVICE_URL || 'http://localhost:3003',
    version: '1.0.0',
    health_check_path: '/health',
    timeout: 5000,
    retry_attempts: 3,
    circuit_breaker: {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 3
    },
    load_balancer: {
      strategy: 'round_robin',
      health_check_interval: 30000
    }
  },
  'crisis-service': {
    name: 'crisis-service',
    url: process.env.CRISIS_SERVICE_URL || 'http://localhost:3004',
    version: '1.0.0',
    health_check_path: '/health',
    timeout: 10000, // Higher timeout for crisis situations
    retry_attempts: 5, // More retries for critical service
    circuit_breaker: {
      timeout: 5000,
      errorThresholdPercentage: 30, // Lower threshold for crisis service
      resetTimeout: 15000, // Faster reset for crisis service
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 5
    },
    load_balancer: {
      strategy: 'round_robin',
      health_check_interval: 15000 // More frequent health checks
    }
  },
  'clinical-service': {
    name: 'clinical-service',
    url: process.env.CLINICAL_SERVICE_URL || 'http://localhost:3005',
    version: '1.0.0',
    health_check_path: '/health',
    timeout: 7000,
    retry_attempts: 3,
    circuit_breaker: {
      timeout: 4000,
      errorThresholdPercentage: 40,
      resetTimeout: 25000,
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 3
    },
    load_balancer: {
      strategy: 'round_robin',
      health_check_interval: 30000
    }
  },
  'support-network-service': {
    name: 'support-network-service',
    url: process.env.SUPPORT_NETWORK_SERVICE_URL || 'http://localhost:3006',
    version: '1.0.0',
    health_check_path: '/health',
    timeout: 5000,
    retry_attempts: 3,
    circuit_breaker: {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 3
    },
    load_balancer: {
      strategy: 'round_robin',
      health_check_interval: 30000
    }
  },
  'analytics-service': {
    name: 'analytics-service',
    url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3007',
    version: '1.0.0',
    health_check_path: '/health',
    timeout: 8000,
    retry_attempts: 2,
    circuit_breaker: {
      timeout: 5000,
      errorThresholdPercentage: 60,
      resetTimeout: 45000,
      monitoringPeriod: 15000,
      halfOpenMaxCalls: 2
    },
    load_balancer: {
      strategy: 'round_robin',
      health_check_interval: 45000
    }
  },
  'files-service': {
    name: 'files-service',
    url: process.env.FILES_SERVICE_URL || 'http://localhost:3008',
    version: '1.0.0',
    health_check_path: '/health',
    timeout: 15000, // Higher timeout for file operations
    retry_attempts: 2,
    circuit_breaker: {
      timeout: 10000,
      errorThresholdPercentage: 60,
      resetTimeout: 30000,
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 2
    },
    load_balancer: {
      strategy: 'round_robin',
      health_check_interval: 30000
    }
  },
  'communication-service': {
    name: 'communication-service',
    url: process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:3009',
    version: '1.0.0',
    health_check_path: '/health',
    timeout: 6000,
    retry_attempts: 3,
    circuit_breaker: {
      timeout: 4000,
      errorThresholdPercentage: 45,
      resetTimeout: 25000,
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 3
    },
    load_balancer: {
      strategy: 'round_robin',
      health_check_interval: 30000
    }
  }
};

// Route configurations for API Gateway
const routes: RouteConfig[] = [
  // Authentication & User Management
  {
    path: '/api/v1/auth/*',
    method: 'ALL',
    service: 'user-service',
    auth_required: false,
    rate_limit: {
      window_ms: 15 * 60 * 1000, // 15 minutes
      max_requests: 10 // Limited for security
    }
  },
  {
    path: '/api/v1/users/*',
    method: 'ALL',
    service: 'user-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 100
    }
  },
  {
    path: '/api/v1/profiles/*',
    method: 'ALL',
    service: 'user-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 50
    }
  },

  // Daily Check-ins
  {
    path: '/api/v1/checkins/*',
    method: 'ALL',
    service: 'checkin-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 30
    },
    cache: {
      ttl: 300 // 5 minutes cache for read operations
    }
  },

  // Crisis Support (High Priority)
  {
    path: '/api/v1/crisis/*',
    method: 'ALL',
    service: 'crisis-service',
    auth_required: true,
    rate_limit: {
      window_ms: 60 * 1000, // 1 minute
      max_requests: 20 // Higher limit for crisis situations
    }
  },
  {
    path: '/api/v1/emergency/*',
    method: 'ALL',
    service: 'crisis-service',
    auth_required: true,
    rate_limit: {
      window_ms: 60 * 1000,
      max_requests: 50 // Even higher for emergency
    }
  },

  // Clinical Services
  {
    path: '/api/v1/clinical/*',
    method: 'ALL',
    service: 'clinical-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 100
    }
  },
  {
    path: '/api/v1/providers/*',
    method: 'ALL',
    service: 'clinical-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 200 // Higher for providers
    }
  },

  // Support Network
  {
    path: '/api/v1/support-network/*',
    method: 'ALL',
    service: 'support-network-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 100
    }
  },
  {
    path: '/api/v1/supporters/*',
    method: 'ALL',
    service: 'support-network-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 150
    }
  },

  // Notifications
  {
    path: '/api/v1/notifications/*',
    method: 'ALL',
    service: 'notification-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 100
    }
  },

  // Analytics (Read-heavy)
  {
    path: '/api/v1/analytics/*',
    method: 'ALL',
    service: 'analytics-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 50
    },
    cache: {
      ttl: 1800 // 30 minutes cache for analytics
    }
  },

  // File Management
  {
    path: '/api/v1/files/*',
    method: 'ALL',
    service: 'files-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 20 // Limited for file operations
    }
  },

  // Communication
  {
    path: '/api/v1/messages/*',
    method: 'ALL',
    service: 'communication-service',
    auth_required: true,
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 200
    }
  },
  {
    path: '/api/v1/chat/*',
    method: 'ALL',
    service: 'communication-service',
    auth_required: true,
    rate_limit: {
      window_ms: 60 * 1000,
      max_requests: 100 // Higher for real-time chat
    }
  }
];

const gatewayConfig: GatewayConfig = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
    environment: env
  },
  services,
  routes,
  security: {
    helmet: process.env.HELMET_ENABLED !== 'false',
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:8080').split(','),
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowed_headers: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
    },
    rate_limiting: {
      global: {
        window_ms: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        max_requests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        skip_successful_requests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true'
      },
      per_user: {
        window_ms: 15 * 60 * 1000,
        max_requests: 1000
      },
      per_api_key: {
        window_ms: 15 * 60 * 1000,
        max_requests: 5000
      }
    },
    ddos_protection: {
      burst: parseInt(process.env.DDOS_BURST || '10'),
      limit: parseInt(process.env.DDOS_LIMIT || '2'),
      max_expiry: parseInt(process.env.DDOS_MAX_EXPIRY || '3600000')
    },
    input_validation: {
      max_body_size: process.env.MAX_BODY_SIZE || '10mb',
      max_param_length: 1000,
      max_query_length: 5000
    }
  },
  monitoring: {
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      path: process.env.METRICS_PATH || '/metrics',
      collect_default_metrics: true
    },
    jaeger: {
      enabled: process.env.JAEGER_ENDPOINT !== undefined,
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      service_name: process.env.SERVICE_NAME || 'api-gateway'
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: (process.env.LOG_FORMAT as any) || 'json',
      output: 'both',
      file_path: 'logs/gateway.log',
      max_files: 5,
      max_size: '10m'
    }
  },
  service_discovery: {
    type: (process.env.SERVICE_DISCOVERY_TYPE as any) || 'consul',
    config: {
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT || '8500'),
      secure: false
    }
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    cluster_nodes: process.env.REDIS_CLUSTER_NODES?.split(',')
  },
  graphql: process.env.GRAPHQL_ENABLED === 'true' ? {
    services: [
      {
        name: 'user-service',
        url: `${services['user-service'].url}/graphql`
      },
      {
        name: 'checkin-service',
        url: `${services['checkin-service'].url}/graphql`
      },
      {
        name: 'clinical-service',
        url: `${services['clinical-service'].url}/graphql`
      }
    ],
    introspection: env !== 'production',
    playground: env !== 'production',
    cors: true
  } : undefined
};

export default gatewayConfig;
export { services, routes };
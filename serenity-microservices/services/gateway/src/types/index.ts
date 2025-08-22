export interface ServiceConfig {
  name: string;
  url: string;
  version: string;
  health_check_path: string;
  timeout: number;
  retry_attempts: number;
  circuit_breaker: CircuitBreakerConfig;
  load_balancer: LoadBalancerConfig;
}

export interface CircuitBreakerConfig {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
}

export interface LoadBalancerConfig {
  strategy: 'round_robin' | 'weighted' | 'least_connections' | 'random';
  weights?: Record<string, number>;
  health_check_interval: number;
}

export interface RouteConfig {
  path: string;
  method: string;
  service: string;
  target_path?: string;
  auth_required: boolean;
  rate_limit?: RateLimitConfig;
  transformation?: TransformationConfig;
  cache?: CacheConfig;
  version?: string;
}

export interface RateLimitConfig {
  window_ms: number;
  max_requests: number;
  skip_successful_requests?: boolean;
  key_generator?: string;
}

export interface TransformationConfig {
  request?: {
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  };
  response?: {
    headers?: Record<string, string>;
    body?: any;
  };
}

export interface CacheConfig {
  ttl: number;
  key_generator?: string;
  cache_control?: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  user_id?: string;
  permissions: string[];
  rate_limit?: RateLimitConfig;
  created_at: Date;
  expires_at?: Date;
  is_active: boolean;
  last_used_at?: Date;
  usage_count: number;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
  api_keys?: ApiKey[];
  created_at: Date;
  last_login_at?: Date;
  is_active: boolean;
}

export type UserRole = 'patient' | 'provider' | 'supporter' | 'admin' | 'system';

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface ServiceInstance {
  id: string;
  name: string;
  address: string;
  port: number;
  tags: string[];
  health: 'passing' | 'warning' | 'critical';
  last_health_check: Date;
  metadata: Record<string, any>;
}

export interface RequestMetrics {
  request_id: string;
  method: string;
  path: string;
  service: string;
  status_code: number;
  response_time: number;
  request_size: number;
  response_size: number;
  user_id?: string;
  api_key_id?: string;
  timestamp: Date;
  user_agent?: string;
  ip_address: string;
  error?: string;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  response_time: number;
  error?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface WebSocketConnection {
  id: string;
  user_id?: string;
  service: string;
  connected_at: Date;
  last_activity: Date;
  metadata: Record<string, any>;
}

export interface FileUpload {
  id: string;
  filename: string;
  original_name: string;
  mimetype: string;
  size: number;
  path: string;
  user_id?: string;
  service: string;
  uploaded_at: Date;
  metadata: Record<string, any>;
}

export interface GraphQLFederationConfig {
  services: Array<{
    name: string;
    url: string;
    schema_path?: string;
  }>;
  introspection: boolean;
  playground: boolean;
  cors: boolean;
}

export interface SecurityConfig {
  helmet: boolean;
  cors: {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowed_headers: string[];
  };
  rate_limiting: {
    global: RateLimitConfig;
    per_user: RateLimitConfig;
    per_api_key: RateLimitConfig;
  };
  ddos_protection: {
    burst: number;
    limit: number;
    max_expiry: number;
  };
  input_validation: {
    max_body_size: string;
    max_param_length: number;
    max_query_length: number;
  };
}

export interface MonitoringConfig {
  prometheus: {
    enabled: boolean;
    path: string;
    collect_default_metrics: boolean;
  };
  jaeger: {
    enabled: boolean;
    endpoint: string;
    service_name: string;
  };
  logging: {
    level: string;
    format: 'json' | 'text';
    output: 'console' | 'file' | 'both';
    file_path?: string;
    max_files?: number;
    max_size?: string;
  };
}

export interface GatewayConfig {
  server: {
    port: number;
    host: string;
    environment: string;
  };
  services: Record<string, ServiceConfig>;
  routes: RouteConfig[];
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  service_discovery: {
    type: 'consul' | 'etcd' | 'static';
    config: Record<string, any>;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    cluster_nodes?: string[];
  };
  graphql?: GraphQLFederationConfig;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    request_id: string;
    trace_id?: string;
  };
}

export interface SuccessResponse<T = any> {
  data: T;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    has_more?: boolean;
  };
  request_id: string;
  timestamp: string;
}

// Express Request Extensions
declare global {
  namespace Express {
    interface Request {
      user?: User;
      api_key?: ApiKey;
      request_id: string;
      trace_id?: string;
      start_time: number;
      service_config?: ServiceConfig;
    }
  }
}
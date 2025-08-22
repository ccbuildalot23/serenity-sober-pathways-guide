// Core Security Service Types

export type AuditEventType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'DATA_ACCESS'
  | 'DATA_MODIFICATION'
  | 'DATA_EXPORT'
  | 'PERMISSION_CHANGE'
  | 'SYSTEM_ACCESS'
  | 'API_CALL'
  | 'AUTHENTICATION_FAILURE'
  | 'AUTHORIZATION_FAILURE'
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_LOCKOUT'
  | 'CONFIGURATION_CHANGE'
  | 'SECURITY_ALERT'
  | 'PHI_ACCESS'
  | 'PHI_EXPORT'
  | 'ADMIN_ACTION'
  | 'CRISIS_EVENT'
  | 'EMERGENCY_ACCESS';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityStatus = 'ACTIVE' | 'SUSPICIOUS' | 'BLOCKED' | 'INVESTIGATING';

export interface AuditLogEntry {
  id?: string;
  
  // Event Information
  event_type: AuditEventType;
  event_name: string;
  event_description?: string;
  event_timestamp?: Date;
  
  // User Information
  user_id?: string;
  username?: string;
  user_role?: string;
  session_id?: string;
  
  // Source Information
  source_ip?: string;
  user_agent?: string;
  request_id?: string;
  service_name?: string;
  endpoint?: string;
  http_method?: string;
  
  // Resource Information
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  patient_id?: string; // For PHI access tracking
  
  // Risk Assessment
  risk_level?: RiskLevel;
  security_flags?: Record<string, any>;
  
  // Request/Response Data (will be encrypted)
  request_data?: any;
  response_data?: any;
  
  // Compliance Fields
  hipaa_category?: string;
  retention_required_until?: Date;
  
  // Status and Metadata
  status?: SecurityStatus;
  metadata?: Record<string, any>;
  tags?: string[];
  
  // Audit Trail
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
}

export interface SecurityEvent {
  id?: string;
  audit_log_id?: string;
  
  // Event Classification
  severity: RiskLevel;
  category: string;
  subcategory?: string;
  
  // Detection Information
  detected_at?: Date;
  detection_method?: string;
  confidence_score?: number; // 0-1
  
  // Response Information
  response_required?: boolean;
  response_deadline?: Date;
  assigned_to?: string;
  status?: string;
  
  // Additional Context
  threat_indicators?: Record<string, any>;
  mitigation_steps?: string[];
  
  // Timestamps
  created_at?: Date;
  updated_at?: Date;
  resolved_at?: Date;
}

export interface ApiAccessLog {
  id?: string;
  
  // Request Information
  api_key_hash?: string;
  endpoint: string;
  http_method: string;
  source_ip: string;
  user_agent?: string;
  
  // Timing Information
  request_timestamp?: Date;
  response_time_ms?: number;
  
  // Status Information
  status_code: number;
  success: boolean;
  error_message?: string;
  
  // Rate Limiting
  requests_count?: number;
  rate_limit_exceeded?: boolean;
  
  // Metadata
  request_size_bytes?: number;
  response_size_bytes?: number;
  metadata?: Record<string, any>;
}

export interface AuthAttempt {
  id?: string;
  
  // Attempt Information
  username?: string;
  user_id?: string;
  auth_method: string;
  
  // Success/Failure
  success: boolean;
  failure_reason?: string;
  
  // Source Information
  source_ip: string;
  user_agent?: string;
  location_country?: string;
  location_city?: string;
  
  // Risk Assessment
  risk_score?: number; // 0-1
  suspicious_indicators?: Record<string, any>;
  
  // Timestamps
  attempted_at?: Date;
  session_duration?: string; // PostgreSQL interval
}

// API Request/Response Types
export interface CreateAuditLogRequest {
  event_type: AuditEventType;
  event_name: string;
  event_description?: string;
  user_id?: string;
  username?: string;
  user_role?: string;
  session_id?: string;
  source_ip?: string;
  user_agent?: string;
  request_id?: string;
  service_name?: string;
  endpoint?: string;
  http_method?: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  patient_id?: string;
  risk_level?: RiskLevel;
  security_flags?: Record<string, any>;
  request_data?: any;
  response_data?: any;
  hipaa_category?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface AuditLogQuery {
  user_id?: string;
  event_type?: AuditEventType | AuditEventType[];
  risk_level?: RiskLevel | RiskLevel[];
  start_date?: Date;
  end_date?: Date;
  source_ip?: string;
  patient_id?: string;
  session_id?: string;
  service_name?: string;
  hipaa_category?: string;
  tags?: string[];
  status?: SecurityStatus;
  
  // Pagination
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface AuditLogSearchRequest {
  query: AuditLogQuery;
  include_encrypted_data?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface AuditLogResponse extends AuditLogEntry {
  decrypted_request_data?: any;
  decrypted_response_data?: any;
}

// Security Configuration Types
export interface SecurityConfig {
  encryption: {
    algorithm: string;
    key_length: number;
    iv_length: number;
  };
  rate_limiting: {
    window_ms: number;
    max_requests: number;
  };
  authentication: {
    jwt_expiry: string;
    api_key_length: number;
  };
  audit: {
    retention_days: number;
    encryption_enabled: boolean;
    log_level: string;
  };
}

// Health Check Types
export interface HealthCheck {
  service: string;
  version: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency: number;
      message?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      usage_mb: number;
      total_mb: number;
      percentage: number;
    };
    api: {
      status: 'healthy' | 'unhealthy';
      response_time: number;
    };
  };
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  request_id?: string;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Authentication Types
export interface AuthenticatedRequest {
  user?: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
  api_key?: {
    id: string;
    name: string;
    permissions: string[];
  };
}

// Middleware Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retry_after?: number;
}

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/**
 * Service Contracts and API Specifications
 * Defines the contracts between microservices
 */

// Service Discovery Contract
export interface ServiceRegistry {
  name: string;
  version: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'ws' | 'wss';
  healthCheck: string;
  metadata?: {
    region?: string;
    zone?: string;
    tags?: string[];
    weight?: number;
  };
}

// Inter-Service Authentication
export interface ServiceCredentials {
  serviceId: string;
  apiKey: string;
  secret: string;
  permissions: string[];
  expiresAt?: Date;
}

// Event Bus Contract
export interface EventMessage {
  id: string;
  source: string;
  type: string;
  version: string;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
  payload: any;
  metadata?: Record<string, any>;
}

// Service Endpoints Contract
export const SERVICE_ENDPOINTS = {
  // Identity Service
  identity: {
    authenticate: 'POST /auth/login',
    refresh: 'POST /auth/refresh',
    logout: 'POST /auth/logout',
    register: 'POST /auth/register',
    verify: 'POST /auth/verify',
    resetPassword: 'POST /auth/reset-password',
    changePassword: 'PUT /auth/change-password',
    getProfile: 'GET /users/:id',
    updateProfile: 'PUT /users/:id',
    getRoles: 'GET /users/:id/roles',
    assignRole: 'POST /users/:id/roles',
  },

  // Checkin Service
  checkins: {
    create: 'POST /checkins',
    get: 'GET /checkins/:id',
    list: 'GET /checkins',
    update: 'PUT /checkins/:id',
    delete: 'DELETE /checkins/:id',
    getUserCheckins: 'GET /users/:userId/checkins',
    getStatistics: 'GET /checkins/statistics',
    getTrends: 'GET /checkins/trends',
  },

  // Crisis Service
  crisis: {
    triggerAlert: 'POST /crisis/alert',
    getPlan: 'GET /crisis/plans/:userId',
    updatePlan: 'PUT /crisis/plans/:userId',
    getContacts: 'GET /crisis/contacts/:userId',
    addContact: 'POST /crisis/contacts',
    removeContact: 'DELETE /crisis/contacts/:id',
    getEvents: 'GET /crisis/events',
    resolveEvent: 'PUT /crisis/events/:id/resolve',
  },

  // Communication Service
  communication: {
    sendMessage: 'POST /messages',
    getMessages: 'GET /messages',
    getConversation: 'GET /conversations/:id',
    markAsRead: 'PUT /messages/:id/read',
    deleteMessage: 'DELETE /messages/:id',
    createGroup: 'POST /groups',
    joinGroup: 'POST /groups/:id/join',
    leaveGroup: 'POST /groups/:id/leave',
  },

  // Clinical Service
  clinical: {
    createCarePlan: 'POST /care-plans',
    getCarePlan: 'GET /care-plans/:id',
    updateCarePlan: 'PUT /care-plans/:id',
    addNote: 'POST /clinical-notes',
    getNotes: 'GET /clinical-notes',
    scheduleAppointment: 'POST /appointments',
    getAppointments: 'GET /appointments',
    cancelAppointment: 'DELETE /appointments/:id',
    getPrescriptions: 'GET /prescriptions',
    createPrescription: 'POST /prescriptions',
  },

  // Support Network Service
  supportNetwork: {
    getNetwork: 'GET /support-network/:userId',
    addSupporter: 'POST /support-network/supporters',
    removeSupporter: 'DELETE /support-network/supporters/:id',
    updatePermissions: 'PUT /support-network/supporters/:id/permissions',
    sendAlert: 'POST /support-network/alerts',
    getAlerts: 'GET /support-network/alerts',
  },

  // Analytics Service
  analytics: {
    trackEvent: 'POST /analytics/events',
    getEvents: 'GET /analytics/events',
    getUserMetrics: 'GET /analytics/users/:userId/metrics',
    getSystemMetrics: 'GET /analytics/system/metrics',
    generateReport: 'POST /analytics/reports',
    getReports: 'GET /analytics/reports',
    getDashboard: 'GET /analytics/dashboard/:type',
  },

  // Security Service
  security: {
    logAudit: 'POST /audit/log',
    getAuditLogs: 'GET /audit/logs',
    searchAuditLogs: 'POST /audit/search',
    getSecurityEvents: 'GET /security/events',
    reportIncident: 'POST /security/incidents',
    getCompliance: 'GET /security/compliance',
    validatePermission: 'POST /security/validate-permission',
  },

  // Notification Service
  notifications: {
    send: 'POST /notifications/send',
    sendBulk: 'POST /notifications/bulk',
    getStatus: 'GET /notifications/status/:id',
    getUserNotifications: 'GET /notifications/user/:userId',
    markAsRead: 'PUT /notifications/:id/read',
    updatePreferences: 'PUT /notifications/preferences/:userId',
    getTemplates: 'GET /notifications/templates',
    createTemplate: 'POST /notifications/templates',
  },

  // Files Service
  files: {
    upload: 'POST /files/upload',
    download: 'GET /files/:id',
    delete: 'DELETE /files/:id',
    getMetadata: 'GET /files/:id/metadata',
    listUserFiles: 'GET /files/user/:userId',
    generatePresignedUrl: 'POST /files/presigned-url',
    scanFile: 'POST /files/:id/scan',
  },
};

// Event Types for Event-Driven Architecture
export enum SystemEvents {
  // User Events
  USER_REGISTERED = 'user.registered',
  USER_LOGGED_IN = 'user.logged_in',
  USER_LOGGED_OUT = 'user.logged_out',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ROLE_CHANGED = 'user.role_changed',

  // Check-in Events
  CHECKIN_CREATED = 'checkin.created',
  CHECKIN_UPDATED = 'checkin.updated',
  CHECKIN_MILESTONE = 'checkin.milestone',
  CHECKIN_STREAK = 'checkin.streak',

  // Crisis Events
  CRISIS_ALERT = 'crisis.alert',
  CRISIS_RESOLVED = 'crisis.resolved',
  CRISIS_ESCALATED = 'crisis.escalated',
  CRISIS_PLAN_UPDATED = 'crisis.plan_updated',

  // Clinical Events
  APPOINTMENT_SCHEDULED = 'appointment.scheduled',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  CARE_PLAN_CREATED = 'care_plan.created',
  CARE_PLAN_UPDATED = 'care_plan.updated',
  PRESCRIPTION_CREATED = 'prescription.created',

  // Support Network Events
  SUPPORTER_ADDED = 'supporter.added',
  SUPPORTER_REMOVED = 'supporter.removed',
  SUPPORT_ALERT_SENT = 'support.alert_sent',
  SUPPORT_MESSAGE_SENT = 'support.message_sent',

  // Notification Events
  NOTIFICATION_SENT = 'notification.sent',
  NOTIFICATION_DELIVERED = 'notification.delivered',
  NOTIFICATION_FAILED = 'notification.failed',
  NOTIFICATION_READ = 'notification.read',

  // Security Events
  SECURITY_BREACH = 'security.breach',
  SUSPICIOUS_ACTIVITY = 'security.suspicious',
  ACCESS_DENIED = 'security.access_denied',
  AUDIT_LOG_CREATED = 'security.audit_created',

  // System Events
  SERVICE_UP = 'system.service_up',
  SERVICE_DOWN = 'system.service_down',
  SERVICE_DEGRADED = 'system.service_degraded',
  DATABASE_ERROR = 'system.database_error',
  RATE_LIMIT_EXCEEDED = 'system.rate_limit_exceeded',
}

// Message Queue Topics
export const MESSAGE_TOPICS = {
  // Priority queues for critical events
  CRISIS_ALERTS: 'crisis.alerts',
  SECURITY_EVENTS: 'security.events',
  
  // Standard queues
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit.logs',
  ANALYTICS: 'analytics.events',
  USER_UPDATES: 'user.updates',
  CHECKIN_PROCESSING: 'checkin.processing',
  
  // Dead letter queues
  DLQ_NOTIFICATIONS: 'dlq.notifications',
  DLQ_ANALYTICS: 'dlq.analytics',
  DLQ_GENERAL: 'dlq.general',
};

// Service Health States
export enum ServiceHealth {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

// API Versioning
export interface ApiVersion {
  version: string;
  deprecated?: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
  changes?: string[];
}

// Rate Limit Tiers
export interface RateLimitTier {
  name: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  priority: number;
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'free',
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 10,
    priority: 1,
  },
  standard: {
    name: 'standard',
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    requestsPerDay: 100000,
    burstLimit: 50,
    priority: 2,
  },
  premium: {
    name: 'premium',
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 500000,
    burstLimit: 100,
    priority: 3,
  },
  enterprise: {
    name: 'enterprise',
    requestsPerMinute: 5000,
    requestsPerHour: 200000,
    requestsPerDay: 2000000,
    burstLimit: 500,
    priority: 4,
  },
};

// Error Codes
export const ERROR_CODES = {
  // Authentication Errors (1xxx)
  INVALID_CREDENTIALS: 'ERR_1001',
  TOKEN_EXPIRED: 'ERR_1002',
  TOKEN_INVALID: 'ERR_1003',
  UNAUTHORIZED: 'ERR_1004',
  FORBIDDEN: 'ERR_1005',
  
  // Validation Errors (2xxx)
  INVALID_INPUT: 'ERR_2001',
  MISSING_FIELD: 'ERR_2002',
  INVALID_FORMAT: 'ERR_2003',
  OUT_OF_RANGE: 'ERR_2004',
  
  // Business Logic Errors (3xxx)
  RESOURCE_NOT_FOUND: 'ERR_3001',
  DUPLICATE_RESOURCE: 'ERR_3002',
  OPERATION_FAILED: 'ERR_3003',
  PRECONDITION_FAILED: 'ERR_3004',
  
  // System Errors (4xxx)
  INTERNAL_ERROR: 'ERR_4001',
  SERVICE_UNAVAILABLE: 'ERR_4002',
  DATABASE_ERROR: 'ERR_4003',
  NETWORK_ERROR: 'ERR_4004',
  
  // Rate Limiting Errors (5xxx)
  RATE_LIMIT_EXCEEDED: 'ERR_5001',
  QUOTA_EXCEEDED: 'ERR_5002',
  
  // HIPAA Compliance Errors (6xxx)
  PHI_ACCESS_DENIED: 'ERR_6001',
  AUDIT_LOG_FAILED: 'ERR_6002',
  ENCRYPTION_FAILED: 'ERR_6003',
};
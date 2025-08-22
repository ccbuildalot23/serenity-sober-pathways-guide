export interface NotificationRequest {
  id?: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  templateId: string;
  data: Record<string, any>;
  scheduledAt?: Date;
  priority: NotificationPriority;
  metadata?: Record<string, any>;
  retryCount?: number;
  maxRetries?: number;
}

export interface BulkNotificationRequest {
  notifications: NotificationRequest[];
  batchId?: string;
  scheduleMode?: 'immediate' | 'staggered' | 'scheduled';
  staggerDelayMs?: number;
}

export enum NotificationType {
  CRISIS_ALERT = 'crisis_alert',
  CHECKIN_REMINDER = 'checkin_reminder',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  MEDICATION_REMINDER = 'medication_reminder',
  MILESTONE_CELEBRATION = 'milestone_celebration',
  SUPPORT_MESSAGE = 'support_message',
  SYSTEM_NOTIFICATION = 'system_notification',
  SECURITY_ALERT = 'security_alert',
  BACKUP_NOTIFICATION = 'backup_notification'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  VOICE = 'voice'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface NotificationLog {
  id: string;
  notificationId: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: NotificationPriority;
  templateId: string;
  data: Record<string, any>;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  isHipaaCompliant: boolean;
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  timestamp: Date;
  action: string;
  userId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  htmlBody?: string;
  variables: string[];
  isActive: boolean;
  isHipaaCompliant: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface UserNotificationPreferences {
  userId: string;
  email?: {
    enabled: boolean;
    address: string;
    verified: boolean;
  };
  sms?: {
    enabled: boolean;
    phoneNumber: string;
    verified: boolean;
  };
  push?: {
    enabled: boolean;
    deviceTokens: string[];
  };
  inApp?: {
    enabled: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  preferences: Record<NotificationType, boolean>;
  emergencyOverride: boolean;
}

export interface DeliveryStatus {
  id: string;
  status: NotificationStatus;
  channel: NotificationChannel;
  attempts: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  errorDetails?: string;
  deliveryMetrics?: {
    queueTime?: number;
    processingTime?: number;
    deliveryTime?: number;
  };
}

export interface NotificationMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  channelBreakdown: Record<NotificationChannel, number>;
  typeBreakdown: Record<NotificationType, number>;
  failureReasons: Record<string, number>;
}

export interface QueueMessage {
  id: string;
  type: 'notification' | 'bulk_notification' | 'retry';
  payload: NotificationRequest | BulkNotificationRequest;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processAt: Date;
}

export interface EmailPayload {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SMSPayload {
  to: string;
  from: string;
  body: string;
}

export interface PushPayload {
  deviceTokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  clickAction?: string;
}

export interface InAppPayload {
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  expiresAt?: Date;
}

export interface HIPAACompliantData {
  encrypted: boolean;
  encryptionMethod: string;
  accessLog: AuditEntry[];
  retentionPeriod: number;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    database: boolean;
    redis: boolean;
    rabbitmq: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  timestamp: Date;
  uptime: number;
  version: string;
}
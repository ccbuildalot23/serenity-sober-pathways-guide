/**
 * Shared TypeScript Types for Serenity Microservices
 * These types are used across all services for consistency
 */

// User & Authentication Types
export interface User {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  PATIENT = 'patient',
  PROVIDER = 'provider',
  SUPPORTER = 'support_member',
  ADMIN = 'admin'
}

export interface AuthToken {
  userId: string;
  role: UserRole;
  permissions: string[];
  exp: number;
  iat: number;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  service: string;
  version: string;
  uptime: number;
  checks?: {
    database?: boolean;
    redis?: boolean;
    rabbitmq?: boolean;
    dependencies?: Record<string, boolean>;
  };
}

// Audit & Security Types
export interface AuditLog {
  id: string;
  eventType: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  timestamp: Date;
  serviceName: string;
  phiAccessed?: boolean;
  patientId?: string;
}

// Notification Types
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  templateId?: string;
  subject?: string;
  content: string;
  metadata?: Record<string, any>;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  retryCount?: number;
  error?: string;
}

// Check-in Types
export interface DailyCheckin {
  id: string;
  userId: string;
  moodScore?: number; // 1-10
  anxietyLevel?: number; // 1-10
  sleepQuality?: number; // 1-10
  notes?: string;
  triggers?: string[];
  copingStrategiesUsed?: string[];
  medicationTaken?: boolean;
  createdAt: Date;
}

// Crisis Types
export interface CrisisPlan {
  id: string;
  userId: string;
  warningSignals: string[];
  copingStrategies: string[];
  supportContacts: EmergencyContact[];
  professionalContacts: ProfessionalContact[];
  safeEnvironment?: string[];
  reasonsToLive?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  isPrimary: boolean;
  canContactForCrisis: boolean;
}

export interface ProfessionalContact {
  id: string;
  name: string;
  title: string;
  organization: string;
  phone: string;
  email?: string;
  availability?: string;
}

export interface CrisisEvent {
  id: string;
  userId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggerType?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  contactsNotified: string[];
  resolutionStatus: 'active' | 'resolved' | 'escalated';
  notes?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

// Provider Types
export interface Provider {
  id: string;
  userId: string;
  licenseNumber: string;
  specializations: string[];
  organization?: string;
  patients?: string[]; // Patient user IDs
  availability?: ProviderAvailability;
}

export interface ProviderAvailability {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

// Appointment Types
export interface Appointment {
  id: string;
  patientId: string;
  providerId: string;
  type: 'initial' | 'followup' | 'crisis' | 'group';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  scheduledAt: Date;
  duration: number; // minutes
  notes?: string;
  videoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message Types
export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  conversationId?: string;
  content: string;
  encrypted: boolean;
  attachments?: Attachment[];
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  encrypted: boolean;
}

// Goal Types
export interface RecoveryGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: 'health' | 'relationships' | 'career' | 'education' | 'personal' | 'other';
  targetDate?: Date;
  milestones?: Milestone[];
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

// Analytics Types
export interface AnalyticsEvent {
  id: string;
  userId?: string;
  eventType: string;
  category: string;
  properties?: Record<string, any>;
  sessionId?: string;
  deviceInfo?: DeviceInfo;
  timestamp: Date;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser?: string;
  version?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Service Communication Types
export interface ServiceRequest {
  requestId: string;
  source: string;
  target: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  userId?: string;
  timestamp: Date;
}

export interface ServiceResponse {
  requestId: string;
  statusCode: number;
  headers: Record<string, string>;
  body?: any;
  error?: ApiError;
  duration: number;
  timestamp: Date;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// File Upload Types
export interface FileUpload {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  encrypted: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Export all types
export * from './contracts';
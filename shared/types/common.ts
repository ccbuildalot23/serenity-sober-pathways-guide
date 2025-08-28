export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'provider' | 'supporter' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ServiceResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: Record<string, any>;
}

export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';
export type NotificationType = 'crisis' | 'reminder' | 'update' | 'system' | 'welcome' | 'reset';

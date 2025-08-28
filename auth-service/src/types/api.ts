export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  timestamp: string;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
  deviceInfo?: DeviceInfo;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: SafeUser;
  tokens: TokenPair;
  mfaRequired?: boolean;
  mfaToken?: string;
  session: SessionInfo;
}

export interface MFAVerifyRequest {
  mfaToken: string;
  totpCode?: string;
  backupCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: RoleName;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}

export interface RegisterResponse {
  user: SafeUser;
  emailVerificationRequired: boolean;
  message: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetRequest {
  email: string;
  clientUrl?: string;
}

export interface PasswordResetCompleteRequest {
  token: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles: string[];
  permissions: string[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionInfo {
  id: string;
  expiresAt: string;
  lastActivityAt: string;
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  version: string;
  trusted: boolean;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  setupToken: string;
}

export interface MFASetupCompleteRequest {
  setupToken: string;
  totpCode: string;
}

export interface OAuthLoginRequest {
  provider: 'google' | 'microsoft';
  code: string;
  state?: string;
  codeVerifier?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    email: ServiceStatus;
    sms: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface AuditLogQuery extends PaginationQuery {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  ipAddress?: string;
  success?: boolean;
}

export interface SessionQuery extends PaginationQuery {
  userId?: string;
  active?: boolean;
  deviceType?: string;
  ipAddress?: string;
}

export interface RevokeSessionRequest {
  sessionId: string;
  reason?: string;
}
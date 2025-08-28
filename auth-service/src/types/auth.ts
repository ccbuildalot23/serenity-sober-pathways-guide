export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  roles: UserRole[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  passwordChangedAt: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  accountLockedUntil?: Date;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  role: Role;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: RoleName;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type RoleName = 'admin' | 'provider' | 'patient' | 'supporter' | 'guest';

export interface Permission {
  id: string;
  resource: string;
  action: PermissionAction;
  conditions?: Record<string, any>;
  description: string;
}

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute';

export interface Session {
  id: string;
  userId: string;
  deviceId?: string;
  deviceInfo?: DeviceInfo;
  ipAddress: string;
  userAgent: string;
  issuedAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
  metadata: Record<string, any>;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  version: string;
  trusted: boolean;
}

export interface RefreshToken {
  id: string;
  userId: string;
  sessionId: string;
  token: string;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  family: string;
  createdAt: Date;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt?: Date;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface EmailVerificationToken {
  id: string;
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface MFABackupCode {
  id: string;
  userId: string;
  code: string;
  usedAt?: Date;
  createdAt: Date;
}

export interface OAuthProvider {
  id: string;
  userId: string;
  provider: 'google' | 'microsoft';
  providerId: string;
  email: string;
  displayName: string;
  avatar?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  sessionId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  riskScore?: number;
  createdAt: Date;
}

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password_change'
  | 'password_reset_request'
  | 'password_reset_complete'
  | 'mfa_enable'
  | 'mfa_disable'
  | 'mfa_verify'
  | 'mfa_backup_generate'
  | 'mfa_backup_use'
  | 'email_verify'
  | 'phone_verify'
  | 'oauth_link'
  | 'oauth_unlink'
  | 'role_grant'
  | 'role_revoke'
  | 'account_lock'
  | 'account_unlock'
  | 'account_activate'
  | 'account_deactivate'
  | 'session_create'
  | 'session_revoke'
  | 'token_refresh'
  | 'data_export'
  | 'data_delete'
  | 'phi_access'
  | 'break_glass';
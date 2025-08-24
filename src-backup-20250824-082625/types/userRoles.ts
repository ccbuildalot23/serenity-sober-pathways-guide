// MVP User Role System - Requirement #1: Three-user permission system with granular controls

export type UserRole = 'patient' | 'provider' | 'support_member' | 'admin';

export interface UserPermissions {
  // Patient permissions
  canAccessOwnData: boolean;
  canSubmitCheckIns: boolean;
  canManageSupportNetwork: boolean;
  canViewOwnProgress: boolean;
  
  // Provider permissions
  canAccessPatientDashboards: boolean;
  canViewCheckInPatterns: boolean;
  canManageCarePlans: boolean;
  canAccessCrisisNotifications: boolean;
  
  // Support member permissions
  canReceiveCrisisAlerts: boolean;
  canViewLimitedProgress: boolean;
  canAccessCareNavigation: boolean;
  
  // HIPAA compliance controls
  hipaaAccessLevel: 'none' | 'limited' | 'full';
  dataRetentionPeriod: number; // days
  requiresAuditLogging: boolean;
}

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  patient: {
    canAccessOwnData: true,
    canSubmitCheckIns: true,
    canManageSupportNetwork: true,
    canViewOwnProgress: true,
    canAccessPatientDashboards: false,
    canViewCheckInPatterns: false,
    canManageCarePlans: false,
    canAccessCrisisNotifications: false,
    canReceiveCrisisAlerts: false,
    canViewLimitedProgress: false,
    canAccessCareNavigation: false,
    hipaaAccessLevel: 'full',
    dataRetentionPeriod: 2555, // 7 years
    requiresAuditLogging: true
  },
  provider: {
    canAccessOwnData: true,
    canSubmitCheckIns: false,
    canManageSupportNetwork: false,
    canViewOwnProgress: false,
    canAccessPatientDashboards: true,
    canViewCheckInPatterns: true,
    canManageCarePlans: true,
    canAccessCrisisNotifications: true,
    canReceiveCrisisAlerts: true,
    canViewLimitedProgress: true,
    canAccessCareNavigation: true,
    hipaaAccessLevel: 'full',
    dataRetentionPeriod: 2555, // 7 years
    requiresAuditLogging: true
  },
  support_member: {
    canAccessOwnData: false,
    canSubmitCheckIns: false,
    canManageSupportNetwork: false,
    canViewOwnProgress: false,
    canAccessPatientDashboards: false,
    canViewCheckInPatterns: false,
    canManageCarePlans: false,
    canAccessCrisisNotifications: false,
    canReceiveCrisisAlerts: true,
    canViewLimitedProgress: true,
    canAccessCareNavigation: true,
    hipaaAccessLevel: 'limited',
    dataRetentionPeriod: 90, // Limited retention for support members
    requiresAuditLogging: true
  }
  ,
  admin: {
    canAccessOwnData: false,
    canSubmitCheckIns: false,
    canManageSupportNetwork: false,
    canViewOwnProgress: false,
    canAccessPatientDashboards: false,
    canViewCheckInPatterns: false,
    canManageCarePlans: false,
    canAccessCrisisNotifications: false,
    canReceiveCrisisAlerts: false,
    canViewLimitedProgress: false,
    canAccessCareNavigation: false,
    hipaaAccessLevel: 'full',
    dataRetentionPeriod: 2555,
    requiresAuditLogging: true
  }
};

// Granular permission checking utilities
export const hasPermission = (userRole: UserRole, permission: keyof UserPermissions): boolean => {
  return DEFAULT_PERMISSIONS[userRole][permission] as boolean;
};

export const getHipaaAccessLevel = (userRole: UserRole): 'none' | 'limited' | 'full' => {
  return DEFAULT_PERMISSIONS[userRole].hipaaAccessLevel;
};
import { DEFAULT_PERMISSIONS, UserRole } from '@/types/userRoles';
import { enhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

export type PermissionAction =
  | 'view_patient_data'
  | 'edit_care_plan'
  | 'invite_supporter'
  | 'view_limited_progress'
  | 'access_patient_dashboards'
  | 'receive_crisis_alerts';

export interface Relationship {
  supporterId: string;
  patientId: string;
  isActive: boolean;
  consentGranted: boolean;
  consentRevokedAt?: string | null;
  expiresAt?: string | null;
}

export interface UserContext {
  userId: string;
  role: UserRole;
  dateOfBirth?: string | null; // ISO date
  parentalConsent?: boolean; // for <18
}

export interface PermissionContext {
  actor: UserContext;
  patient?: UserContext; // when acting on a patient resource
  relationship?: Relationship | null; // support member ↔ patient
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

function calculateAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export class TriUserPermissions {
  static async enforce(action: PermissionAction, ctx: PermissionContext): Promise<PermissionResult> {
    const base = DEFAULT_PERMISSIONS[ctx.actor.role];

    // Age gating for minors
    const actorAge = calculateAge(ctx.actor.dateOfBirth);
    const isMinor = actorAge !== null ? actorAge < 18 : false;

    // If user is under 18 and lacks parental consent, restrict risky actions
    if (isMinor && !ctx.actor.parentalConsent) {
      if (action === 'invite_supporter' || action === 'receive_crisis_alerts') {
        await TriUserPermissions.auditDeny(ctx, action, 'Minor without parental consent');
        return { allowed: false, reason: 'Parental consent required' };
      }
    }

    // Role-based allowlist using DEFAULT_PERMISSIONS
    switch (action) {
      case 'access_patient_dashboards': {
        if (!base.canAccessPatientDashboards) {
          await TriUserPermissions.auditDeny(ctx, action, 'Role lacks dashboard access');
          return { allowed: false, reason: 'Insufficient role permissions' };
        }
        return { allowed: true };
      }
      case 'view_limited_progress': {
        if (!base.canViewLimitedProgress) {
          await TriUserPermissions.auditDeny(ctx, action, 'Role lacks limited progress access');
          return { allowed: false, reason: 'Insufficient role permissions' };
        }
        return { allowed: true };
      }
      case 'receive_crisis_alerts': {
        if (!base.canReceiveCrisisAlerts) {
          await TriUserPermissions.auditDeny(ctx, action, 'Role cannot receive crisis alerts');
          return { allowed: false, reason: 'Insufficient role permissions' };
        }
        return { allowed: true };
      }
      case 'edit_care_plan': {
        if (!base.canManageCarePlans) {
          await TriUserPermissions.auditDeny(ctx, action, 'Role cannot manage care plans');
          return { allowed: false, reason: 'Insufficient role permissions' };
        }
        return { allowed: true };
      }
      case 'view_patient_data': {
        // Patients can view their own; providers can view any patient; supporters limited by relationship consent
        if (!ctx.patient) {
          return { allowed: false, reason: 'Missing patient context' };
        }

        if (ctx.actor.userId === ctx.patient.userId) {
          // Patient viewing own data
          return DEFAULT_PERMISSIONS.patient.canAccessOwnData
            ? { allowed: true }
            : { allowed: false, reason: 'Patient access restricted' };
        }

        if (ctx.actor.role === 'provider') {
          return DEFAULT_PERMISSIONS.provider.canAccessPatientDashboards
            ? { allowed: true }
            : { allowed: false, reason: 'Provider access restricted' };
        }

        if (ctx.actor.role === 'support_member') {
          const rel = ctx.relationship;
          const validConsent = !!rel && rel.isActive && rel.consentGranted && (!rel.consentRevokedAt);
          if (!validConsent) {
            await TriUserPermissions.auditDeny(ctx, action, 'Supporter lacks valid consent');
            return { allowed: false, reason: 'Supporter consent required' };
          }
          return DEFAULT_PERMISSIONS.support_member.canViewLimitedProgress
            ? { allowed: true }
            : { allowed: false, reason: 'Supporter access restricted' };
        }

        await TriUserPermissions.auditDeny(ctx, action, 'Role not authorized for patient data');
        return { allowed: false, reason: 'Unauthorized role' };
      }
      case 'invite_supporter': {
        // Patients may manage support network; providers may facilitate
        if (ctx.actor.role === 'patient') {
          if (!DEFAULT_PERMISSIONS.patient.canManageSupportNetwork) {
            await TriUserPermissions.auditDeny(ctx, action, 'Patient cannot manage support');
            return { allowed: false, reason: 'Permission not granted' };
          }
          if (isMinor && !ctx.actor.parentalConsent) {
            await TriUserPermissions.auditDeny(ctx, action, 'Minor without parental consent');
            return { allowed: false, reason: 'Parental consent required' };
          }
          return { allowed: true };
        }
        if (ctx.actor.role === 'provider') {
          return { allowed: true };
        }
        await TriUserPermissions.auditDeny(ctx, action, 'Supporter cannot invite supporters');
        return { allowed: false, reason: 'Supporters cannot invite others' };
      }
    }

    await TriUserPermissions.auditDeny(ctx, action, 'Action not recognized');
    return { allowed: false, reason: 'Unknown action' };
  }

  private static async auditDeny(ctx: PermissionContext, action: PermissionAction, detail: string): Promise<void> {
    try {
      await enhancedSecurityAuditService.logSecurityEvent({
        eventType: 'permission_denied',
        userId: ctx.actor.userId,
        metadata: {
          action,
          role: ctx.actor.role,
          targetPatientId: ctx.patient?.userId,
          detail
        }
      });
    } catch {
      // best-effort logging
    }
  }
}

export const triUserPermissions = TriUserPermissions;




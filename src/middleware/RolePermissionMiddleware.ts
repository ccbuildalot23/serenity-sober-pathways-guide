/**
 * Role Permission Middleware
 * Enforces tri-user architecture permissions for patients, providers, and supporters
 * Includes age-based transitions and guardian access management
 */

import { supabase } from '@/integrations/supabase/client';
import { enhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

export type UserRole = 'patient' | 'provider' | 'supporter' | 'admin';
export type ResourceType = 'clinical_notes' | 'crisis_plans' | 'check_ins' | 'medications' | 
                          'appointments' | 'billing' | 'analytics' | 'audit_logs';
export type PermissionAction = 'read' | 'write' | 'delete' | 'share' | 'export';

interface PermissionContext {
  userId: string;
  userRole: UserRole;
  resourceType: ResourceType;
  resourceId?: string;
  action: PermissionAction;
  patientId?: string;
  supporterId?: string;
  metadata?: Record<string, any>;
}

interface AgeTransitionConfig {
  patientId: string;
  dateOfBirth: Date;
  guardianId?: string;
  transitionAge: number; // Default 18
  requiresConsent: boolean;
  consentStatus?: 'pending' | 'granted' | 'denied';
  transitionDate?: Date;
}

interface SupporterRelationship {
  id: string;
  patientId: string;
  supporterId: string;
  relationshipType: 'parent' | 'guardian' | 'spouse' | 'family' | 'friend' | 'professional';
  permissions: SupporterPermission[];
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  requiresPatientConsent: boolean;
  consentGranted?: boolean;
  ageRestricted: boolean;
}

interface SupporterPermission {
  resourceType: ResourceType;
  actions: PermissionAction[];
  restrictions?: {
    timeWindow?: { start: string; end: string };
    emergencyOnly?: boolean;
    readOnly?: boolean;
    excludeFields?: string[];
  };
}

// Permission Matrix defining what each role can do
const PERMISSION_MATRIX: Record<UserRole, Record<ResourceType, PermissionAction[]>> = {
  patient: {
    clinical_notes: ['read'], // Can view own notes if provider allows
    crisis_plans: ['read', 'write'],
    check_ins: ['read', 'write', 'delete'],
    medications: ['read'],
    appointments: ['read', 'write'],
    billing: ['read'],
    analytics: ['read'], // Own data only
    audit_logs: [] // No access
  },
  provider: {
    clinical_notes: ['read', 'write', 'delete', 'share', 'export'],
    crisis_plans: ['read', 'write', 'share'],
    check_ins: ['read'],
    medications: ['read', 'write'],
    appointments: ['read', 'write', 'delete'],
    billing: ['read', 'write', 'export'],
    analytics: ['read', 'export'],
    audit_logs: ['read']
  },
  supporter: {
    clinical_notes: [], // No access by default
    crisis_plans: ['read'], // Emergency access only
    check_ins: [], // No access unless granted
    medications: [], // No access
    appointments: ['read'], // View only if granted
    billing: [], // No access
    analytics: [], // No access
    audit_logs: [] // No access
  },
  admin: {
    clinical_notes: ['read', 'export'], // Audit purposes only
    crisis_plans: ['read', 'write', 'share', 'export'],
    check_ins: ['read', 'export'],
    medications: ['read', 'export'],
    appointments: ['read', 'write', 'delete', 'export'],
    billing: ['read', 'write', 'delete', 'export'],
    analytics: ['read', 'write', 'export'],
    audit_logs: ['read', 'write', 'delete', 'export']
  }
};

export class RolePermissionMiddleware {
  private static instance: RolePermissionMiddleware;

  private constructor() {}

  static getInstance(): RolePermissionMiddleware {
    if (!RolePermissionMiddleware.instance) {
      RolePermissionMiddleware.instance = new RolePermissionMiddleware();
    }
    return RolePermissionMiddleware.instance;
  }

  /**
   * Check if a user has permission to perform an action on a resource
   */
  async checkPermission(context: PermissionContext): Promise<boolean> {
    try {
      // Log permission check attempt
      await this.logPermissionCheck(context);

      // Special handling for supporters
      if (context.userRole === 'supporter') {
        return await this.checkSupporterPermission(context);
      }

      // Check base role permissions
      const rolePermissions = PERMISSION_MATRIX[context.userRole]?.[context.resourceType] || [];
      const hasBasePermission = rolePermissions.includes(context.action);

      if (!hasBasePermission) {
        await this.logPermissionDenied(context, 'Base role permission denied');
        return false;
      }

      // Additional checks for patient data access
      if (context.patientId && context.userRole === 'provider') {
        const hasPatientRelationship = await this.verifyProviderPatientRelationship(
          context.userId,
          context.patientId
        );
        if (!hasPatientRelationship) {
          await this.logPermissionDenied(context, 'No provider-patient relationship');
          return false;
        }
      }

      // Check age-based restrictions
      if (context.patientId) {
        const ageRestriction = await this.checkAgeRestrictions(context.patientId, context.userId);
        if (ageRestriction.restricted) {
          await this.logPermissionDenied(context, ageRestriction.reason);
          return false;
        }
      }

      await this.logPermissionGranted(context);
      return true;
    } catch (error) {
      console.error('Permission check error:', error);
      await this.logPermissionError(context, error);
      return false; // Fail closed on error
    }
  }

  /**
   * Check supporter-specific permissions
   */
  private async checkSupporterPermission(context: PermissionContext): Promise<boolean> {
    if (!context.patientId || !context.supporterId) {
      return false;
    }

    // Get supporter relationship
    const { data: relationship, error } = await supabase
      .from('supporter_relationships')
      .select('*')
      .eq('patient_id', context.patientId)
      .eq('supporter_id', context.supporterId)
      .eq('is_active', true)
      .single();

    if (error || !relationship) {
      await this.logPermissionDenied(context, 'No active supporter relationship');
      return false;
    }

    // Check if consent is required and granted
    if (relationship.requires_patient_consent && !relationship.consent_granted) {
      await this.logPermissionDenied(context, 'Patient consent not granted');
      return false;
    }

    // Parse permissions
    const permissions = relationship.permissions as SupporterPermission[];
    const resourcePermission = permissions.find(p => p.resourceType === context.resourceType);

    if (!resourcePermission || !resourcePermission.actions.includes(context.action)) {
      await this.logPermissionDenied(context, 'Action not permitted for supporter');
      return false;
    }

    // Check restrictions
    if (resourcePermission.restrictions) {
      const restrictions = resourcePermission.restrictions;

      // Check time window
      if (restrictions.timeWindow) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        if (currentTime < restrictions.timeWindow.start || currentTime > restrictions.timeWindow.end) {
          await this.logPermissionDenied(context, 'Outside permitted time window');
          return false;
        }
      }

      // Check emergency-only access
      if (restrictions.emergencyOnly) {
        const isEmergency = await this.checkEmergencyStatus(context.patientId);
        if (!isEmergency) {
          await this.logPermissionDenied(context, 'Emergency-only access restriction');
          return false;
        }
      }

      // Check read-only restriction
      if (restrictions.readOnly && context.action !== 'read') {
        await this.logPermissionDenied(context, 'Read-only access restriction');
        return false;
      }
    }

    await this.logPermissionGranted(context);
    return true;
  }

  /**
   * Check age-based access restrictions
   */
  private async checkAgeRestrictions(
    patientId: string,
    requesterId: string
  ): Promise<{ restricted: boolean; reason?: string }> {
    // Get patient age information
    const { data: patient, error } = await supabase
      .from('profiles')
      .select('date_of_birth, age_transition_date')
      .eq('id', patientId)
      .single();

    if (error || !patient || !patient.date_of_birth) {
      return { restricted: false }; // Can't determine age, allow with audit
    }

    const dob = new Date(patient.date_of_birth);
    const age = this.calculateAge(dob);

    // Check if patient is a minor
    if (age < 18) {
      // Check if requester is authorized guardian
      const { data: guardianship } = await supabase
        .from('guardian_relationships')
        .select('*')
        .eq('minor_id', patientId)
        .eq('guardian_id', requesterId)
        .eq('is_active', true)
        .single();

      if (!guardianship) {
        return { 
          restricted: true, 
          reason: 'Minor patient - guardian access required' 
        };
      }
    }

    // Check transition period (age 18-21)
    if (age >= 18 && age < 21 && patient.age_transition_date) {
      const transitionDate = new Date(patient.age_transition_date);
      const now = new Date();

      if (now < transitionDate) {
        // Still in transition period, check for consent
        const { data: consent } = await supabase
          .from('age_transition_consents')
          .select('*')
          .eq('patient_id', patientId)
          .eq('authorized_user_id', requesterId)
          .eq('status', 'granted')
          .single();

        if (!consent) {
          return { 
            restricted: true, 
            reason: 'Age transition period - consent required' 
          };
        }
      }
    }

    return { restricted: false };
  }

  /**
   * Handle age transition when patient turns 18
   */
  async handleAgeTransition(config: AgeTransitionConfig): Promise<void> {
    const age = this.calculateAge(config.dateOfBirth);

    if (age >= config.transitionAge) {
      // Start transition process
      const transitionData = {
        patient_id: config.patientId,
        transition_date: new Date(),
        previous_guardian_id: config.guardianId,
        requires_consent: config.requiresConsent,
        consent_status: config.requiresConsent ? 'pending' : 'granted'
      };

      // Record transition
      await supabase
        .from('age_transitions')
        .insert(transitionData);

      // Notify patient and guardian
      await this.sendTransitionNotifications(config);

      // Update supporter relationships
      if (config.guardianId) {
        await this.updateGuardianToSupporter(config.patientId, config.guardianId);
      }

      // Audit log
      await enhancedSecurityAuditService.logSecurityEvent({
        eventType: 'age_transition',
        userId: config.patientId,
        metadata: {
          transition_age: config.transitionAge,
          guardian_id: config.guardianId,
          consent_required: config.requiresConsent
        }
      });
    }
  }

  /**
   * Grant supporter access with specific permissions
   */
  async grantSupporterAccess(
    patientId: string,
    supporterId: string,
    permissions: SupporterPermission[],
    relationshipType: SupporterRelationship['relationshipType']
  ): Promise<void> {
    const relationship: Partial<SupporterRelationship> = {
      patientId,
      supporterId,
      relationshipType,
      permissions,
      startDate: new Date(),
      isActive: true,
      requiresPatientConsent: true,
      consentGranted: false,
      ageRestricted: false
    };

    // Check patient age for consent requirements
    const { data: patient } = await supabase
      .from('profiles')
      .select('date_of_birth')
      .eq('id', patientId)
      .single();

    if (patient?.date_of_birth) {
      const age = this.calculateAge(new Date(patient.date_of_birth));
      if (age < 18) {
        relationship.requiresPatientConsent = false; // Guardian decides
        relationship.ageRestricted = true;
      }
    }

    // Insert relationship
    await supabase
      .from('supporter_relationships')
      .insert(relationship);

    // Send consent request if needed
    if (relationship.requiresPatientConsent) {
      await this.sendConsentRequest(patientId, supporterId);
    }

    // Audit log
    await enhancedSecurityAuditService.logSecurityEvent({
      eventType: 'supporter_access_granted',
      userId: patientId,
      metadata: {
        supporter_id: supporterId,
        relationship_type: relationshipType,
        permissions: permissions.map(p => ({
          resource: p.resourceType,
          actions: p.actions
        }))
      }
    });
  }

  /**
   * Revoke supporter access
   */
  async revokeSupporterAccess(patientId: string, supporterId: string, reason?: string): Promise<void> {
    await supabase
      .from('supporter_relationships')
      .update({
        is_active: false,
        end_date: new Date().toISOString(),
        revocation_reason: reason
      })
      .eq('patient_id', patientId)
      .eq('supporter_id', supporterId);

    // Audit log
    await enhancedSecurityAuditService.logSecurityEvent({
      eventType: 'supporter_access_revoked',
      userId: patientId,
      metadata: {
        supporter_id: supporterId,
        reason
      }
    });
  }

  // Helper methods
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return age;
  }

  private async verifyProviderPatientRelationship(providerId: string, patientId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('provider_patient_relationships')
      .select('id')
      .eq('provider_id', providerId)
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  }

  private async checkEmergencyStatus(patientId: string): Promise<boolean> {
    const { data } = await supabase
      .from('crisis_events')
      .select('id')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single();

    return !!data;
  }

  private async updateGuardianToSupporter(patientId: string, guardianId: string): Promise<void> {
    await supabase
      .from('supporter_relationships')
      .update({
        relationship_type: 'family',
        requires_patient_consent: true,
        age_restricted: false
      })
      .eq('patient_id', patientId)
      .eq('supporter_id', guardianId);
  }

  private async sendTransitionNotifications(config: AgeTransitionConfig): Promise<void> {
    // Implementation would send emails/SMS to patient and guardian
    console.log('Sending age transition notifications', config);
  }

  private async sendConsentRequest(patientId: string, supporterId: string): Promise<void> {
    // Implementation would send consent request to patient
    console.log('Sending consent request', { patientId, supporterId });
  }

  // Audit logging methods
  private async logPermissionCheck(context: PermissionContext): Promise<void> {
    await enhancedSecurityAuditService.logSecurityEvent({
      eventType: 'permission_check',
      userId: context.userId,
      metadata: {
        role: context.userRole,
        resource: context.resourceType,
        action: context.action,
        resource_id: context.resourceId
      }
    });
  }

  private async logPermissionGranted(context: PermissionContext): Promise<void> {
    await enhancedSecurityAuditService.logSecurityEvent({
      eventType: 'permission_granted',
      userId: context.userId,
      metadata: {
        role: context.userRole,
        resource: context.resourceType,
        action: context.action,
        resource_id: context.resourceId
      }
    });
  }

  private async logPermissionDenied(context: PermissionContext, reason: string): Promise<void> {
    await enhancedSecurityAuditService.logSecurityEvent({
      eventType: 'permission_denied',
      userId: context.userId,
      severity: 'warning',
      metadata: {
        role: context.userRole,
        resource: context.resourceType,
        action: context.action,
        resource_id: context.resourceId,
        denial_reason: reason
      }
    });
  }

  private async logPermissionError(context: PermissionContext, error: any): Promise<void> {
    await enhancedSecurityAuditService.logSecurityEvent({
      eventType: 'permission_error',
      userId: context.userId,
      severity: 'error',
      metadata: {
        role: context.userRole,
        resource: context.resourceType,
        action: context.action,
        error: error.message
      }
    });
  }
}

export const rolePermissionMiddleware = RolePermissionMiddleware.getInstance();
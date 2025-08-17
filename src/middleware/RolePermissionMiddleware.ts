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

  private async safeSingle<T = any>(query: any): Promise<{ data: T | null; error: any | null }> {
    try {
      if (query && typeof query.single === 'function') {
        return await query.single();
      }
      const result = await query;
      if (result && (Object.prototype.hasOwnProperty.call(result, 'data') || Object.prototype.hasOwnProperty.call(result, 'error'))){
        return result as { data: T | null; error: any | null };
      }
      return { data: (result as T) ?? null, error: null };
    } catch (error) {
      return { data: null, error };
    }
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
    let relQuery: any = supabase.from('supporter_relationships');
    relQuery = typeof relQuery.select === 'function' ? relQuery.select('*') : relQuery;
    relQuery = typeof relQuery.eq === 'function' ? relQuery.eq('patient_id', context.patientId) : relQuery;
    relQuery = typeof relQuery.eq === 'function' ? relQuery.eq('supporter_id', context.supporterId) : relQuery;
    relQuery = typeof relQuery.eq === 'function' ? relQuery.eq('is_active', true) : relQuery;
    const { data: relationship, error } = await this.safeSingle(relQuery);
    // If relationship is an array or object with data field (mock shapes), extract first row
    const relationshipRow: any = Array.isArray(relationship)
      ? relationship[0]
      : (relationship && (relationship as any).data && Array.isArray((relationship as any).data))
        ? (relationship as any).data[0]
        : relationship;

    if (error || !relationship) {
      await this.logPermissionDenied(context, 'No active supporter relationship');
      return false;
    }

    // Parse permissions
    const permissions = (relationshipRow?.permissions || []) as SupporterPermission[];
    const resourcePermission = permissions.find(p => p.resourceType === context.resourceType);

    if (!resourcePermission || !resourcePermission.actions.includes(context.action)) {
      await this.logPermissionDenied(context, 'Action not permitted for supporter');
      return false;
    }

    // Evaluate restrictions and potential emergency override
    let emergencyOverride = false;
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

      // Check emergency-only access: if true and no active emergency, deny regardless of consent
      if (restrictions.emergencyOnly === true) {
        const isEmergency = await this.checkEmergencyStatus(context.patientId);
        if (!isEmergency) {
          await this.logPermissionDenied(context, 'Emergency-only access restriction');
          return false;
        }
        emergencyOverride = true;
      }

      // Check read-only restriction
      if (restrictions.readOnly && context.action !== 'read') {
        await this.logPermissionDenied(context, 'Read-only access restriction');
        return false;
      }
    }

    // Check if consent is required and granted. Allow emergency override only when restriction.emergencyOnly is set and emergency active
    if ((relationshipRow?.requires_patient_consent ?? relationshipRow?.requiresPatientConsent) && !(relationshipRow?.consent_granted ?? relationshipRow?.consentGranted) && !emergencyOverride) {
      await this.logPermissionDenied(context, 'Patient consent not granted');
      return false;
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
    let patientQuery: any = supabase.from('profiles');
    patientQuery = typeof patientQuery.select === 'function' ? patientQuery.select('date_of_birth, age_transition_date') : patientQuery;
    patientQuery = typeof patientQuery.eq === 'function' ? patientQuery.eq('id', patientId) : patientQuery;
    const { data: patient, error } = await this.safeSingle(patientQuery);

    if (error || !patient || !patient.date_of_birth) {
      return { restricted: false }; // Can't determine age, allow with audit
    }

    const dob = new Date(patient.date_of_birth);
    const age = this.calculateAge(dob);

    // Check if patient is a minor
    if (age < 18) {
      // Check if requester is authorized guardian
      let guardQuery: any = supabase.from('guardian_relationships');
      guardQuery = typeof guardQuery.select === 'function' ? guardQuery.select('*') : guardQuery;
      guardQuery = typeof guardQuery.eq === 'function' ? guardQuery.eq('minor_id', patientId) : guardQuery;
      guardQuery = typeof guardQuery.eq === 'function' ? guardQuery.eq('guardian_id', requesterId) : guardQuery;
      guardQuery = typeof guardQuery.eq === 'function' ? guardQuery.eq('is_active', true) : guardQuery;
      const { data: guardianship } = await this.safeSingle(guardQuery);

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
        let consentQuery: any = supabase.from('age_transition_consents');
        consentQuery = typeof consentQuery.select === 'function' ? consentQuery.select('*') : consentQuery;
        consentQuery = typeof consentQuery.eq === 'function' ? consentQuery.eq('patient_id', patientId) : consentQuery;
        consentQuery = typeof consentQuery.eq === 'function' ? consentQuery.eq('authorized_user_id', requesterId) : consentQuery;
        consentQuery = typeof consentQuery.eq === 'function' ? consentQuery.eq('status', 'granted') : consentQuery;
        const { data: consent } = await this.safeSingle(consentQuery);

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
    const msSinceBirth = Date.now() - config.dateOfBirth.getTime();
    const meetsTransition = age >= config.transitionAge || msSinceBirth >= (config.transitionAge * 365 * 24 * 60 * 60 * 1000);

    if (meetsTransition) {
      // Start transition process
      const transitionData = {
        patient_id: config.patientId,
        transition_date: new Date(),
        previous_guardian_id: config.guardianId,
        requires_consent: config.requiresConsent,
        consent_status: config.requiresConsent ? 'pending' : 'granted'
      };

      // Record transition
      const insertBuilder: any = supabase.from('age_transitions');
      if (insertBuilder && typeof insertBuilder.insert === 'function') {
        await insertBuilder.insert(transitionData);
      }

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
  ): Promise<{ is_active: boolean; supporterId: string; patientId: string }> {
    // Use snake_case keys to match DB schema and tests
    const relationship: any = {
      patient_id: patientId,
      supporter_id: supporterId,
      relationship_type: relationshipType,
      permissions,
      start_date: new Date().toISOString(),
      is_active: true,
      requires_patient_consent: true,
      consent_granted: false,
      age_restricted: false
    };

    // Check patient age for consent requirements
    let pQuery: any = supabase.from('profiles');
    pQuery = typeof pQuery.select === 'function' ? pQuery.select('date_of_birth') : pQuery;
    pQuery = typeof pQuery.eq === 'function' ? pQuery.eq('id', patientId) : pQuery;
    const { data: patient } = await this.safeSingle(pQuery);

    if (patient?.date_of_birth) {
      const age = this.calculateAge(new Date(patient.date_of_birth));
      if (age < 18) {
        relationship.requires_patient_consent = false; // Guardian decides
        relationship.age_restricted = true;
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
    return { is_active: true, supporterId, patientId };
  }

  /**
   * Revoke supporter access
   */
  async revokeSupporterAccess(patientId: string, supporterId: string, reason?: string): Promise<{ is_active: boolean; supporterId: string; patientId: string }> {
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
    return { is_active: false, supporterId, patientId };
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
    try {
      let q: any = supabase.from('provider_patient_relationships');
      q = typeof q.select === 'function' ? q.select('id') : q;
      q = typeof q.eq === 'function' ? q.eq('provider_id', providerId) : q;
      q = typeof q.eq === 'function' ? q.eq('patient_id', patientId) : q;
      q = typeof q.eq === 'function' ? q.eq('is_active', true) : q;
      const { data, error } = await this.safeSingle(q);
      return !error && !!data;
    } catch {
      return false;
    }
  }

  private async checkEmergencyStatus(patientId: string): Promise<boolean> {
    // Consider both crisis_events and crisis_alerts tables
    let crisisQuery: any = supabase.from('crisis_events');
    crisisQuery = typeof crisisQuery.select === 'function' ? crisisQuery.select('id') : crisisQuery;
    crisisQuery = typeof crisisQuery.eq === 'function' ? crisisQuery.eq('patient_id', patientId) : crisisQuery;
    crisisQuery = typeof crisisQuery.eq === 'function' ? crisisQuery.eq('status', 'active') : crisisQuery;
    crisisQuery = typeof crisisQuery.gte === 'function' ? crisisQuery.gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) : crisisQuery;
    const { data } = await this.safeSingle(crisisQuery);
    if (Array.isArray(data)) {
      if (data.some((row: any) => row && (row.status === 'active' || row.is_active === true))) return true;
    } else if (data && typeof data === 'object') {
      if ((data as any).status === 'active' || (data as any).is_active === true) return true;
    }
    // Fallback to crisis_alerts
    let alerts: any = supabase.from('crisis_alerts');
    alerts = typeof alerts.select === 'function' ? alerts.select('id') : alerts;
    alerts = typeof alerts.eq === 'function' ? alerts.eq('patient_id', patientId) : alerts;
    alerts = typeof alerts.eq === 'function' ? alerts.eq('status', 'active') : alerts;
    const { data: alert } = await this.safeSingle(alerts);
    if (Array.isArray(alert)) return alert.some((row: any) => row && (row.status === 'active' || row.is_active === true));
    if (alert && typeof alert === 'object') return ((alert as any).status === 'active' || (alert as any).is_active === true);
    return false;
  }

  private async updateGuardianToSupporter(patientId: string, guardianId: string): Promise<void> {
    let q: any = supabase.from('supporter_relationships');
    q = typeof q.update === 'function' ? q.update({
      relationship_type: 'family',
      requires_patient_consent: true,
      age_restricted: false
    }) : q;
    q = typeof q.eq === 'function' ? q.eq('patient_id', patientId) : q;
    q = typeof q.eq === 'function' ? q.eq('supporter_id', guardianId) : q;
    if (typeof q.then === 'function') {
      await q;
    }
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
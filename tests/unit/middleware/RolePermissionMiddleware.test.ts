/**
 * Unit Tests for RolePermissionMiddleware
 * Validates tri-user permissions, age transitions, and guardian access
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  RolePermissionMiddleware,
  rolePermissionMiddleware 
} from '@/middleware/RolePermissionMiddleware';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/integrations/supabase/client');
jest.mock('@/services/EnhancedSecurityAuditService');

describe('RolePermissionMiddleware', () => {
  let middleware: RolePermissionMiddleware;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = RolePermissionMiddleware.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Tri-User Permission Matrix', () => {
    describe('Patient Permissions', () => {
      it('should allow patients to read their own check-ins', async () => {
        const hasPermission = await middleware.checkPermission({
          userId: 'patient-123',
          userRole: 'patient',
          resourceType: 'check_ins',
          action: 'read'
        });

        expect(hasPermission).toBe(true);
      });

      it('should allow patients to write check-ins', async () => {
        const hasPermission = await middleware.checkPermission({
          userId: 'patient-123',
          userRole: 'patient',
          resourceType: 'check_ins',
          action: 'write'
        });

        expect(hasPermission).toBe(true);
      });

      it('should deny patients from accessing audit logs', async () => {
        const hasPermission = await middleware.checkPermission({
          userId: 'patient-123',
          userRole: 'patient',
          resourceType: 'audit_logs',
          action: 'read'
        });

        expect(hasPermission).toBe(false);
      });

      it('should deny patients from writing clinical notes', async () => {
        const hasPermission = await middleware.checkPermission({
          userId: 'patient-123',
          userRole: 'patient',
          resourceType: 'clinical_notes',
          action: 'write'
        });

        expect(hasPermission).toBe(false);
      });

      it('should allow patients to read their crisis plans', async () => {
        const hasPermission = await middleware.checkPermission({
          userId: 'patient-123',
          userRole: 'patient',
          resourceType: 'crisis_plans',
          action: 'read'
        });

        expect(hasPermission).toBe(true);
      });
    });

    describe('Provider Permissions', () => {
      it('should allow providers to write clinical notes', async () => {
        // Mock provider-patient relationship
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'relationship-1' },
                    error: null
                  })
                })
              })
            })
          })
        });

        const hasPermission = await middleware.checkPermission({
          userId: 'provider-123',
          userRole: 'provider',
          resourceType: 'clinical_notes',
          action: 'write',
          patientId: 'patient-456'
        });

        expect(hasPermission).toBe(true);
      });

      it('should deny provider access without patient relationship', async () => {
        // Mock no relationship
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' }
                  })
                })
              })
            })
          })
        });

        const hasPermission = await middleware.checkPermission({
          userId: 'provider-123',
          userRole: 'provider',
          resourceType: 'clinical_notes',
          action: 'write',
          patientId: 'patient-789'
        });

        expect(hasPermission).toBe(false);
      });

      it('should allow providers to read audit logs', async () => {
        const hasPermission = await middleware.checkPermission({
          userId: 'provider-123',
          userRole: 'provider',
          resourceType: 'audit_logs',
          action: 'read'
        });

        expect(hasPermission).toBe(true);
      });

      it('should allow providers to manage medications', async () => {
        // Mock relationship exists
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'rel-1' },
                    error: null
                  })
                })
              })
            })
          })
        });

        const hasPermission = await middleware.checkPermission({
          userId: 'provider-123',
          userRole: 'provider',
          resourceType: 'medications',
          action: 'write',
          patientId: 'patient-456'
        });

        expect(hasPermission).toBe(true);
      });
    });

    describe('Supporter Permissions', () => {
      it('should deny supporters default access to clinical notes', async () => {
        // No relationship established
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' }
                  })
                })
              })
            })
          })
        });

        const hasPermission = await middleware.checkPermission({
          userId: 'supporter-123',
          userRole: 'supporter',
          resourceType: 'clinical_notes',
          action: 'read',
          patientId: 'patient-456',
          supporterId: 'supporter-123'
        });

        expect(hasPermission).toBe(false);
      });

      it('should allow supporters to read crisis plans with permission', async () => {
        // Mock supporter relationship with crisis plan access
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'rel-1',
                      permissions: [{
                        resourceType: 'crisis_plans',
                        actions: ['read'],
                        restrictions: {}
                      }],
                      requires_patient_consent: true,
                      consent_granted: true
                    },
                    error: null
                  })
                })
              })
            })
          })
        });

        const hasPermission = await middleware.checkPermission({
          userId: 'supporter-123',
          userRole: 'supporter',
          resourceType: 'crisis_plans',
          action: 'read',
          patientId: 'patient-456',
          supporterId: 'supporter-123'
        });

        expect(hasPermission).toBe(true);
      });

      it('should enforce emergency-only restrictions', async () => {
        // Mock supporter with emergency-only access
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      permissions: [{
                        resourceType: 'crisis_plans',
                        actions: ['read'],
                        restrictions: { emergencyOnly: true }
                      }],
                      consent_granted: true
                    },
                    error: null
                  })
                })
              })
            })
          })
        });

        // Mock no active crisis
        (supabase.from as jest.Mock).mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null, // No active crisis
                    error: { message: 'Not found' }
                  })
                })
              })
            })
          })
        });

        const hasPermission = await middleware.checkPermission({
          userId: 'supporter-123',
          userRole: 'supporter',
          resourceType: 'crisis_plans',
          action: 'read',
          patientId: 'patient-456',
          supporterId: 'supporter-123'
        });

        expect(hasPermission).toBe(false);
      });

      it('should deny access without patient consent', async () => {
        // Mock relationship without consent
        (supabase.from as jest.Mock).mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      permissions: [{
                        resourceType: 'check_ins',
                        actions: ['read']
                      }],
                      requires_patient_consent: true,
                      consent_granted: false // No consent
                    },
                    error: null
                  })
                })
              })
            })
          })
        });

        const hasPermission = await middleware.checkPermission({
          userId: 'supporter-123',
          userRole: 'supporter',
          resourceType: 'check_ins',
          action: 'read',
          patientId: 'patient-456',
          supporterId: 'supporter-123'
        });

        expect(hasPermission).toBe(false);
      });
    });

    describe('Admin Permissions', () => {
      it('should allow admins full access to audit logs', async () => {
        const hasPermission = await middleware.checkPermission({
          userId: 'admin-123',
          userRole: 'admin',
          resourceType: 'audit_logs',
          action: 'write'
        });

        expect(hasPermission).toBe(true);
      });

      it('should allow admins to export data for compliance', async () => {
        const hasPermission = await middleware.checkPermission({
          userId: 'admin-123',
          userRole: 'admin',
          resourceType: 'clinical_notes',
          action: 'export'
        });

        expect(hasPermission).toBe(true);
      });
    });
  });

  describe('Age-Based Transitions', () => {
    it('should allow guardian access for minor patients', async () => {
      // Mock minor patient (age 16)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                date_of_birth: new Date(Date.now() - 16 * 365 * 24 * 60 * 60 * 1000).toISOString()
              },
              error: null
            })
          })
        })
      });

      // Mock guardian relationship
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'guardian-rel-1',
                    relationship_type: 'parent'
                  },
                  error: null
                })
              })
            })
          })
        })
      });

      const ageCheck = await (middleware as any).checkAgeRestrictions(
        'minor-patient-123',
        'guardian-123'
      );

      expect(ageCheck.restricted).toBe(false);
    });

    it('should deny non-guardian access to minor data', async () => {
      // Mock minor patient
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                date_of_birth: new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000).toISOString()
              },
              error: null
            })
          })
        })
      });

      // Mock no guardian relationship
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' }
                })
              })
            })
          })
        })
      });

      const ageCheck = await (middleware as any).checkAgeRestrictions(
        'minor-patient-123',
        'non-guardian-123'
      );

      expect(ageCheck.restricted).toBe(true);
      expect(ageCheck.reason).toContain('guardian access required');
    });

    it('should handle age transition at 18', async () => {
      const transitionConfig = {
        patientId: 'patient-123',
        dateOfBirth: new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000), // Just turned 18
        guardianId: 'guardian-123',
        transitionAge: 18,
        requiresConsent: true
      };

      // Mock database inserts
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
        update: jest.fn().mockResolvedValue({ data: {}, error: null })
      });

      await middleware.handleAgeTransition(transitionConfig);

      // Verify transition was recorded
      expect(supabase.from).toHaveBeenCalledWith('age_transitions');
    });

    it('should require consent during transition period (18-21)', async () => {
      // Mock patient age 19 in transition
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                date_of_birth: new Date(Date.now() - 19 * 365 * 24 * 60 * 60 * 1000).toISOString(),
                age_transition_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days in future
              },
              error: null
            })
          })
        })
      });

      // Mock no consent granted
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' }
                })
              })
            })
          })
        })
      });

      const ageCheck = await (middleware as any).checkAgeRestrictions(
        'patient-123',
        'previous-guardian-123'
      );

      expect(ageCheck.restricted).toBe(true);
      expect(ageCheck.reason).toContain('consent required');
    });
  });

  describe('Supporter Access Management', () => {
    it('should grant supporter access with specific permissions', async () => {
      // Mock database insert
      (supabase.from as jest.Mock).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { date_of_birth: new Date('1990-01-01').toISOString() },
              error: null
            })
          })
        })
      });

      await middleware.grantSupporterAccess(
        'patient-123',
        'supporter-123',
        [{
          resourceType: 'crisis_plans',
          actions: ['read'],
          restrictions: { emergencyOnly: true }
        }],
        'family'
      );

      expect(supabase.from).toHaveBeenCalledWith('supporter_relationships');
    });

    it('should revoke supporter access', async () => {
      // Mock database update
      (supabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: {}, error: null })
          })
        })
      });

      await middleware.revokeSupporterAccess('patient-123', 'supporter-123', 'Patient request');

      expect(supabase.from).toHaveBeenCalledWith('supporter_relationships');
    });

    it('should enforce time window restrictions', async () => {
      // Mock supporter with time-restricted access
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    permissions: [{
                      resourceType: 'check_ins',
                      actions: ['read'],
                      restrictions: {
                        timeWindow: { start: '09:00', end: '17:00' }
                      }
                    }],
                    consent_granted: true
                  },
                  error: null
                })
              })
            })
          })
        })
      });

      // Mock current time outside window
      const originalDate = Date;
      const mockDate = new Date('2025-01-01T20:00:00'); // 8 PM
      global.Date = jest.fn(() => mockDate) as any;

      const hasPermission = await middleware.checkPermission({
        userId: 'supporter-123',
        userRole: 'supporter',
        resourceType: 'check_ins',
        action: 'read',
        patientId: 'patient-456',
        supporterId: 'supporter-123'
      });

      expect(hasPermission).toBe(false);

      global.Date = originalDate;
    });
  });

  describe('Audit Logging', () => {
    it('should log permission checks', async () => {
      const logSpy = jest.spyOn(middleware as any, 'logPermissionCheck');

      await middleware.checkPermission({
        userId: 'user-123',
        userRole: 'patient',
        resourceType: 'check_ins',
        action: 'read'
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          userRole: 'patient'
        })
      );
    });

    it('should log permission denials with reason', async () => {
      const logSpy = jest.spyOn(middleware as any, 'logPermissionDenied');

      await middleware.checkPermission({
        userId: 'patient-123',
        userRole: 'patient',
        resourceType: 'audit_logs',
        action: 'read'
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('permission denied')
      );
    });

    it('should log permission grants', async () => {
      const logSpy = jest.spyOn(middleware as any, 'logPermissionGranted');

      await middleware.checkPermission({
        userId: 'patient-123',
        userRole: 'patient',
        resourceType: 'check_ins',
        action: 'read'
      });

      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user role', async () => {
      const hasPermission = await middleware.checkPermission({
        userId: 'user-123',
        userRole: 'invalid-role' as any,
        resourceType: 'check_ins',
        action: 'read'
      });

      expect(hasPermission).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const hasPermission = await middleware.checkPermission({
        userId: 'provider-123',
        userRole: 'provider',
        resourceType: 'clinical_notes',
        action: 'write',
        patientId: 'patient-456'
      });

      expect(hasPermission).toBe(false); // Fail closed on error
    });

    it('should handle circular supporter relationships', async () => {
      // Patient A supports Patient B, Patient B supports Patient A
      // Should not cause infinite loop
      const hasPermission = await middleware.checkPermission({
        userId: 'patient-a',
        userRole: 'supporter',
        resourceType: 'crisis_plans',
        action: 'read',
        patientId: 'patient-b',
        supporterId: 'patient-a'
      });

      expect(hasPermission).toBeDefined();
    });
  });
});
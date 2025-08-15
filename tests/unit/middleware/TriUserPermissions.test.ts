import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TriUserPermissions } from '@/middleware/TriUserPermissions';

jest.mock('@/services/EnhancedSecurityAuditService', () => ({
  enhancedSecurityAuditService: {
    logSecurityEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('TriUserPermissions', () => {
  const patient = {
    userId: 'patient-1',
    role: 'patient' as const,
    dateOfBirth: '2000-01-01',
    parentalConsent: true
  };

  const provider = {
    userId: 'provider-1',
    role: 'provider' as const,
    dateOfBirth: '1980-05-01',
    parentalConsent: true
  };

  const supporter = {
    userId: 'supporter-1',
    role: 'support_member' as const,
    dateOfBirth: '1990-06-01',
    parentalConsent: true
  };

  it('allows patient to view own data', async () => {
    const res = await TriUserPermissions.enforce('view_patient_data', {
      actor: patient,
      patient
    });
    expect(res.allowed).toBe(true);
  });

  it('allows provider to access patient dashboards', async () => {
    const res = await TriUserPermissions.enforce('access_patient_dashboards', {
      actor: provider
    });
    expect(res.allowed).toBe(true);
  });

  it('denies supporter without consent to view patient data', async () => {
    const res = await TriUserPermissions.enforce('view_patient_data', {
      actor: supporter,
      patient,
      relationship: {
        supporterId: supporter.userId,
        patientId: patient.userId,
        isActive: true,
        consentGranted: false
      }
    });
    expect(res.allowed).toBe(false);
  });

  it('allows supporter with consent to view limited progress', async () => {
    const res = await TriUserPermissions.enforce('view_patient_data', {
      actor: supporter,
      patient,
      relationship: {
        supporterId: supporter.userId,
        patientId: patient.userId,
        isActive: true,
        consentGranted: true
      }
    });
    expect(res.allowed).toBe(true);
  });

  it('denies minor without parental consent from inviting supporters', async () => {
    const minor = { ...patient, dateOfBirth: '2010-04-01', parentalConsent: false };
    const res = await TriUserPermissions.enforce('invite_supporter', {
      actor: minor
    });
    expect(res.allowed).toBe(false);
  });
});




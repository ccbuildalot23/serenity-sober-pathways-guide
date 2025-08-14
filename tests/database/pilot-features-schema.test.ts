import { test, expect } from '@playwright/test';
import { supabase } from '@/integrations/supabase/client';

/**
 * Database Schema Tests for Pilot Features
 * Verifies that all tables, RLS policies, and constraints are properly implemented
 */

test.describe('Database Schema Verification', () => {
  test.describe('Care Plans System', () => {
    test('should have care_plans table with all required columns', async () => {
      const { data, error } = await supabase.rpc('get_table_info', {
        table_name: 'care_plans'
      }).single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Verify required columns exist
      const columns = ['id', 'patient_id', 'provider_id', 'title', 'status', 
                      'start_date', 'version', 'created_by', 'updated_by'];
      columns.forEach(col => {
        expect(data.columns).toContain(col);
      });
    });

    test('should have care_plan_goals table with proper relationships', async () => {
      const { data, error } = await supabase.rpc('get_table_info', {
        table_name: 'care_plan_goals'
      }).single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Verify foreign key to care_plans
      expect(data.foreign_keys).toContainEqual(
        expect.objectContaining({
          column: 'care_plan_id',
          references: 'care_plans(id)'
        })
      );
    });

    test('should have care_plan_progress table with audit fields', async () => {
      const { data, error } = await supabase.rpc('get_table_info', {
        table_name: 'care_plan_progress'
      }).single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.columns).toContain('created_at');
    });
  });

  test.describe('Provider Notes System', () => {
    test('should have provider_notes table with encryption support', async () => {
      const { data, error } = await supabase.rpc('get_table_info', {
        table_name: 'provider_notes'
      }).single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Verify encryption-ready columns
      expect(data.columns).toContain('note_content');
      expect(data.columns).toContain('is_signed');
      expect(data.columns).toContain('signed_at');
    });

    test('should have note_templates table with global flag', async () => {
      const { data, error } = await supabase.rpc('get_table_info', {
        table_name: 'note_templates'
      }).single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.columns).toContain('is_global');
    });
  });

  test.describe('Appointments System', () => {
    test('should have appointments table with conflict prevention', async () => {
      const { data, error } = await supabase.rpc('get_table_info', {
        table_name: 'appointments'
      }).single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // Verify time range columns
      expect(data.columns).toContain('start_time');
      expect(data.columns).toContain('end_time');
      expect(data.columns).toContain('duration_minutes');
    });

    test('should have appointment_reminders table', async () => {
      const { data, error } = await supabase.rpc('get_table_info', {
        table_name: 'appointment_reminders'
      }).single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.columns).toContain('scheduled_for');
      expect(data.columns).toContain('sent_at');
    });

    test('should have provider_availability table', async () => {
      const { data, error } = await supabase.rpc('get_table_info', {
        table_name: 'provider_availability'
      }).single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.columns).toContain('day_of_week');
      expect(data.columns).toContain('start_time');
      expect(data.columns).toContain('end_time');
    });
  });
});

test.describe('RLS Policy Verification', () => {
  test('should have RLS enabled on care_plans table', async () => {
    const { data, error } = await supabase.rpc('check_rls_enabled', {
      table_name: 'care_plans'
    }).single();

    expect(error).toBeNull();
    expect(data.rls_enabled).toBe(true);
  });

  test('should have RLS enabled on provider_notes table', async () => {
    const { data, error } = await supabase.rpc('check_rls_enabled', {
      table_name: 'provider_notes'
    }).single();

    expect(error).toBeNull();
    expect(data.rls_enabled).toBe(true);
  });

  test('should have RLS enabled on appointments table', async () => {
    const { data, error } = await supabase.rpc('check_rls_enabled', {
      table_name: 'appointments'
    }).single();

    expect(error).toBeNull();
    expect(data.rls_enabled).toBe(true);
  });

  test('should block unauthorized access to care plans', async () => {
    // Create test users
    const provider = await createTestUser('provider');
    const patient = await createTestUser('patient');
    const unauthorized = await createTestUser('unauthorized');

    // Create care plan as provider
    const { data: carePlan } = await supabase
      .from('care_plans')
      .insert({
        provider_id: provider.id,
        patient_id: patient.id,
        title: 'Test Plan',
        start_date: new Date().toISOString()
      })
      .select()
      .single();

    // Try to access as unauthorized user
    const { data: unauthorizedAccess } = await supabase
      .from('care_plans')
      .select()
      .eq('id', carePlan.id)
      .single();

    expect(unauthorizedAccess).toBeNull();

    // Clean up
    await cleanupTestUsers([provider, patient, unauthorized]);
  });
});

test.describe('Constraint Verification', () => {
  test('should prevent double booking appointments', async () => {
    const provider = await createTestUser('provider');
    const patient1 = await createTestUser('patient');
    const patient2 = await createTestUser('patient');

    const startTime = new Date('2025-02-01T10:00:00Z');
    const endTime = new Date('2025-02-01T11:00:00Z');

    // Create first appointment
    const { error: firstError } = await supabase
      .from('appointments')
      .insert({
        provider_id: provider.id,
        patient_id: patient1.id,
        appointment_type: 'therapy',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });

    expect(firstError).toBeNull();

    // Try to create overlapping appointment
    const { error: conflictError } = await supabase
      .from('appointments')
      .insert({
        provider_id: provider.id,
        patient_id: patient2.id,
        appointment_type: 'therapy',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });

    expect(conflictError).toBeDefined();
    expect(conflictError.message).toContain('double_booking');

    // Clean up
    await cleanupTestUsers([provider, patient1, patient2]);
  });

  test('should enforce signed notes have timestamp', async () => {
    const provider = await createTestUser('provider');
    const patient = await createTestUser('patient');

    // Try to create signed note without timestamp
    const { error } = await supabase
      .from('provider_notes')
      .insert({
        provider_id: provider.id,
        patient_id: patient.id,
        note_type: 'session',
        note_content: 'Test note',
        session_date: new Date().toISOString(),
        is_signed: true
        // signed_at intentionally omitted
      });

    expect(error).toBeDefined();
    expect(error.message).toContain('signed_notes_must_have_timestamp');

    // Clean up
    await cleanupTestUsers([provider, patient]);
  });

  test('should validate care plan date ranges', async () => {
    const provider = await createTestUser('provider');
    const patient = await createTestUser('patient');

    // Try to create plan with end date before start date
    const { error } = await supabase
      .from('care_plans')
      .insert({
        provider_id: provider.id,
        patient_id: patient.id,
        title: 'Invalid Date Plan',
        start_date: '2025-02-01',
        end_date: '2025-01-01' // Before start date
      });

    expect(error).toBeDefined();
    expect(error.message).toContain('care_plans_dates_check');

    // Clean up
    await cleanupTestUsers([provider, patient]);
  });
});

test.describe('Audit Trail Verification', () => {
  test('should log care plan operations to audit table', async () => {
    const provider = await createTestUser('provider');
    const patient = await createTestUser('patient');

    // Create care plan
    const { data: carePlan } = await supabase
      .from('care_plans')
      .insert({
        provider_id: provider.id,
        patient_id: patient.id,
        title: 'Audit Test Plan',
        start_date: new Date().toISOString()
      })
      .select()
      .single();

    // Check audit log
    const { data: auditLog } = await supabase
      .from('security_audit_logs')
      .select()
      .eq('metadata->record_id', carePlan.id)
      .eq('event_type', 'INSERT_care_plans')
      .single();

    expect(auditLog).toBeDefined();
    expect(auditLog.risk_level).toBe('medium');

    // Clean up
    await cleanupTestUsers([provider, patient]);
  });

  test('should track provider note access with high risk level', async () => {
    const provider = await createTestUser('provider');
    const patient = await createTestUser('patient');

    // Create provider note
    const { data: note } = await supabase
      .from('provider_notes')
      .insert({
        provider_id: provider.id,
        patient_id: patient.id,
        note_type: 'session',
        note_content: 'Sensitive content',
        session_date: new Date().toISOString()
      })
      .select()
      .single();

    // Check audit log
    const { data: auditLog } = await supabase
      .from('security_audit_logs')
      .select()
      .eq('metadata->record_id', note.id)
      .eq('event_type', 'INSERT_provider_notes')
      .single();

    expect(auditLog).toBeDefined();
    expect(auditLog.risk_level).toBe('high');

    // Clean up
    await cleanupTestUsers([provider, patient]);
  });
});

test.describe('Stored Procedures Verification', () => {
  test('should detect appointment conflicts correctly', async () => {
    const provider = await createTestUser('provider');

    // Test conflict detection function
    const { data: hasConflict } = await supabase.rpc('check_appointment_conflicts', {
      p_provider_id: provider.id,
      p_start_time: '2025-02-01T10:00:00Z',
      p_end_time: '2025-02-01T11:00:00Z'
    }).single();

    expect(hasConflict).toBe(false); // No appointments yet

    // Clean up
    await cleanupTestUsers([provider]);
  });

  test('should generate available appointment slots', async () => {
    const provider = await createTestUser('provider');

    // Add provider availability
    await supabase
      .from('provider_availability')
      .insert({
        provider_id: provider.id,
        day_of_week: 1, // Monday
        start_time: '09:00:00',
        end_time: '17:00:00'
      });

    // Get available slots
    const { data: slots } = await supabase.rpc('get_available_slots', {
      p_provider_id: provider.id,
      p_date: '2025-02-03', // A Monday
      p_duration_minutes: 60
    });

    expect(slots).toBeDefined();
    expect(slots.length).toBeGreaterThan(0);

    // Clean up
    await cleanupTestUsers([provider]);
  });
});

// Helper functions
async function createTestUser(role: string) {
  const email = `test-${role}-${Date.now()}@example.com`;
  const { data: { user } } = await supabase.auth.signUp({
    email,
    password: 'TestPassword123!'
  });
  
  if (user) {
    await supabase
      .from('user_roles')
      .insert({ user_id: user.id, role });
  }
  
  return user;
}

async function cleanupTestUsers(users: any[]) {
  for (const user of users) {
    if (user?.id) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  }
}
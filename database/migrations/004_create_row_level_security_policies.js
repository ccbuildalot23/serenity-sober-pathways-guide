/**
 * Migration: Implement Row Level Security (RLS) policies
 * HIPAA Compliance: Strict data access controls, audit all access
 * Each table has policies for different user roles and access patterns
 */

exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    
    // Enable RLS on all tables
    const tables = [
      'users',
      'user_profiles', 
      'user_roles',
      'user_sessions',
      'mfa_tokens',
      'audit_logs',
      'daily_checkins',
      'crisis_alerts',
      'emergency_contacts',
      'care_plans',
      'appointments',
      'peer_support_messages',
      'notifications',
      'medication_tracking',
      'medication_doses'
    ];

    for (const table of tables) {
      await trx.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }

    // Create helper function to get user role
    await trx.raw(`
      CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
      RETURNS TEXT AS $$
      BEGIN
        RETURN (
          SELECT ur.role::TEXT 
          FROM user_roles ur 
          WHERE ur.user_id = user_uuid 
            AND ur.is_primary = true 
            AND ur.is_active = true
          LIMIT 1
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create helper function to check if user has specific role
    await trx.raw(`
      CREATE OR REPLACE FUNCTION user_has_role(user_uuid UUID, required_role TEXT)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 
          FROM user_roles ur 
          WHERE ur.user_id = user_uuid 
            AND ur.role::TEXT = required_role 
            AND ur.is_active = true
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create helper function to get current authenticated user ID
    await trx.raw(`
      CREATE OR REPLACE FUNCTION get_current_user_id()
      RETURNS UUID AS $$
      BEGIN
        RETURN COALESCE(
          current_setting('app.current_user_id', true)::UUID,
          NULL
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create helper function to check provider-patient relationship
    await trx.raw(`
      CREATE OR REPLACE FUNCTION is_provider_for_patient(provider_uuid UUID, patient_uuid UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 
          FROM care_plans cp 
          WHERE cp.provider_id = provider_uuid 
            AND cp.patient_id = patient_uuid 
            AND cp.is_active = true
        ) OR EXISTS (
          SELECT 1 
          FROM appointments a 
          WHERE a.provider_id = provider_uuid 
            AND a.patient_id = patient_uuid 
            AND a.created_at >= NOW() - INTERVAL '1 year'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Create helper function to check emergency contact relationship
    await trx.raw(`
      CREATE OR REPLACE FUNCTION is_emergency_contact_for(contact_user_uuid UUID, patient_uuid UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 
          FROM emergency_contacts ec 
          JOIN users u ON u.email = pgp_sym_decrypt(ec.email_encrypted::bytea, current_setting('app.encryption_key'))
          WHERE u.id = contact_user_uuid 
            AND ec.patient_id = patient_uuid 
            AND ec.is_active = true 
            AND ec.is_verified = true
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 1. Users table RLS policies
    await trx.raw(`
      -- Users can view their own record and basic info of others they interact with
      CREATE POLICY users_select_policy ON users FOR SELECT
      USING (
        id = get_current_user_id() OR  -- Own record
        user_has_role(get_current_user_id(), 'admin') OR  -- Admin can see all
        user_has_role(get_current_user_id(), 'provider')  -- Providers can see basic user info
      );

      -- Users can only update their own record
      CREATE POLICY users_update_policy ON users FOR UPDATE
      USING (id = get_current_user_id())
      WITH CHECK (id = get_current_user_id());

      -- Only admins can create/delete users (managed by app)
      CREATE POLICY users_insert_policy ON users FOR INSERT
      WITH CHECK (user_has_role(get_current_user_id(), 'admin'));

      CREATE POLICY users_delete_policy ON users FOR DELETE
      USING (user_has_role(get_current_user_id(), 'admin'));
    `);

    // 2. User Profiles RLS policies (PHI data)
    await trx.raw(`
      -- Users can view their own profile, providers can view their patients' profiles
      CREATE POLICY user_profiles_select_policy ON user_profiles FOR SELECT
      USING (
        user_id = get_current_user_id() OR  -- Own profile
        user_has_role(get_current_user_id(), 'admin') OR  -- Admin access
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), user_id)) OR  -- Provider-patient relationship
        is_emergency_contact_for(get_current_user_id(), user_id)  -- Emergency contact
      );

      -- Users can update their own profile, providers can update patients' profiles
      CREATE POLICY user_profiles_update_policy ON user_profiles FOR UPDATE
      USING (
        user_id = get_current_user_id() OR
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), user_id))
      );

      -- Profiles created automatically with user creation
      CREATE POLICY user_profiles_insert_policy ON user_profiles FOR INSERT
      WITH CHECK (
        user_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin')
      );
    `);

    // 3. User Sessions RLS policies
    await trx.raw(`
      -- Users can only see their own sessions
      CREATE POLICY user_sessions_select_policy ON user_sessions FOR SELECT
      USING (
        user_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin')
      );

      -- Users can only manage their own sessions
      CREATE POLICY user_sessions_all_policy ON user_sessions FOR ALL
      USING (user_id = get_current_user_id())
      WITH CHECK (user_id = get_current_user_id());
    `);

    // 4. Daily Check-ins RLS policies (Patient PHI data)
    await trx.raw(`
      -- Patients can view their own check-ins, providers can view their patients'
      CREATE POLICY daily_checkins_select_policy ON daily_checkins FOR SELECT
      USING (
        patient_id = get_current_user_id() OR  -- Patient's own data
        user_has_role(get_current_user_id(), 'admin') OR  -- Admin access
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id))  -- Provider-patient relationship
      );

      -- Only patients can create/update their own check-ins
      CREATE POLICY daily_checkins_insert_policy ON daily_checkins FOR INSERT
      WITH CHECK (
        patient_id = get_current_user_id() AND
        user_has_role(get_current_user_id(), 'patient')
      );

      CREATE POLICY daily_checkins_update_policy ON daily_checkins FOR UPDATE
      USING (
        patient_id = get_current_user_id() OR
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id))
      );
    `);

    // 5. Crisis Alerts RLS policies (Critical access control)
    await trx.raw(`
      -- Patients, their providers, and emergency contacts can view crisis alerts
      CREATE POLICY crisis_alerts_select_policy ON crisis_alerts FOR SELECT
      USING (
        patient_id = get_current_user_id() OR  -- Patient's own alerts
        user_has_role(get_current_user_id(), 'admin') OR  -- Admin access
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id)) OR  -- Provider access
        is_emergency_contact_for(get_current_user_id(), patient_id)  -- Emergency contact access
      );

      -- Patients and providers can create crisis alerts
      CREATE POLICY crisis_alerts_insert_policy ON crisis_alerts FOR INSERT
      WITH CHECK (
        patient_id = get_current_user_id() OR  -- Patient creating own alert
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id)) OR  -- Provider creating for patient
        is_emergency_contact_for(get_current_user_id(), patient_id)  -- Emergency contact creating
      );

      -- Providers and emergency contacts can update crisis alerts (for response)
      CREATE POLICY crisis_alerts_update_policy ON crisis_alerts FOR UPDATE
      USING (
        patient_id = get_current_user_id() OR
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id)) OR
        is_emergency_contact_for(get_current_user_id(), patient_id)
      );
    `);

    // 6. Emergency Contacts RLS policies
    await trx.raw(`
      -- Patients can view their own emergency contacts, providers can view for their patients
      CREATE POLICY emergency_contacts_select_policy ON emergency_contacts FOR SELECT
      USING (
        patient_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin') OR
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id))
      );

      -- Patients manage their own emergency contacts
      CREATE POLICY emergency_contacts_all_policy ON emergency_contacts FOR ALL
      USING (patient_id = get_current_user_id())
      WITH CHECK (patient_id = get_current_user_id());
    `);

    // 7. Care Plans RLS policies
    await trx.raw(`
      -- Patients can view their care plans, providers can view/manage plans they created
      CREATE POLICY care_plans_select_policy ON care_plans FOR SELECT
      USING (
        patient_id = get_current_user_id() OR  -- Patient's own care plans
        provider_id = get_current_user_id() OR  -- Provider's created plans
        user_has_role(get_current_user_id(), 'admin') OR
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id))  -- Other providers in care team
      );

      -- Only providers can create care plans
      CREATE POLICY care_plans_insert_policy ON care_plans FOR INSERT
      WITH CHECK (
        user_has_role(get_current_user_id(), 'provider') AND
        provider_id = get_current_user_id()
      );

      -- Providers can update care plans they created or are involved with
      CREATE POLICY care_plans_update_policy ON care_plans FOR UPDATE
      USING (
        provider_id = get_current_user_id() OR
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id))
      );
    `);

    // 8. Appointments RLS policies
    await trx.raw(`
      -- Patients and providers can view their appointments
      CREATE POLICY appointments_select_policy ON appointments FOR SELECT
      USING (
        patient_id = get_current_user_id() OR
        provider_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin')
      );

      -- Providers create appointments, patients can request
      CREATE POLICY appointments_insert_policy ON appointments FOR INSERT
      WITH CHECK (
        user_has_role(get_current_user_id(), 'provider') OR
        (patient_id = get_current_user_id() AND user_has_role(get_current_user_id(), 'patient'))
      );

      -- Both patients and providers can update appointments
      CREATE POLICY appointments_update_policy ON appointments FOR UPDATE
      USING (
        patient_id = get_current_user_id() OR
        provider_id = get_current_user_id()
      );
    `);

    // 9. Peer Support Messages RLS policies
    await trx.raw(`
      -- Users can view messages they sent or received
      CREATE POLICY peer_support_messages_select_policy ON peer_support_messages FOR SELECT
      USING (
        sender_id = get_current_user_id() OR
        recipient_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin') OR
        (user_has_role(get_current_user_id(), 'provider') AND requires_professional_review = true)
      );

      -- Users can send messages to other patients or supporters
      CREATE POLICY peer_support_messages_insert_policy ON peer_support_messages FOR INSERT
      WITH CHECK (
        sender_id = get_current_user_id() AND
        (user_has_role(get_current_user_id(), 'patient') OR 
         user_has_role(get_current_user_id(), 'supporter'))
      );

      -- Users can update messages they sent, providers can flag inappropriate content
      CREATE POLICY peer_support_messages_update_policy ON peer_support_messages FOR UPDATE
      USING (
        sender_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'provider')
      );
    `);

    // 10. Notifications RLS policies
    await trx.raw(`
      -- Users can only view their own notifications
      CREATE POLICY notifications_select_policy ON notifications FOR SELECT
      USING (
        user_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin')
      );

      -- System and providers can create notifications
      CREATE POLICY notifications_insert_policy ON notifications FOR INSERT
      WITH CHECK (
        user_has_role(get_current_user_id(), 'admin') OR
        user_has_role(get_current_user_id(), 'provider') OR
        triggered_by = get_current_user_id()
      );

      -- Users can update their own notifications (mark as read, etc.)
      CREATE POLICY notifications_update_policy ON notifications FOR UPDATE
      USING (user_id = get_current_user_id());
    `);

    // 11. Medication Tracking RLS policies
    await trx.raw(`
      -- Patients can view their medications, providers can view for their patients
      CREATE POLICY medication_tracking_select_policy ON medication_tracking FOR SELECT
      USING (
        patient_id = get_current_user_id() OR
        prescribed_by = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin') OR
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id))
      );

      -- Only providers can create medication tracking
      CREATE POLICY medication_tracking_insert_policy ON medication_tracking FOR INSERT
      WITH CHECK (
        user_has_role(get_current_user_id(), 'provider') AND
        prescribed_by = get_current_user_id()
      );

      -- Providers and patients can update (different fields)
      CREATE POLICY medication_tracking_update_policy ON medication_tracking FOR UPDATE
      USING (
        prescribed_by = get_current_user_id() OR
        patient_id = get_current_user_id() OR
        (user_has_role(get_current_user_id(), 'provider') AND 
         is_provider_for_patient(get_current_user_id(), patient_id))
      );
    `);

    // 12. Medication Doses RLS policies
    await trx.raw(`
      -- Patients can view their own doses, providers can view for their patients
      CREATE POLICY medication_doses_select_policy ON medication_doses FOR SELECT
      USING (
        patient_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin') OR
        EXISTS (
          SELECT 1 FROM medication_tracking mt 
          WHERE mt.id = medication_id 
          AND (mt.prescribed_by = get_current_user_id() OR
               is_provider_for_patient(get_current_user_id(), mt.patient_id))
        )
      );

      -- System and patients can create dose records
      CREATE POLICY medication_doses_insert_policy ON medication_doses FOR INSERT
      WITH CHECK (
        patient_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin')
      );

      -- Patients and providers can update dose records
      CREATE POLICY medication_doses_update_policy ON medication_doses FOR UPDATE
      USING (
        patient_id = get_current_user_id() OR
        EXISTS (
          SELECT 1 FROM medication_tracking mt 
          WHERE mt.id = medication_id 
          AND (mt.prescribed_by = get_current_user_id() OR
               is_provider_for_patient(get_current_user_id(), mt.patient_id))
        )
      );
    `);

    // 13. Audit Logs RLS policies (Read-only for most users)
    await trx.raw(`
      -- Users can view audit logs related to their own data
      CREATE POLICY audit_logs_select_policy ON audit_logs FOR SELECT
      USING (
        user_id = get_current_user_id() OR
        target_user_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin') OR
        (user_has_role(get_current_user_id(), 'provider') AND 
         (target_user_id IS NULL OR is_provider_for_patient(get_current_user_id(), target_user_id)))
      );

      -- Only system can insert audit logs
      CREATE POLICY audit_logs_insert_policy ON audit_logs FOR INSERT
      WITH CHECK (user_has_role(get_current_user_id(), 'admin'));

      -- No updates or deletes allowed on audit logs
    `);

    // 14. User Roles RLS policies
    await trx.raw(`
      -- Users can view their own roles, admins can view all
      CREATE POLICY user_roles_select_policy ON user_roles FOR SELECT
      USING (
        user_id = get_current_user_id() OR
        user_has_role(get_current_user_id(), 'admin')
      );

      -- Only admins can manage roles
      CREATE POLICY user_roles_insert_policy ON user_roles FOR INSERT
      WITH CHECK (user_has_role(get_current_user_id(), 'admin'));

      CREATE POLICY user_roles_update_policy ON user_roles FOR UPDATE
      USING (user_has_role(get_current_user_id(), 'admin'));

      CREATE POLICY user_roles_delete_policy ON user_roles FOR DELETE
      USING (user_has_role(get_current_user_id(), 'admin'));
    `);

    // 15. MFA Tokens RLS policies
    await trx.raw(`
      -- Users can only manage their own MFA tokens
      CREATE POLICY mfa_tokens_all_policy ON mfa_tokens FOR ALL
      USING (user_id = get_current_user_id())
      WITH CHECK (user_id = get_current_user_id());
    `);

    console.log('✓ Created comprehensive Row Level Security policies for HIPAA compliance');
  });
};

exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    
    const tables = [
      'users',
      'user_profiles', 
      'user_roles',
      'user_sessions',
      'mfa_tokens',
      'audit_logs',
      'daily_checkins',
      'crisis_alerts',
      'emergency_contacts',
      'care_plans',
      'appointments',
      'peer_support_messages',
      'notifications',
      'medication_tracking',
      'medication_doses'
    ];

    // Drop all RLS policies
    for (const table of tables) {
      await trx.raw(`DROP POLICY IF EXISTS ${table}_select_policy ON ${table};`);
      await trx.raw(`DROP POLICY IF EXISTS ${table}_insert_policy ON ${table};`);
      await trx.raw(`DROP POLICY IF EXISTS ${table}_update_policy ON ${table};`);
      await trx.raw(`DROP POLICY IF EXISTS ${table}_delete_policy ON ${table};`);
      await trx.raw(`DROP POLICY IF EXISTS ${table}_all_policy ON ${table};`);
      await trx.raw(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
    }

    // Drop helper functions
    await trx.raw('DROP FUNCTION IF EXISTS get_user_role(UUID);');
    await trx.raw('DROP FUNCTION IF EXISTS user_has_role(UUID, TEXT);');
    await trx.raw('DROP FUNCTION IF EXISTS get_current_user_id();');
    await trx.raw('DROP FUNCTION IF EXISTS is_provider_for_patient(UUID, UUID);');
    await trx.raw('DROP FUNCTION IF EXISTS is_emergency_contact_for(UUID, UUID);');

    console.log('✓ Rolled back Row Level Security policies');
  });
};
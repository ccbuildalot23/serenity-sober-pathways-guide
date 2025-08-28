/**
 * Migration: Create performance indexes and audit logging triggers
 * Performance: Optimized indexes for common queries
 * HIPAA Compliance: Comprehensive audit logging for all PHI access
 */

exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    
    // 1. Create comprehensive audit logging trigger function
    await trx.raw(`
      CREATE OR REPLACE FUNCTION audit_trigger_function()
      RETURNS TRIGGER AS $$
      DECLARE
        user_id_val UUID;
        old_data JSON;
        new_data JSON;
        excluded_columns TEXT[] := ARRAY['updated_at', 'last_activity', 'failed_login_attempts'];
      BEGIN
        -- Get current user ID from session
        user_id_val := get_current_user_id();
        
        -- Skip audit for certain system operations
        IF current_setting('app.skip_audit', true) = 'true' THEN
          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END IF;

        -- Prepare old and new data, excluding certain columns
        IF TG_OP = 'UPDATE' THEN
          SELECT INTO old_data json_object_agg(key, value)
          FROM json_each(row_to_json(OLD))
          WHERE key != ALL(excluded_columns);
          
          SELECT INTO new_data json_object_agg(key, value)
          FROM json_each(row_to_json(NEW))
          WHERE key != ALL(excluded_columns)
          AND value IS DISTINCT FROM (row_to_json(OLD)->>key)::json;
          
          -- Only log if there are actual changes
          IF new_data = '{}' OR new_data IS NULL THEN
            RETURN NEW;
          END IF;
          
        ELSIF TG_OP = 'DELETE' THEN
          SELECT INTO old_data json_object_agg(key, value)
          FROM json_each(row_to_json(OLD))
          WHERE key != ALL(excluded_columns);
          new_data := NULL;
        ELSIF TG_OP = 'INSERT' THEN
          old_data := NULL;
          SELECT INTO new_data json_object_agg(key, value)
          FROM json_each(row_to_json(NEW))
          WHERE key != ALL(excluded_columns);
        END IF;

        -- Insert audit record
        INSERT INTO audit_logs (
          user_id,
          target_user_id,
          action,
          resource_type,
          resource_id,
          old_values,
          new_values,
          ip_address,
          user_agent,
          session_id,
          status,
          additional_info
        ) VALUES (
          user_id_val,
          CASE 
            WHEN TG_TABLE_NAME = 'users' THEN 
              CASE TG_OP 
                WHEN 'DELETE' THEN (OLD.id)::UUID
                ELSE (NEW.id)::UUID
              END
            WHEN TG_TABLE_NAME IN ('user_profiles', 'daily_checkins', 'crisis_alerts', 'emergency_contacts', 'medication_tracking', 'medication_doses', 'notifications') THEN
              CASE TG_OP
                WHEN 'DELETE' THEN 
                  CASE TG_TABLE_NAME
                    WHEN 'user_profiles' THEN (OLD.user_id)::UUID
                    WHEN 'daily_checkins' THEN (OLD.patient_id)::UUID
                    WHEN 'crisis_alerts' THEN (OLD.patient_id)::UUID
                    WHEN 'emergency_contacts' THEN (OLD.patient_id)::UUID
                    WHEN 'medication_tracking' THEN (OLD.patient_id)::UUID
                    WHEN 'medication_doses' THEN (OLD.patient_id)::UUID
                    WHEN 'notifications' THEN (OLD.user_id)::UUID
                    ELSE NULL
                  END
                ELSE 
                  CASE TG_TABLE_NAME
                    WHEN 'user_profiles' THEN (NEW.user_id)::UUID
                    WHEN 'daily_checkins' THEN (NEW.patient_id)::UUID
                    WHEN 'crisis_alerts' THEN (NEW.patient_id)::UUID
                    WHEN 'emergency_contacts' THEN (NEW.patient_id)::UUID
                    WHEN 'medication_tracking' THEN (NEW.patient_id)::UUID
                    WHEN 'medication_doses' THEN (NEW.patient_id)::UUID
                    WHEN 'notifications' THEN (NEW.user_id)::UUID
                    ELSE NULL
                  END
              END
            ELSE NULL
          END,
          TG_OP,
          TG_TABLE_NAME,
          CASE TG_OP
            WHEN 'DELETE' THEN (OLD.id)::UUID
            ELSE (NEW.id)::UUID
          END,
          old_data,
          new_data,
          current_setting('app.client_ip', true),
          current_setting('app.user_agent', true),
          current_setting('app.session_id', true),
          'success',
          json_build_object(
            'operation', TG_OP,
            'table', TG_TABLE_NAME,
            'when', TG_WHEN,
            'level', TG_LEVEL
          )
        );

        -- Return appropriate record
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        ELSE
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 2. Create specialized audit functions for PHI access
    await trx.raw(`
      CREATE OR REPLACE FUNCTION log_phi_access(
        table_name TEXT,
        record_id UUID,
        patient_id UUID,
        access_type TEXT,
        additional_context TEXT DEFAULT NULL
      )
      RETURNS VOID AS $$
      BEGIN
        INSERT INTO audit_logs (
          user_id,
          target_user_id,
          action,
          resource_type,
          resource_id,
          ip_address,
          user_agent,
          session_id,
          status,
          additional_info
        ) VALUES (
          get_current_user_id(),
          patient_id,
          'phi_access_' || access_type,
          table_name,
          record_id,
          current_setting('app.client_ip', true),
          current_setting('app.user_agent', true),
          current_setting('app.session_id', true),
          'success',
          json_build_object(
            'access_type', access_type,
            'context', additional_context,
            'timestamp', NOW()
          )
        );
        
        -- Update PHI access tracking in user_profiles
        UPDATE user_profiles 
        SET 
          phi_last_accessed = NOW(),
          phi_accessed_by = get_current_user_id()
        WHERE user_id = patient_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // 3. Add audit triggers to all tables containing PHI
    const auditTables = [
      'users',
      'user_profiles',
      'user_roles',
      'user_sessions',
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

    for (const table of auditTables) {
      await trx.raw(`
        CREATE TRIGGER ${table}_audit_trigger
        AFTER INSERT OR UPDATE OR DELETE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      `);
    }

    // 4. Create performance indexes for common query patterns

    // User authentication and lookup indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
      ON users (email, email_verified) WHERE deleted_at IS NULL;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_status 
      ON users (role, status) WHERE deleted_at IS NULL;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
      ON users (last_login_at DESC) WHERE deleted_at IS NULL;
    `);

    // User profiles PHI access tracking
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_phi_access 
      ON user_profiles (phi_last_accessed DESC, phi_accessed_by) 
      WHERE phi_access_granted = true;
    `);

    // Session management indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_active_user 
      ON user_sessions (user_id, is_active, expires_at) 
      WHERE is_active = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_cleanup 
      ON user_sessions (expires_at) WHERE is_active = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_device 
      ON user_sessions (user_id, device_type, last_activity DESC);
    `);

    // Daily check-ins analytics indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_patient_date_range 
      ON daily_checkins (patient_id, checkin_date DESC);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_mood_trends 
      ON daily_checkins (patient_id, mood_level, checkin_date DESC);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_substance_tracking 
      ON daily_checkins (patient_id, substance_free, checkin_date DESC);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_checkins_completion 
      ON daily_checkins (checkin_date, is_complete);
    `);

    // Crisis alerts rapid response indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_alerts_active_severity 
      ON crisis_alerts (status, severity, created_at DESC) 
      WHERE status IN ('active', 'in_progress');
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_alerts_location 
      ON crisis_alerts (patient_id, latitude, longitude, created_at DESC) 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_alerts_followup 
      ON crisis_alerts (requires_followup, followup_scheduled_at) 
      WHERE requires_followup = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_alerts_type_severity 
      ON crisis_alerts (crisis_type, severity, created_at DESC);
    `);

    // Emergency contacts notification indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_contacts_notification 
      ON emergency_contacts (patient_id, tier, is_active, is_verified) 
      WHERE is_active = true AND is_verified = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_contacts_availability 
      ON emergency_contacts (available_from, available_to, available_days) 
      WHERE is_active = true;
    `);

    // Care plans provider workflow indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_care_plans_provider_active 
      ON care_plans (provider_id, is_active, next_review_date) 
      WHERE is_active = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_care_plans_patient_active 
      ON care_plans (patient_id, is_active, start_date DESC) 
      WHERE is_active = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_care_plans_review_due 
      ON care_plans (next_review_date) 
      WHERE is_active = true AND next_review_date <= CURRENT_DATE + INTERVAL '7 days';
    `);

    // Appointments scheduling and management indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_provider_schedule 
      ON appointments (provider_id, scheduled_start, scheduled_end, status);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_patient_upcoming 
      ON appointments (patient_id, scheduled_start) 
      WHERE status IN ('scheduled', 'confirmed') AND scheduled_start >= NOW();
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_reminders 
      ON appointments (scheduled_start, reminder_sent_24h, reminder_sent_2h, reminder_sent_30min) 
      WHERE status IN ('scheduled', 'confirmed');
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_recurring 
      ON appointments (recurring_series_id, scheduled_start) 
      WHERE is_recurring = true;
    `);

    // Peer messaging indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_peer_messages_conversation 
      ON peer_support_messages (sender_id, recipient_id, created_at DESC) 
      WHERE deleted_at IS NULL;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_peer_messages_thread 
      ON peer_support_messages (thread_id, created_at ASC) 
      WHERE thread_id IS NOT NULL AND deleted_at IS NULL;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_peer_messages_crisis_review 
      ON peer_support_messages (is_crisis_related, requires_professional_review, reviewed_at) 
      WHERE requires_professional_review = true;
    `);

    // Notifications delivery tracking indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
      ON notifications (user_id, status, created_at DESC) 
      WHERE status IN ('pending', 'sent', 'delivered');
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_delivery_queue 
      ON notifications (channel, status, scheduled_at) 
      WHERE status = 'pending' AND scheduled_at <= NOW();
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_retry_queue 
      ON notifications (status, next_retry_at, retry_count) 
      WHERE status = 'failed' AND next_retry_at <= NOW();
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_cleanup 
      ON notifications (expires_at) WHERE expires_at IS NOT NULL;
    `);

    // Medication tracking indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medication_tracking_patient_active 
      ON medication_tracking (patient_id, is_active, start_date DESC) 
      WHERE is_active = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medication_tracking_provider_review 
      ON medication_tracking (prescribed_by, provider_review_required, next_provider_review) 
      WHERE provider_review_required = true;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medication_tracking_refills 
      ON medication_tracking (patient_id, refill_due_date) 
      WHERE is_active = true AND refill_due_date <= CURRENT_DATE + INTERVAL '7 days';
    `);

    // Medication doses adherence tracking indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medication_doses_patient_schedule 
      ON medication_doses (patient_id, scheduled_time DESC);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medication_doses_adherence 
      ON medication_doses (medication_id, status, scheduled_time DESC);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medication_doses_missed 
      ON medication_doses (patient_id, status, scheduled_time) 
      WHERE status = 'missed';
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medication_doses_reminders 
      ON medication_doses (scheduled_time, reminder_sent, status) 
      WHERE status = 'scheduled' AND reminder_sent = false AND scheduled_time <= NOW() + INTERVAL '30 minutes';
    `);

    // Audit logs investigation indexes
    await trx.raw(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_timeline 
      ON audit_logs (user_id, created_at DESC);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_target_user_timeline 
      ON audit_logs (target_user_id, created_at DESC) 
      WHERE target_user_id IS NOT NULL;
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource_tracking 
      ON audit_logs (resource_type, resource_id, created_at DESC);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_type 
      ON audit_logs (action, created_at DESC);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_phi_access 
      ON audit_logs (action, target_user_id, created_at DESC) 
      WHERE action LIKE 'phi_access_%';
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_failed_attempts 
      ON audit_logs (status, ip_address, created_at DESC) 
      WHERE status = 'failure';
    `);

    // 5. Create materialized view for dashboard analytics (refreshed periodically)
    await trx.raw(`
      CREATE MATERIALIZED VIEW patient_summary_stats AS
      SELECT 
        p.id as patient_id,
        p.email,
        prof.created_at as registration_date,
        
        -- Recent check-in data
        (SELECT COUNT(*) FROM daily_checkins dc 
         WHERE dc.patient_id = p.id 
         AND dc.checkin_date >= CURRENT_DATE - INTERVAL '30 days') as checkins_last_30_days,
         
        (SELECT AVG(mood_level::INTEGER) FROM daily_checkins dc 
         WHERE dc.patient_id = p.id 
         AND dc.checkin_date >= CURRENT_DATE - INTERVAL '7 days') as avg_mood_last_7_days,
         
        (SELECT AVG(anxiety_level::INTEGER) FROM daily_checkins dc 
         WHERE dc.patient_id = p.id 
         AND dc.checkin_date >= CURRENT_DATE - INTERVAL '7 days') as avg_anxiety_last_7_days,
         
        -- Crisis alert summary
        (SELECT COUNT(*) FROM crisis_alerts ca 
         WHERE ca.patient_id = p.id 
         AND ca.created_at >= CURRENT_DATE - INTERVAL '30 days') as crisis_alerts_last_30_days,
         
        -- Medication adherence
        (SELECT AVG(current_adherence_rate) FROM medication_tracking mt 
         WHERE mt.patient_id = p.id 
         AND mt.is_active = true) as avg_medication_adherence,
         
        -- Active care plans
        (SELECT COUNT(*) FROM care_plans cp 
         WHERE cp.patient_id = p.id 
         AND cp.is_active = true) as active_care_plans,
         
        -- Last activity
        GREATEST(
          p.last_login_at,
          (SELECT MAX(created_at) FROM daily_checkins dc WHERE dc.patient_id = p.id),
          (SELECT MAX(created_at) FROM peer_support_messages psm 
           WHERE psm.sender_id = p.id OR psm.recipient_id = p.id)
        ) as last_activity
        
      FROM users p
      JOIN user_profiles prof ON prof.user_id = p.id
      WHERE p.role = 'patient' AND p.deleted_at IS NULL;
      
      -- Index the materialized view
      CREATE UNIQUE INDEX idx_patient_summary_stats_patient_id 
      ON patient_summary_stats (patient_id);
      
      CREATE INDEX idx_patient_summary_stats_last_activity 
      ON patient_summary_stats (last_activity DESC);
      
      CREATE INDEX idx_patient_summary_stats_checkins 
      ON patient_summary_stats (checkins_last_30_days DESC);
    `);

    // 6. Create function to refresh materialized view
    await trx.raw(`
      CREATE OR REPLACE FUNCTION refresh_patient_summary_stats()
      RETURNS VOID AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY patient_summary_stats;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    console.log('✓ Created performance indexes and comprehensive audit logging system');
  });
};

exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    
    // Drop materialized view and functions
    await trx.raw('DROP MATERIALIZED VIEW IF EXISTS patient_summary_stats;');
    await trx.raw('DROP FUNCTION IF EXISTS refresh_patient_summary_stats();');
    await trx.raw('DROP FUNCTION IF EXISTS log_phi_access(TEXT, UUID, UUID, TEXT, TEXT);');
    await trx.raw('DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;');

    // Drop audit triggers
    const auditTables = [
      'users', 'user_profiles', 'user_roles', 'user_sessions',
      'daily_checkins', 'crisis_alerts', 'emergency_contacts', 
      'care_plans', 'appointments', 'peer_support_messages', 
      'notifications', 'medication_tracking', 'medication_doses'
    ];

    for (const table of auditTables) {
      await trx.raw(`DROP TRIGGER IF EXISTS ${table}_audit_trigger ON ${table};`);
    }

    console.log('✓ Rolled back performance indexes and audit triggers');
  });
};
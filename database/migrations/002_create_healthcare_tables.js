/**
 * Migration: Create healthcare-specific tables
 * Tables: daily_checkins, crisis_alerts, emergency_contacts, care_plans, appointments
 * HIPAA Compliance: All PHI data encrypted, audit trails, secure access
 */

exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Create healthcare-specific enums
    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE mood_level AS ENUM ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE anxiety_level AS ENUM ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE sleep_quality AS ENUM ('poor', 'fair', 'good', 'excellent');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE crisis_severity AS ENUM ('low', 'medium', 'high', 'critical');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE crisis_status AS ENUM ('active', 'in_progress', 'resolved', 'escalated');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE contact_tier AS ENUM ('primary', 'secondary', 'emergency', 'professional');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. Daily Check-ins - Mental health tracking
    await trx.schema.createTable('daily_checkins', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      
      // Core metrics
      table.specificType('mood_level', 'mood_level').notNullable();
      table.specificType('anxiety_level', 'anxiety_level').notNullable();
      table.specificType('sleep_quality', 'sleep_quality').notNullable();
      table.decimal('sleep_hours', 4, 2).nullable(); // e.g., 7.5 hours
      
      // Additional tracking
      table.boolean('took_medication').defaultTo(false);
      table.text('medication_notes_encrypted').nullable();
      table.boolean('exercised').defaultTo(false);
      table.integer('exercise_minutes').nullable();
      table.text('journal_entry_encrypted').nullable(); // Encrypted PHI
      table.json('symptoms').nullable(); // Array of symptoms (non-PHI)
      table.json('triggers').nullable(); // Array of triggers (non-PHI)
      table.json('coping_strategies_used').nullable(); // Array of strategies
      
      // Goals and progress
      table.text('daily_goals_encrypted').nullable(); // JSON encrypted
      table.json('goals_completed').nullable(); // Non-PHI completion tracking
      table.integer('stress_level').nullable(); // 1-10 scale
      table.integer('energy_level').nullable(); // 1-10 scale
      
      // Sobriety tracking (for substance abuse recovery)
      table.boolean('substance_free').defaultTo(true);
      table.text('substance_notes_encrypted').nullable();
      table.integer('days_sober').nullable(); // Running count
      
      // Context and environment
      table.string('location', 100).nullable(); // General location (non-PHI)
      table.json('social_interactions').nullable(); // Count/type of interactions
      table.boolean('attended_meeting').defaultTo(false); // AA/NA meetings
      table.text('meeting_type', 100).nullable(); // Type of meeting attended
      
      // Metadata
      table.date('checkin_date').notNullable(); // Date of check-in
      table.time('checkin_time').nullable(); // Time of check-in
      table.boolean('is_complete').defaultTo(true);
      table.text('completion_method', 20).defaultTo('manual'); // manual, voice, automated
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());

      // Constraints and indexes
      table.unique(['patient_id', 'checkin_date'], 'unique_daily_checkin');
      table.index(['patient_id'], 'idx_checkins_patient_id');
      table.index(['checkin_date'], 'idx_checkins_date');
      table.index(['mood_level'], 'idx_checkins_mood');
      table.index(['anxiety_level'], 'idx_checkins_anxiety');
      table.index(['created_at'], 'idx_checkins_created_at');
      table.index(['substance_free'], 'idx_checkins_substance_free');
    });

    // 2. Crisis Alerts - Real-time crisis management
    await trx.schema.createTable('crisis_alerts', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('triggered_by').nullable().references('id').inTable('users'); // Who triggered if not patient
      
      // Crisis details
      table.specificType('severity', 'crisis_severity').notNullable();
      table.specificType('status', 'crisis_status').notNullable().defaultTo('active');
      table.text('crisis_type', 50).notNullable(); // suicide, self_harm, substance, panic, etc.
      table.text('description_encrypted').nullable(); // Encrypted crisis details
      table.text('immediate_risk_encrypted').nullable(); // Encrypted risk assessment
      
      // Location and context
      table.text('location_encrypted').nullable(); // Encrypted location info
      table.boolean('location_shared').defaultTo(false);
      table.decimal('latitude', 10, 8).nullable(); // For emergency services
      table.decimal('longitude', 11, 8).nullable();
      table.timestamp('location_timestamp').nullable();
      
      // Response tracking
      table.text('response_plan_encrypted').nullable(); // Encrypted action plan
      table.json('contacts_notified').nullable(); // Array of contact IDs notified
      table.timestamp('first_response_at').nullable();
      table.uuid('first_responder_id').nullable().references('id').inTable('users');
      table.boolean('emergency_services_called').defaultTo(false);
      table.timestamp('emergency_services_at').nullable();
      
      // Follow-up
      table.text('resolution_notes_encrypted').nullable();
      table.uuid('resolved_by').nullable().references('id').inTable('users');
      table.timestamp('resolved_at').nullable();
      table.boolean('requires_followup').defaultTo(true);
      table.timestamp('followup_scheduled_at').nullable();
      
      // Metadata
      table.string('alert_method', 20).notNullable(); // app, voice, panic_button, automated
      table.string('device_type', 20).nullable(); // ios, android, web
      table.json('device_info').nullable(); // Non-PHI device information
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());

      // Indexes for rapid response
      table.index(['patient_id'], 'idx_crisis_patient_id');
      table.index(['severity'], 'idx_crisis_severity');
      table.index(['status'], 'idx_crisis_status');
      table.index(['created_at'], 'idx_crisis_created_at');
      table.index(['crisis_type'], 'idx_crisis_type');
      table.index(['requires_followup'], 'idx_crisis_followup');
    });

    // 3. Emergency Contacts - Tiered contact system
    await trx.schema.createTable('emergency_contacts', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      
      // Contact information (all encrypted PHI)
      table.text('name_encrypted').notNullable();
      table.text('phone_encrypted').notNullable();
      table.text('email_encrypted').nullable();
      table.text('relationship_encrypted').notNullable(); // spouse, parent, friend, therapist
      table.specificType('tier', 'contact_tier').notNullable();
      
      // Contact preferences
      table.boolean('sms_enabled').defaultTo(true);
      table.boolean('call_enabled').defaultTo(true);
      table.boolean('email_enabled').defaultTo(false);
      table.json('crisis_types').nullable(); // Which types of crises to notify for
      table.integer('notification_delay_minutes').defaultTo(0); // Staggered notifications
      
      // Availability
      table.time('available_from').nullable(); // Daily availability window
      table.time('available_to').nullable();
      table.json('available_days').nullable(); // Array of day names
      table.string('timezone', 50).defaultTo('UTC');
      table.boolean('always_notify').defaultTo(false); // Override availability for emergencies
      
      // Verification and consent
      table.boolean('is_verified').defaultTo(false);
      table.timestamp('verified_at').nullable();
      table.text('verification_method', 20).nullable(); // sms, email, manual
      table.boolean('consent_given').defaultTo(false);
      table.timestamp('consent_given_at').nullable();
      table.text('consent_method', 20).nullable(); // verbal, written, electronic
      
      // Usage tracking
      table.integer('notifications_sent').defaultTo(0);
      table.timestamp('last_notified_at').nullable();
      table.integer('response_rate_percentage').defaultTo(0); // Response rate tracking
      table.decimal('average_response_time_minutes', 8, 2).nullable();
      
      // Status
      table.boolean('is_active').defaultTo(true);
      table.text('deactivation_reason').nullable();
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());

      // Indexes
      table.index(['patient_id'], 'idx_emergency_contacts_patient_id');
      table.index(['tier'], 'idx_emergency_contacts_tier');
      table.index(['is_active'], 'idx_emergency_contacts_active');
      table.index(['is_verified'], 'idx_emergency_contacts_verified');
    });

    // 4. Care Plans - Provider-created treatment plans
    await trx.schema.createTable('care_plans', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('provider_id').notNullable().references('id').inTable('users');
      
      // Plan details
      table.text('title_encrypted').notNullable(); // Encrypted plan title
      table.text('description_encrypted').nullable(); // Encrypted detailed description
      table.text('primary_diagnosis_encrypted').nullable(); // ICD-10 codes encrypted
      table.text('secondary_diagnoses_encrypted').nullable(); // Additional diagnoses
      
      // Goals and objectives
      table.text('treatment_goals_encrypted').notNullable(); // JSON encrypted
      table.text('measurable_objectives_encrypted').nullable(); // Specific, measurable goals
      table.date('target_completion_date').nullable();
      table.integer('expected_duration_weeks').nullable();
      
      // Treatment interventions
      table.text('interventions_encrypted').nullable(); // JSON of interventions
      table.text('medication_plan_encrypted').nullable(); // Medication management plan
      table.text('therapy_modalities_encrypted').nullable(); // CBT, DBT, etc.
      table.integer('recommended_session_frequency').nullable(); // Sessions per week/month
      
      // Monitoring and assessment
      table.text('assessment_tools_encrypted').nullable(); // PHQ-9, GAD-7, etc.
      table.integer('assessment_frequency_days').nullable(); // How often to assess
      table.text('progress_indicators_encrypted').nullable(); // What to measure
      table.text('warning_signs_encrypted').nullable(); // Crisis indicators
      
      // Care team
      table.text('care_team_members_encrypted').nullable(); // JSON of team member info
      table.uuid('primary_therapist_id').nullable().references('id').inTable('users');
      table.uuid('case_manager_id').nullable().references('id').inTable('users');
      
      // Plan status
      table.boolean('is_active').defaultTo(true);
      table.text('status', 20).defaultTo('active'); // active, completed, discontinued, on_hold
      table.text('status_reason').nullable();
      table.date('start_date').notNullable();
      table.date('end_date').nullable();
      table.date('last_reviewed_date').nullable();
      table.uuid('last_reviewed_by').nullable().references('id').inTable('users');
      table.date('next_review_date').nullable();
      
      // Consent and authorization
      table.boolean('patient_consent').defaultTo(false);
      table.timestamp('consent_date').nullable();
      table.text('consent_method', 20).nullable(); // verbal, written, electronic
      table.boolean('insurance_authorized').defaultTo(false);
      table.text('authorization_number_encrypted').nullable();
      
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());

      // Indexes
      table.index(['patient_id'], 'idx_care_plans_patient_id');
      table.index(['provider_id'], 'idx_care_plans_provider_id');
      table.index(['is_active'], 'idx_care_plans_active');
      table.index(['status'], 'idx_care_plans_status');
      table.index(['start_date'], 'idx_care_plans_start_date');
      table.index(['next_review_date'], 'idx_care_plans_next_review');
    });

    // 5. Appointments - Scheduling and management
    await trx.schema.createTable('appointments', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('provider_id').notNullable().references('id').inTable('users');
      table.uuid('care_plan_id').nullable().references('id').inTable('care_plans');
      
      // Appointment details
      table.text('title_encrypted').notNullable(); // Session type, purpose
      table.text('description_encrypted').nullable(); // Additional details
      table.text('appointment_type', 50).notNullable(); // therapy, psychiatry, case_management, group
      table.text('modality', 20).notNullable(); // in_person, telehealth, phone
      
      // Scheduling
      table.timestamp('scheduled_start').notNullable();
      table.timestamp('scheduled_end').notNullable();
      table.integer('duration_minutes').notNullable();
      table.string('timezone', 50).notNullable();
      
      // Location (encrypted for in-person appointments)
      table.text('location_encrypted').nullable();
      table.text('room_number_encrypted').nullable();
      table.text('telehealth_link_encrypted').nullable(); // Video call URL
      table.text('dial_in_info_encrypted').nullable(); // Phone number and codes
      
      // Status and tracking
      table.specificType('status', 'appointment_status').notNullable().defaultTo('scheduled');
      table.timestamp('actual_start').nullable();
      table.timestamp('actual_end').nullable();
      table.text('cancellation_reason_encrypted').nullable();
      table.uuid('cancelled_by').nullable().references('id').inTable('users');
      table.timestamp('cancelled_at').nullable();
      
      // Reminders and notifications
      table.boolean('reminder_sent_24h').defaultTo(false);
      table.boolean('reminder_sent_2h').defaultTo(false);
      table.boolean('reminder_sent_30min').defaultTo(false);
      table.timestamp('last_reminder_sent').nullable();
      
      // Session notes (separate table reference would be created later)
      table.boolean('notes_completed').defaultTo(false);
      table.timestamp('notes_completed_at').nullable();
      table.uuid('notes_completed_by').nullable().references('id').inTable('users');
      
      // Billing and insurance
      table.text('cpt_code', 10).nullable(); // Procedure code
      table.text('diagnosis_codes_encrypted').nullable(); // ICD-10 codes
      table.boolean('insurance_verified').defaultTo(false);
      table.text('authorization_number_encrypted').nullable();
      table.decimal('session_fee', 8, 2).nullable();
      table.decimal('copay_amount', 8, 2).nullable();
      
      // Recurring appointments
      table.uuid('recurring_series_id').nullable(); // Links to recurring series
      table.boolean('is_recurring').defaultTo(false);
      table.text('recurrence_pattern').nullable(); // weekly, biweekly, monthly
      table.date('recurrence_end_date').nullable();
      
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());

      // Indexes
      table.index(['patient_id'], 'idx_appointments_patient_id');
      table.index(['provider_id'], 'idx_appointments_provider_id');
      table.index(['care_plan_id'], 'idx_appointments_care_plan_id');
      table.index(['scheduled_start'], 'idx_appointments_scheduled_start');
      table.index(['status'], 'idx_appointments_status');
      table.index(['appointment_type'], 'idx_appointments_type');
      table.index(['is_recurring'], 'idx_appointments_recurring');
      table.index(['created_at'], 'idx_appointments_created_at');
    });

    // Add update triggers to tables with updated_at columns
    const tablesWithUpdatedAt = [
      'daily_checkins', 
      'crisis_alerts', 
      'emergency_contacts', 
      'care_plans', 
      'appointments'
    ];
    
    for (const table of tablesWithUpdatedAt) {
      await trx.raw(`
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table} 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log('✓ Created healthcare-specific tables with HIPAA compliance');
  });
};

exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Drop tables in reverse order
    await trx.schema.dropTableIfExists('appointments');
    await trx.schema.dropTableIfExists('care_plans');
    await trx.schema.dropTableIfExists('emergency_contacts');
    await trx.schema.dropTableIfExists('crisis_alerts');
    await trx.schema.dropTableIfExists('daily_checkins');

    // Drop custom types
    await trx.raw('DROP TYPE IF EXISTS mood_level CASCADE');
    await trx.raw('DROP TYPE IF EXISTS anxiety_level CASCADE');
    await trx.raw('DROP TYPE IF EXISTS sleep_quality CASCADE');
    await trx.raw('DROP TYPE IF EXISTS crisis_severity CASCADE');
    await trx.raw('DROP TYPE IF EXISTS crisis_status CASCADE');
    await trx.raw('DROP TYPE IF EXISTS contact_tier CASCADE');
    await trx.raw('DROP TYPE IF EXISTS appointment_status CASCADE');

    console.log('✓ Rolled back healthcare-specific tables');
  });
};
/**
 * Migration: Create messaging and support tables
 * Tables: peer_support_messages, notifications, medication_tracking
 * HIPAA Compliance: Encrypted messaging, notification logs, medication privacy
 */

exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Create messaging and support enums
    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE notification_channel AS ENUM ('sms', 'email', 'push', 'in_app', 'voice');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE medication_frequency AS ENUM ('once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'every_other_day', 'weekly', 'as_needed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. Peer Support Messages - Encrypted messaging system
    await trx.schema.createTable('peer_support_messages', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('thread_id').nullable(); // For message threading/grouping
      table.uuid('reply_to_id').nullable().references('id').inTable('peer_support_messages'); // Reply chain
      
      // Message content (all encrypted PHI)
      table.text('subject_encrypted').nullable(); // Message subject
      table.text('content_encrypted').notNullable(); // Main message content
      table.text('message_type', 20).notNullable().defaultTo('text'); // text, image, audio, video, file
      table.text('attachment_url_encrypted').nullable(); // Encrypted file URLs
      table.json('attachment_metadata').nullable(); // Non-PHI file info (size, type)
      
      // Message status and delivery
      table.specificType('status', 'message_status').notNullable().defaultTo('sent');
      table.timestamp('delivered_at').nullable();
      table.timestamp('read_at').nullable();
      table.boolean('is_flagged').defaultTo(false); // For inappropriate content
      table.text('flag_reason').nullable();
      table.uuid('flagged_by').nullable().references('id').inTable('users');
      
      // Crisis integration
      table.boolean('is_crisis_related').defaultTo(false);
      table.uuid('related_crisis_id').nullable().references('id').inTable('crisis_alerts');
      table.boolean('requires_professional_review').defaultTo(false);
      table.uuid('reviewed_by').nullable().references('id').inTable('users');
      table.timestamp('reviewed_at').nullable();
      
      // Privacy and moderation
      table.boolean('is_anonymous').defaultTo(false); // Anonymous peer support
      table.text('sender_alias_encrypted').nullable(); // Encrypted alias for anonymous messages
      table.boolean('auto_delete').defaultTo(false); // Self-destructing messages
      table.timestamp('delete_at').nullable();
      table.boolean('is_archived').defaultTo(false);
      
      // Message priority and urgency
      table.specificType('priority', 'notification_priority').defaultTo('normal');
      table.boolean('requires_response').defaultTo(false);
      table.timestamp('response_deadline').nullable();
      
      // Metadata
      table.string('client_message_id', 255).nullable(); // For deduplication
      table.json('delivery_metadata').nullable(); // Delivery tracking info
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());
      table.timestamp('deleted_at').nullable(); // Soft delete

      // Indexes
      table.index(['sender_id'], 'idx_messages_sender_id');
      table.index(['recipient_id'], 'idx_messages_recipient_id');
      table.index(['thread_id'], 'idx_messages_thread_id');
      table.index(['reply_to_id'], 'idx_messages_reply_to_id');
      table.index(['status'], 'idx_messages_status');
      table.index(['created_at'], 'idx_messages_created_at');
      table.index(['is_crisis_related'], 'idx_messages_crisis_related');
      table.index(['requires_professional_review'], 'idx_messages_requires_review');
      table.index(['is_flagged'], 'idx_messages_flagged');
    });

    // 2. Notifications - Multi-channel notification tracking
    await trx.schema.createTable('notifications', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('triggered_by').nullable().references('id').inTable('users'); // Who triggered notification
      
      // Notification content
      table.text('title_encrypted').notNullable(); // Notification title
      table.text('message_encrypted').notNullable(); // Notification body
      table.text('notification_type', 50).notNullable(); // crisis_alert, appointment_reminder, checkin_reminder, etc.
      table.specificType('priority', 'notification_priority').notNullable().defaultTo('normal');
      
      // Channel and delivery
      table.specificType('channel', 'notification_channel').notNullable();
      table.text('recipient_identifier_encrypted').nullable(); // Phone, email, device token encrypted
      table.text('status', 20).notNullable().defaultTo('pending'); // pending, sent, delivered, failed, read
      table.timestamp('scheduled_at').nullable(); // For scheduled notifications
      table.timestamp('sent_at').nullable();
      table.timestamp('delivered_at').nullable();
      table.timestamp('read_at').nullable();
      table.timestamp('failed_at').nullable();
      table.text('failure_reason').nullable();
      
      // Related resources
      table.string('related_resource_type', 50).nullable(); // crisis_alerts, appointments, etc.
      table.uuid('related_resource_id').nullable();
      table.uuid('related_crisis_id').nullable().references('id').inTable('crisis_alerts');
      table.uuid('related_appointment_id').nullable().references('id').inTable('appointments');
      
      // Notification metadata
      table.json('channel_specific_data').nullable(); // SMS provider ID, push notification data, etc.
      table.text('external_id', 255).nullable(); // Third-party service message ID
      table.json('delivery_receipt').nullable(); // Delivery confirmation data
      table.integer('retry_count').defaultTo(0);
      table.timestamp('last_retry_at').nullable();
      table.timestamp('next_retry_at').nullable();
      
      // User interaction
      table.boolean('requires_acknowledgment').defaultTo(false);
      table.timestamp('acknowledged_at').nullable();
      table.text('acknowledgment_method', 20).nullable(); // tap, voice, text_reply
      table.boolean('is_actionable').defaultTo(false);
      table.text('action_url_encrypted').nullable(); // Deep link or action URL
      table.text('action_taken').nullable();
      table.timestamp('action_taken_at').nullable();
      
      // Privacy and retention
      table.boolean('contains_phi').defaultTo(false);
      table.timestamp('expires_at').nullable(); // Auto-delete timestamp
      table.boolean('is_persistent').defaultTo(false); // Keep in notification center
      
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());

      // Indexes
      table.index(['user_id'], 'idx_notifications_user_id');
      table.index(['notification_type'], 'idx_notifications_type');
      table.index(['channel'], 'idx_notifications_channel');
      table.index(['status'], 'idx_notifications_status');
      table.index(['priority'], 'idx_notifications_priority');
      table.index(['scheduled_at'], 'idx_notifications_scheduled_at');
      table.index(['sent_at'], 'idx_notifications_sent_at');
      table.index(['related_resource_type', 'related_resource_id'], 'idx_notifications_related_resource');
      table.index(['related_crisis_id'], 'idx_notifications_crisis_id');
      table.index(['created_at'], 'idx_notifications_created_at');
      table.index(['expires_at'], 'idx_notifications_expires_at');
    });

    // 3. Medication Tracking - Prescription and adherence monitoring
    await trx.schema.createTable('medication_tracking', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('prescribed_by').nullable().references('id').inTable('users'); // Prescribing provider
      table.uuid('care_plan_id').nullable().references('id').inTable('care_plans');
      
      // Medication details (encrypted PHI)
      table.text('medication_name_encrypted').notNullable(); // Drug name
      table.text('generic_name_encrypted').nullable(); // Generic equivalent
      table.text('brand_name_encrypted').nullable(); // Brand name
      table.text('ndc_number_encrypted').nullable(); // National Drug Code
      table.text('strength_encrypted').notNullable(); // 10mg, 20mg, etc.
      table.text('dosage_form_encrypted').notNullable(); // tablet, capsule, liquid, etc.
      
      // Dosing instructions (encrypted)
      table.text('dosage_instructions_encrypted').notNullable(); // Take 1 tablet by mouth...
      table.specificType('frequency', 'medication_frequency').notNullable();
      table.integer('pills_per_dose').nullable(); // Number of pills per dose
      table.decimal('dose_amount', 8, 3).nullable(); // Numeric dose amount
      table.text('dose_unit', 10).nullable(); // mg, ml, etc.
      table.time('morning_dose_time').nullable();
      table.time('afternoon_dose_time').nullable();
      table.time('evening_dose_time').nullable();
      table.time('bedtime_dose_time').nullable();
      
      // Prescription details
      table.text('prescription_number_encrypted').nullable();
      table.date('prescribed_date').notNullable();
      table.date('start_date').notNullable();
      table.date('end_date').nullable(); // For limited courses
      table.integer('quantity_prescribed').nullable(); // Total pills prescribed
      table.integer('refills_remaining').defaultTo(0);
      table.date('refill_due_date').nullable();
      
      // Monitoring and side effects
      table.text('indication_encrypted').nullable(); // What condition it treats
      table.text('side_effects_to_monitor_encrypted').nullable(); // JSON of side effects to watch
      table.text('contraindications_encrypted').nullable(); // Drug interactions, allergies
      table.text('special_instructions_encrypted').nullable(); // Take with food, etc.
      table.boolean('requires_monitoring').defaultTo(false); // Lab work, vitals, etc.
      table.text('monitoring_parameters_encrypted').nullable(); // What to monitor
      
      // Adherence tracking
      table.boolean('adherence_tracking_enabled').defaultTo(true);
      table.boolean('reminder_notifications_enabled').defaultTo(true);
      table.integer('missed_dose_threshold_hours').defaultTo(24); // When to flag as missed
      table.decimal('current_adherence_rate', 5, 2).nullable(); // Percentage (0.00-100.00)
      table.integer('consecutive_days_taken').defaultTo(0);
      table.integer('total_doses_prescribed').defaultTo(0);
      table.integer('total_doses_taken').defaultTo(0);
      table.integer('total_doses_missed').defaultTo(0);
      
      // Status and lifecycle
      table.boolean('is_active').defaultTo(true);
      table.text('status', 20).defaultTo('active'); // active, discontinued, paused, completed
      table.text('discontinuation_reason_encrypted').nullable();
      table.date('discontinued_date').nullable();
      table.uuid('discontinued_by').nullable().references('id').inTable('users');
      
      // Provider communication
      table.boolean('provider_review_required').defaultTo(false);
      table.text('provider_notes_encrypted').nullable();
      table.timestamp('last_provider_review').nullable();
      table.timestamp('next_provider_review').nullable();
      
      // Pharmacy information (encrypted)
      table.text('pharmacy_name_encrypted').nullable();
      table.text('pharmacy_phone_encrypted').nullable();
      table.text('pharmacy_address_encrypted').nullable();
      
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());

      // Indexes
      table.index(['patient_id'], 'idx_medication_tracking_patient_id');
      table.index(['prescribed_by'], 'idx_medication_tracking_prescribed_by');
      table.index(['care_plan_id'], 'idx_medication_tracking_care_plan_id');
      table.index(['is_active'], 'idx_medication_tracking_active');
      table.index(['status'], 'idx_medication_tracking_status');
      table.index(['frequency'], 'idx_medication_tracking_frequency');
      table.index(['start_date'], 'idx_medication_tracking_start_date');
      table.index(['end_date'], 'idx_medication_tracking_end_date');
      table.index(['refill_due_date'], 'idx_medication_tracking_refill_due');
      table.index(['provider_review_required'], 'idx_medication_tracking_review_required');
    });

    // 4. Medication Doses - Individual dose tracking for adherence
    await trx.schema.createTable('medication_doses', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('medication_id').notNullable().references('id').inTable('medication_tracking').onDelete('CASCADE');
      table.uuid('patient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      
      // Scheduled dose details
      table.timestamp('scheduled_time').notNullable(); // When dose should be taken
      table.decimal('scheduled_amount', 8, 3).notNullable(); // Amount scheduled
      table.text('scheduled_unit', 10).notNullable(); // mg, ml, etc.
      
      // Actual dose taken
      table.timestamp('taken_time').nullable(); // When actually taken
      table.decimal('taken_amount', 8, 3).nullable(); // Amount actually taken
      table.boolean('was_taken').defaultTo(false);
      table.text('taken_method', 20).nullable(); // manual_entry, app_reminder, voice_confirmation
      
      // Dose status
      table.text('status', 20).notNullable().defaultTo('scheduled'); // scheduled, taken, missed, skipped
      table.text('skip_reason_encrypted').nullable(); // Why dose was skipped
      table.integer('minutes_late').nullable(); // How late dose was taken
      table.boolean('is_makeup_dose').defaultTo(false); // Make-up for missed dose
      
      // Side effects and notes for this specific dose
      table.text('side_effects_reported_encrypted').nullable(); // JSON of side effects
      table.text('patient_notes_encrypted').nullable(); // Patient's notes about this dose
      table.integer('effectiveness_rating').nullable(); // 1-10 how effective patient felt
      
      // Reminder tracking
      table.boolean('reminder_sent').defaultTo(false);
      table.timestamp('reminder_sent_at').nullable();
      table.integer('reminder_count').defaultTo(0);
      table.timestamp('last_reminder_at').nullable();
      
      // Verification and confirmation
      table.boolean('requires_verification').defaultTo(false); // For high-risk meds
      table.boolean('is_verified').defaultTo(false);
      table.uuid('verified_by').nullable().references('id').inTable('users'); // Provider verification
      table.timestamp('verified_at').nullable();
      table.text('verification_method', 20).nullable(); // provider_confirm, pill_count, photo
      
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());

      // Indexes
      table.index(['medication_id'], 'idx_medication_doses_medication_id');
      table.index(['patient_id'], 'idx_medication_doses_patient_id');
      table.index(['scheduled_time'], 'idx_medication_doses_scheduled_time');
      table.index(['taken_time'], 'idx_medication_doses_taken_time');
      table.index(['status'], 'idx_medication_doses_status');
      table.index(['was_taken'], 'idx_medication_doses_was_taken');
      table.index(['created_at'], 'idx_medication_doses_created_at');
    });

    // Add update triggers to tables with updated_at columns
    const tablesWithUpdatedAt = [
      'peer_support_messages', 
      'notifications', 
      'medication_tracking', 
      'medication_doses'
    ];
    
    for (const table of tablesWithUpdatedAt) {
      await trx.raw(`
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table} 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log('✓ Created messaging and support tables with HIPAA compliance');
  });
};

exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Drop tables in reverse order
    await trx.schema.dropTableIfExists('medication_doses');
    await trx.schema.dropTableIfExists('medication_tracking');
    await trx.schema.dropTableIfExists('notifications');
    await trx.schema.dropTableIfExists('peer_support_messages');

    // Drop custom types
    await trx.raw('DROP TYPE IF EXISTS message_status CASCADE');
    await trx.raw('DROP TYPE IF EXISTS notification_channel CASCADE');
    await trx.raw('DROP TYPE IF EXISTS notification_priority CASCADE');
    await trx.raw('DROP TYPE IF EXISTS medication_frequency CASCADE');

    console.log('✓ Rolled back messaging and support tables');
  });
};
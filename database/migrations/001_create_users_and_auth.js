/**
 * Migration: Create core users and authentication tables
 * HIPAA Compliance: Encryption, audit trails, secure storage
 */

exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    // Enable necessary PostgreSQL extensions
    await trx.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await trx.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await trx.raw('CREATE EXTENSION IF NOT EXISTS "citext"');

    // Create custom types for roles and statuses
    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('patient', 'provider', 'supporter', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await trx.raw(`
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. Users table - Core authentication and basic info
    await trx.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.string('email', 255).unique().notNullable();
      table.text('password_hash').notNullable(); // bcrypt hashed
      table.specificType('role', 'user_role').notNullable().defaultTo('patient');
      table.specificType('status', 'user_status').notNullable().defaultTo('pending_verification');
      table.boolean('email_verified').defaultTo(false);
      table.timestamp('email_verified_at').nullable();
      table.string('verification_token', 255).nullable();
      table.timestamp('verification_token_expires_at').nullable();
      table.string('password_reset_token', 255).nullable();
      table.timestamp('password_reset_expires_at').nullable();
      table.integer('failed_login_attempts').defaultTo(0);
      table.timestamp('locked_until').nullable();
      table.timestamp('last_login_at').nullable();
      table.string('last_login_ip', 45).nullable();
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());
      table.timestamp('deleted_at').nullable(); // Soft delete for HIPAA retention

      // Indexes for performance
      table.index(['email'], 'idx_users_email');
      table.index(['role'], 'idx_users_role');
      table.index(['status'], 'idx_users_status');
      table.index(['created_at'], 'idx_users_created_at');
      table.index(['verification_token'], 'idx_users_verification_token');
      table.index(['password_reset_token'], 'idx_users_password_reset_token');
    });

    // 2. User Profiles - Extended user information (PHI data)
    await trx.schema.createTable('user_profiles', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      
      // Personal Information (Encrypted PHI)
      table.text('first_name_encrypted').nullable(); // pgp_sym_encrypt
      table.text('last_name_encrypted').nullable();
      table.text('phone_encrypted').nullable();
      table.date('date_of_birth').nullable(); // Not encrypted as it's needed for age calculations
      table.text('address_encrypted').nullable();
      table.text('city_encrypted').nullable();
      table.string('state', 2).nullable(); // State abbreviation
      table.text('zip_code_encrypted').nullable();
      
      // Medical Information
      table.text('medical_record_number_encrypted').nullable();
      table.text('emergency_contact_encrypted').nullable(); // JSON encrypted
      table.text('insurance_info_encrypted').nullable(); // JSON encrypted
      table.text('allergies_encrypted').nullable();
      table.text('medications_encrypted').nullable(); // JSON encrypted
      
      // Profile Settings
      table.string('preferred_language', 10).defaultTo('en');
      table.string('timezone', 50).defaultTo('UTC');
      table.boolean('notifications_enabled').defaultTo(true);
      table.boolean('sms_enabled').defaultTo(false);
      table.boolean('email_notifications').defaultTo(true);
      table.json('notification_preferences').nullable(); // Non-PHI settings
      
      // Avatar and display
      table.string('avatar_url', 500).nullable();
      table.string('display_name', 100).nullable(); // Non-PHI display name
      
      // HIPAA Compliance fields
      table.boolean('phi_access_granted').defaultTo(false);
      table.timestamp('phi_last_accessed').nullable();
      table.uuid('phi_accessed_by').nullable().references('id').inTable('users');
      table.text('phi_access_reason').nullable();
      
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());
      table.timestamp('deleted_at').nullable();

      // Unique constraint
      table.unique(['user_id'], 'unique_user_profile');
      
      // Indexes
      table.index(['user_id'], 'idx_profiles_user_id');
      table.index(['created_at'], 'idx_profiles_created_at');
      table.index(['phi_last_accessed'], 'idx_profiles_phi_accessed');
    });

    // 3. User Roles - Many-to-many relationship for multiple roles
    await trx.schema.createTable('user_roles', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.specificType('role', 'user_role').notNullable();
      table.boolean('is_primary').defaultTo(false);
      table.text('permissions').nullable(); // JSON string of specific permissions
      table.uuid('assigned_by').nullable().references('id').inTable('users');
      table.timestamp('assigned_at').defaultTo(trx.fn.now());
      table.timestamp('expires_at').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(trx.fn.now());

      // Constraints
      table.unique(['user_id', 'role'], 'unique_user_role');
      table.index(['user_id'], 'idx_user_roles_user_id');
      table.index(['role'], 'idx_user_roles_role');
      table.index(['is_primary'], 'idx_user_roles_primary');
    });

    // 4. Sessions - JWT token management and security
    await trx.schema.createTable('user_sessions', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('session_token').notNullable(); // JWT or session identifier
      table.text('refresh_token').nullable();
      table.string('device_id', 255).nullable();
      table.string('device_name', 255).nullable();
      table.string('device_type', 50).nullable(); // web, ios, android
      table.string('user_agent', 500).nullable();
      table.string('ip_address', 45).nullable();
      table.string('location', 255).nullable(); // City, Country based on IP
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_activity').defaultTo(trx.fn.now());
      table.timestamp('expires_at').notNullable();
      table.timestamp('created_at').defaultTo(trx.fn.now());
      
      // Indexes for session management
      table.index(['user_id'], 'idx_sessions_user_id');
      table.index(['session_token'], 'idx_sessions_token');
      table.index(['refresh_token'], 'idx_sessions_refresh_token');
      table.index(['is_active'], 'idx_sessions_active');
      table.index(['expires_at'], 'idx_sessions_expires_at');
      table.index(['last_activity'], 'idx_sessions_last_activity');
    });

    // 5. MFA Tokens - Multi-factor authentication
    await trx.schema.createTable('mfa_tokens', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('token_type', 20).notNullable(); // 'totp', 'sms', 'email', 'backup'
      table.text('token_value').notNullable(); // Encrypted token/secret
      table.string('phone_number_hash', 255).nullable(); // For SMS MFA
      table.boolean('is_verified').defaultTo(false);
      table.boolean('is_active').defaultTo(true);
      table.integer('usage_count').defaultTo(0);
      table.timestamp('last_used_at').nullable();
      table.timestamp('verified_at').nullable();
      table.timestamp('expires_at').nullable();
      table.timestamp('created_at').defaultTo(trx.fn.now());

      // Indexes
      table.index(['user_id'], 'idx_mfa_user_id');
      table.index(['token_type'], 'idx_mfa_token_type');
      table.index(['is_active'], 'idx_mfa_active');
    });

    // 6. Audit Logs - HIPAA compliance tracking
    await trx.schema.createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      table.uuid('user_id').nullable().references('id').inTable('users');
      table.uuid('target_user_id').nullable().references('id').inTable('users'); // For actions on other users
      table.string('action', 100).notNullable(); // login, logout, view_phi, update_profile, etc.
      table.string('resource_type', 50).nullable(); // users, profiles, checkins, etc.
      table.uuid('resource_id').nullable(); // ID of the affected resource
      table.json('old_values').nullable(); // Previous state (encrypted if PHI)
      table.json('new_values').nullable(); // New state (encrypted if PHI)
      table.string('ip_address', 45).nullable();
      table.string('user_agent', 500).nullable();
      table.text('additional_info').nullable(); // JSON string for extra context
      table.string('session_id', 255).nullable();
      table.string('status', 20).notNullable().defaultTo('success'); // success, failure, error
      table.text('error_message').nullable();
      table.timestamp('created_at').defaultTo(trx.fn.now()).notNullable();

      // Indexes for audit queries
      table.index(['user_id'], 'idx_audit_user_id');
      table.index(['target_user_id'], 'idx_audit_target_user_id');
      table.index(['action'], 'idx_audit_action');
      table.index(['resource_type'], 'idx_audit_resource_type');
      table.index(['resource_id'], 'idx_audit_resource_id');
      table.index(['created_at'], 'idx_audit_created_at');
      table.index(['status'], 'idx_audit_status');
    });

    // Create update timestamp trigger function
    await trx.raw(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add update triggers to tables with updated_at columns
    const tablesWithUpdatedAt = ['users', 'user_profiles'];
    
    for (const table of tablesWithUpdatedAt) {
      await trx.raw(`
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table} 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log('✓ Created core authentication and user management tables');
  });
};

exports.down = function(knex) {
  return knex.transaction(async (trx) => {
    // Drop tables in reverse order
    await trx.schema.dropTableIfExists('audit_logs');
    await trx.schema.dropTableIfExists('mfa_tokens');
    await trx.schema.dropTableIfExists('user_sessions');
    await trx.schema.dropTableIfExists('user_roles');
    await trx.schema.dropTableIfExists('user_profiles');
    await trx.schema.dropTableIfExists('users');

    // Drop custom types
    await trx.raw('DROP TYPE IF EXISTS user_role CASCADE');
    await trx.raw('DROP TYPE IF EXISTS user_status CASCADE');

    // Drop trigger function
    await trx.raw('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');

    console.log('✓ Rolled back core authentication and user management tables');
  });
};
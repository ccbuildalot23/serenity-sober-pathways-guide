/**
 * Seed: Test users and profiles for development
 * Creates test accounts for all user roles with realistic data
 * HIPAA Note: This is for development only - never use in production
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  console.log('🌱 Seeding test users and profiles...');
  
  // Clear existing data (in correct order due to foreign keys)
  await knex('medication_doses').del();
  await knex('medication_tracking').del();
  await knex('notifications').del();
  await knex('peer_support_messages').del();
  await knex('appointments').del();
  await knex('care_plans').del();
  await knex('emergency_contacts').del();
  await knex('crisis_alerts').del();
  await knex('daily_checkins').del();
  await knex('audit_logs').del();
  await knex('mfa_tokens').del();
  await knex('user_sessions').del();
  await knex('user_roles').del();
  await knex('user_profiles').del();
  await knex('users').del();

  // Test password (hashed)
  const testPassword = await bcrypt.hash('TestPass123!', 12);
  
  // Encryption key for PHI (use a test key - never in production!)
  const encryptionKey = 'test_key_for_development_only_32_chars';
  
  // Test users data
  const testUsers = [
    // Admin User
    {
      id: uuidv4(),
      email: 'admin@serenity.com',
      password_hash: testPassword,
      role: 'admin',
      status: 'active',
      email_verified: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Test Patients
    {
      id: uuidv4(),
      email: 'patient1@serenity.com',
      password_hash: testPassword,
      role: 'patient',
      status: 'active',
      email_verified: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'patient2@serenity.com',
      password_hash: testPassword,
      role: 'patient',
      status: 'active',
      email_verified: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Test Providers
    {
      id: uuidv4(),
      email: 'provider1@serenity.com',
      password_hash: testPassword,
      role: 'provider',
      status: 'active',
      email_verified: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'therapist@serenity.com',
      password_hash: testPassword,
      role: 'provider',
      status: 'active',
      email_verified: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Test Supporters
    {
      id: uuidv4(),
      email: 'supporter1@serenity.com',
      password_hash: testPassword,
      role: 'supporter',
      status: 'active',
      email_verified: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      email: 'familymember@serenity.com',
      password_hash: testPassword,
      role: 'supporter',
      status: 'active',
      email_verified: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  // Insert users
  await knex('users').insert(testUsers);
  console.log(`✅ Inserted ${testUsers.length} test users`);

  // Create user roles (primary roles)
  const userRoles = testUsers.map(user => ({
    id: uuidv4(),
    user_id: user.id,
    role: user.role,
    is_primary: true,
    is_active: true,
    assigned_by: testUsers[0].id, // Admin assigned
    assigned_at: new Date(),
    created_at: new Date()
  }));

  await knex('user_roles').insert(userRoles);
  console.log(`✅ Inserted ${userRoles.length} user role assignments`);

  // Create user profiles with encrypted PHI data
  const userProfiles = [
    // Admin profile
    {
      id: uuidv4(),
      user_id: testUsers[0].id,
      first_name_encrypted: knex.raw(`pgp_sym_encrypt('System', ?)`, [encryptionKey]),
      last_name_encrypted: knex.raw(`pgp_sym_encrypt('Administrator', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0100', ?)`, [encryptionKey]),
      date_of_birth: new Date('1980-01-01'),
      preferred_language: 'en',
      timezone: 'America/New_York',
      display_name: 'Admin',
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Patient 1 - John Doe (Depression, Anxiety)
    {
      id: uuidv4(),
      user_id: testUsers[1].id,
      first_name_encrypted: knex.raw(`pgp_sym_encrypt('John', ?)`, [encryptionKey]),
      last_name_encrypted: knex.raw(`pgp_sym_encrypt('Doe', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0101', ?)`, [encryptionKey]),
      date_of_birth: new Date('1985-03-15'),
      address_encrypted: knex.raw(`pgp_sym_encrypt('123 Main St', ?)`, [encryptionKey]),
      city_encrypted: knex.raw(`pgp_sym_encrypt('Boston', ?)`, [encryptionKey]),
      state: 'MA',
      zip_code_encrypted: knex.raw(`pgp_sym_encrypt('02101', ?)`, [encryptionKey]),
      medical_record_number_encrypted: knex.raw(`pgp_sym_encrypt('MRN001234', ?)`, [encryptionKey]),
      allergies_encrypted: knex.raw(`pgp_sym_encrypt('Penicillin, Shellfish', ?)`, [encryptionKey]),
      preferred_language: 'en',
      timezone: 'America/New_York',
      display_name: 'John D.',
      notifications_enabled: true,
      sms_enabled: true,
      email_notifications: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Patient 2 - Jane Smith (Substance Abuse Recovery)
    {
      id: uuidv4(),
      user_id: testUsers[2].id,
      first_name_encrypted: knex.raw(`pgp_sym_encrypt('Jane', ?)`, [encryptionKey]),
      last_name_encrypted: knex.raw(`pgp_sym_encrypt('Smith', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0102', ?)`, [encryptionKey]),
      date_of_birth: new Date('1990-07-22'),
      address_encrypted: knex.raw(`pgp_sym_encrypt('456 Oak Ave', ?)`, [encryptionKey]),
      city_encrypted: knex.raw(`pgp_sym_encrypt('Cambridge', ?)`, [encryptionKey]),
      state: 'MA',
      zip_code_encrypted: knex.raw(`pgp_sym_encrypt('02139', ?)`, [encryptionKey]),
      medical_record_number_encrypted: knex.raw(`pgp_sym_encrypt('MRN005678', ?)`, [encryptionKey]),
      allergies_encrypted: knex.raw(`pgp_sym_encrypt('None known', ?)`, [encryptionKey]),
      preferred_language: 'en',
      timezone: 'America/New_York',
      display_name: 'Jane S.',
      notifications_enabled: true,
      sms_enabled: true,
      email_notifications: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Provider 1 - Dr. Sarah Johnson (Psychiatrist)
    {
      id: uuidv4(),
      user_id: testUsers[3].id,
      first_name_encrypted: knex.raw(`pgp_sym_encrypt('Dr. Sarah', ?)`, [encryptionKey]),
      last_name_encrypted: knex.raw(`pgp_sym_encrypt('Johnson', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0201', ?)`, [encryptionKey]),
      date_of_birth: new Date('1975-11-08'),
      address_encrypted: knex.raw(`pgp_sym_encrypt('789 Medical Plaza', ?)`, [encryptionKey]),
      city_encrypted: knex.raw(`pgp_sym_encrypt('Boston', ?)`, [encryptionKey]),
      state: 'MA',
      zip_code_encrypted: knex.raw(`pgp_sym_encrypt('02115', ?)`, [encryptionKey]),
      preferred_language: 'en',
      timezone: 'America/New_York',
      display_name: 'Dr. Johnson',
      notifications_enabled: true,
      email_notifications: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Provider 2 - Michael Thompson (Therapist)
    {
      id: uuidv4(),
      user_id: testUsers[4].id,
      first_name_encrypted: knex.raw(`pgp_sym_encrypt('Michael', ?)`, [encryptionKey]),
      last_name_encrypted: knex.raw(`pgp_sym_encrypt('Thompson', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0202', ?)`, [encryptionKey]),
      date_of_birth: new Date('1982-05-14'),
      address_encrypted: knex.raw(`pgp_sym_encrypt('321 Therapy Center', ?)`, [encryptionKey]),
      city_encrypted: knex.raw(`pgp_sym_encrypt('Cambridge', ?)`, [encryptionKey]),
      state: 'MA',
      zip_code_encrypted: knex.raw(`pgp_sym_encrypt('02140', ?)`, [encryptionKey]),
      preferred_language: 'en',
      timezone: 'America/New_York',
      display_name: 'Michael T.',
      notifications_enabled: true,
      email_notifications: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Supporter 1 - Lisa Brown (Peer Support)
    {
      id: uuidv4(),
      user_id: testUsers[5].id,
      first_name_encrypted: knex.raw(`pgp_sym_encrypt('Lisa', ?)`, [encryptionKey]),
      last_name_encrypted: knex.raw(`pgp_sym_encrypt('Brown', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0301', ?)`, [encryptionKey]),
      date_of_birth: new Date('1988-09-03'),
      preferred_language: 'en',
      timezone: 'America/New_York',
      display_name: 'Lisa B.',
      notifications_enabled: true,
      sms_enabled: true,
      email_notifications: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Supporter 2 - Robert Doe (John's Family Member)
    {
      id: uuidv4(),
      user_id: testUsers[6].id,
      first_name_encrypted: knex.raw(`pgp_sym_encrypt('Robert', ?)`, [encryptionKey]),
      last_name_encrypted: knex.raw(`pgp_sym_encrypt('Doe', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0302', ?)`, [encryptionKey]),
      date_of_birth: new Date('1960-12-25'),
      preferred_language: 'en',
      timezone: 'America/New_York',
      display_name: 'Robert D.',
      notifications_enabled: true,
      sms_enabled: true,
      email_notifications: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  await knex('user_profiles').insert(userProfiles);
  console.log(`✅ Inserted ${userProfiles.length} user profiles with encrypted PHI`);

  // Create some test sessions
  const testSessions = [
    {
      id: uuidv4(),
      user_id: testUsers[1].id, // John Doe
      session_token: 'test_session_token_patient1',
      device_type: 'web',
      device_name: 'Chrome Browser',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      ip_address: '192.168.1.100',
      is_active: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      created_at: new Date()
    },
    {
      id: uuidv4(),
      user_id: testUsers[3].id, // Dr. Johnson
      session_token: 'test_session_token_provider1',
      device_type: 'web',
      device_name: 'Safari Browser',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      ip_address: '192.168.1.200',
      is_active: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date()
    }
  ];

  await knex('user_sessions').insert(testSessions);
  console.log(`✅ Inserted ${testSessions.length} test sessions`);

  console.log('\n🎉 Test users and profiles seeded successfully!');
  console.log('\n📋 Test Accounts Created:');
  console.log('========================');
  console.log('Admin: admin@serenity.com / TestPass123!');
  console.log('Patient 1: patient1@serenity.com / TestPass123! (John Doe)');
  console.log('Patient 2: patient2@serenity.com / TestPass123! (Jane Smith)');
  console.log('Provider 1: provider1@serenity.com / TestPass123! (Dr. Johnson)');
  console.log('Provider 2: therapist@serenity.com / TestPass123! (Michael T.)');
  console.log('Supporter 1: supporter1@serenity.com / TestPass123! (Lisa B.)');
  console.log('Supporter 2: familymember@serenity.com / TestPass123! (Robert D.)');
  console.log('\n⚠️  WARNING: This seed data is for DEVELOPMENT ONLY!');
  console.log('   Never use these accounts or encryption keys in production!');
};
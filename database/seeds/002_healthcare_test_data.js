/**
 * Seed: Healthcare test data
 * Creates realistic healthcare data for testing: check-ins, care plans, appointments, etc.
 * HIPAA Note: This is for development only - uses encrypted test data
 */

const { v4: uuidv4 } = require('uuid');

exports.seed = async function(knex) {
  console.log('🏥 Seeding healthcare test data...');
  
  // Get test users for relationships
  const users = await knex('users').select('id', 'email', 'role');
  const patients = users.filter(u => u.role === 'patient');
  const providers = users.filter(u => u.role === 'provider');
  const supporters = users.filter(u => u.role === 'supporter');
  
  if (patients.length === 0 || providers.length === 0) {
    console.log('❌ No test users found. Run user seed first.');
    return;
  }

  const encryptionKey = 'test_key_for_development_only_32_chars';
  const patient1 = patients[0]; // John Doe
  const patient2 = patients[1] || patients[0]; // Jane Smith or fallback
  const provider1 = providers[0]; // Dr. Johnson
  const provider2 = providers[1] || providers[0]; // Michael T. or fallback

  // 1. Create Emergency Contacts
  console.log('📞 Creating emergency contacts...');
  
  const emergencyContacts = [
    // John Doe's emergency contacts
    {
      id: uuidv4(),
      patient_id: patient1.id,
      name_encrypted: knex.raw(`pgp_sym_encrypt('Robert Doe (Father)', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0302', ?)`, [encryptionKey]),
      email_encrypted: knex.raw(`pgp_sym_encrypt('familymember@serenity.com', ?)`, [encryptionKey]),
      relationship_encrypted: knex.raw(`pgp_sym_encrypt('Father', ?)`, [encryptionKey]),
      tier: 'primary',
      sms_enabled: true,
      call_enabled: true,
      email_enabled: true,
      is_verified: true,
      verified_at: new Date(),
      consent_given: true,
      consent_given_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      patient_id: patient1.id,
      name_encrypted: knex.raw(`pgp_sym_encrypt('Dr. Sarah Johnson', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0201', ?)`, [encryptionKey]),
      email_encrypted: knex.raw(`pgp_sym_encrypt('provider1@serenity.com', ?)`, [encryptionKey]),
      relationship_encrypted: knex.raw(`pgp_sym_encrypt('Psychiatrist', ?)`, [encryptionKey]),
      tier: 'professional',
      sms_enabled: false,
      call_enabled: true,
      email_enabled: true,
      is_verified: true,
      verified_at: new Date(),
      consent_given: true,
      consent_given_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  if (patient2.id !== patient1.id) {
    // Jane Smith's emergency contacts
    emergencyContacts.push({
      id: uuidv4(),
      patient_id: patient2.id,
      name_encrypted: knex.raw(`pgp_sym_encrypt('Lisa Brown (Sponsor)', ?)`, [encryptionKey]),
      phone_encrypted: knex.raw(`pgp_sym_encrypt('+1-555-0301', ?)`, [encryptionKey]),
      email_encrypted: knex.raw(`pgp_sym_encrypt('supporter1@serenity.com', ?)`, [encryptionKey]),
      relationship_encrypted: knex.raw(`pgp_sym_encrypt('AA Sponsor', ?)`, [encryptionKey]),
      tier: 'primary',
      sms_enabled: true,
      call_enabled: true,
      email_enabled: true,
      is_verified: true,
      verified_at: new Date(),
      consent_given: true,
      consent_given_at: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  await knex('emergency_contacts').insert(emergencyContacts);
  console.log(`✅ Inserted ${emergencyContacts.length} emergency contacts`);

  // 2. Create Care Plans
  console.log('📋 Creating care plans...');
  
  const carePlans = [
    // John Doe's depression/anxiety treatment plan
    {
      id: uuidv4(),
      patient_id: patient1.id,
      provider_id: provider1.id,
      title_encrypted: knex.raw(`pgp_sym_encrypt('Major Depression and GAD Treatment Plan', ?)`, [encryptionKey]),
      description_encrypted: knex.raw(`pgp_sym_encrypt('Comprehensive treatment plan for major depressive disorder with generalized anxiety disorder', ?)`, [encryptionKey]),
      primary_diagnosis_encrypted: knex.raw(`pgp_sym_encrypt('F32.1 - Major depressive disorder, single episode, moderate; F41.1 - Generalized anxiety disorder', ?)`, [encryptionKey]),
      treatment_goals_encrypted: knex.raw(`pgp_sym_encrypt('["Reduce depressive symptoms by 50% within 12 weeks", "Improve daily functioning and sleep quality", "Develop coping strategies for anxiety management", "Medication compliance and monitoring"]', ?)`, [encryptionKey]),
      medication_plan_encrypted: knex.raw(`pgp_sym_encrypt('Sertraline 50mg daily, Lorazepam 0.5mg as needed for severe anxiety', ?)`, [encryptionKey]),
      therapy_modalities_encrypted: knex.raw(`pgp_sym_encrypt('Cognitive Behavioral Therapy (CBT), Mindfulness-Based Stress Reduction', ?)`, [encryptionKey]),
      recommended_session_frequency: 1, // Weekly
      expected_duration_weeks: 16,
      target_completion_date: new Date(Date.now() + 16 * 7 * 24 * 60 * 60 * 1000),
      primary_therapist_id: provider2.id,
      is_active: true,
      status: 'active',
      start_date: new Date(),
      next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      patient_consent: true,
      consent_date: new Date(),
      consent_method: 'electronic',
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  if (patient2.id !== patient1.id) {
    // Jane Smith's substance abuse recovery plan
    carePlans.push({
      id: uuidv4(),
      patient_id: patient2.id,
      provider_id: provider2.id,
      title_encrypted: knex.raw(`pgp_sym_encrypt('Substance Use Disorder Recovery Plan', ?)`, [encryptionKey]),
      description_encrypted: knex.raw(`pgp_sym_encrypt('Comprehensive recovery plan for alcohol use disorder with dual diagnosis support', ?)`, [encryptionKey]),
      primary_diagnosis_encrypted: knex.raw(`pgp_sym_encrypt('F10.20 - Alcohol use disorder, moderate; F32.0 - Major depressive disorder, single episode, mild', ?)`, [encryptionKey]),
      treatment_goals_encrypted: knex.raw(`pgp_sym_encrypt('["Maintain sobriety for 90 days", "Attend daily AA meetings for first 30 days", "Complete intensive outpatient program", "Address underlying depression", "Rebuild family relationships"]', ?)`, [encryptionKey]),
      medication_plan_encrypted: knex.raw(`pgp_sym_encrypt('Naltrexone 50mg daily, Bupropion XL 150mg daily', ?)`, [encryptionKey]),
      therapy_modalities_encrypted: knex.raw(`pgp_sym_encrypt('Intensive Outpatient Program (IOP), Individual CBT, Group therapy, Family therapy', ?)`, [encryptionKey]),
      recommended_session_frequency: 3, // Three times per week initially
      expected_duration_weeks: 12,
      target_completion_date: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000),
      primary_therapist_id: provider2.id,
      is_active: true,
      status: 'active',
      start_date: new Date(),
      next_review_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      patient_consent: true,
      consent_date: new Date(),
      consent_method: 'written',
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  await knex('care_plans').insert(carePlans);
  console.log(`✅ Inserted ${carePlans.length} care plans`);

  // 3. Create Daily Check-ins (last 14 days)
  console.log('📊 Creating daily check-ins...');
  
  const dailyCheckins = [];
  const now = new Date();
  
  // Create 14 days of check-ins for John Doe
  for (let i = 13; i >= 0; i--) {
    const checkinDate = new Date(now);
    checkinDate.setDate(checkinDate.getDate() - i);
    checkinDate.setHours(0, 0, 0, 0);
    
    // Simulate gradual improvement over time
    const improvementFactor = (13 - i) / 13; // 0 to 1 over time
    const baseMood = 3 + Math.floor(improvementFactor * 4); // 3 to 7
    const baseAnxiety = 8 - Math.floor(improvementFactor * 3); // 8 to 5
    
    dailyCheckins.push({
      id: uuidv4(),
      patient_id: patient1.id,
      mood_level: Math.min(10, Math.max(1, baseMood + Math.floor(Math.random() * 3 - 1))).toString(),
      anxiety_level: Math.min(10, Math.max(1, baseAnxiety + Math.floor(Math.random() * 3 - 1))).toString(),
      sleep_quality: ['poor', 'fair', 'good'][Math.floor(Math.random() * 3)],
      sleep_hours: 6 + Math.random() * 3, // 6-9 hours
      took_medication: Math.random() > 0.1, // 90% compliance
      exercised: Math.random() > 0.4, // 60% exercise rate
      exercise_minutes: Math.random() > 0.4 ? Math.floor(20 + Math.random() * 40) : null,
      journal_entry_encrypted: knex.raw(`pgp_sym_encrypt('Feeling ${baseMood > 5 ? 'better' : 'challenging'} today. ${improvementFactor > 0.5 ? 'Making progress with therapy.' : 'Still struggling but trying.'}', ?)`, [encryptionKey]),
      symptoms: JSON.stringify(['fatigue', 'worry', 'low_motivation'].slice(0, Math.floor(Math.random() * 3) + 1)),
      stress_level: Math.min(10, Math.max(1, baseAnxiety + Math.floor(Math.random() * 2 - 1))),
      energy_level: Math.min(10, Math.max(1, baseMood + Math.floor(Math.random() * 2))),
      substance_free: true,
      days_sober: 45 + (13 - i), // Increasing sobriety days
      checkin_date: checkinDate,
      checkin_time: new Date(checkinDate.getTime() + 9 * 60 * 60 * 1000), // 9 AM
      is_complete: true,
      completion_method: 'manual',
      created_at: new Date(checkinDate.getTime() + 9 * 60 * 60 * 1000),
      updated_at: new Date(checkinDate.getTime() + 9 * 60 * 60 * 1000)
    });
  }

  // Create check-ins for Jane Smith if different patient
  if (patient2.id !== patient1.id) {
    for (let i = 10; i >= 0; i--) { // Last 11 days
      const checkinDate = new Date(now);
      checkinDate.setDate(checkinDate.getDate() - i);
      checkinDate.setHours(0, 0, 0, 0);
      
      const recoveryDay = 11 - i;
      const substanceFree = recoveryDay >= 3; // Relapse on day 3
      const moodLevel = substanceFree ? Math.min(8, 4 + Math.floor(recoveryDay / 2)) : 2;
      
      dailyCheckins.push({
        id: uuidv4(),
        patient_id: patient2.id,
        mood_level: moodLevel.toString(),
        anxiety_level: (substanceFree ? Math.max(3, 7 - Math.floor(recoveryDay / 3)) : 9).toString(),
        sleep_quality: substanceFree ? (recoveryDay > 5 ? 'good' : 'fair') : 'poor',
        sleep_hours: substanceFree ? 6.5 + Math.random() * 2 : 4 + Math.random() * 2,
        took_medication: substanceFree && Math.random() > 0.15, // 85% compliance when sober
        exercised: substanceFree && Math.random() > 0.5,
        exercise_minutes: substanceFree && Math.random() > 0.5 ? Math.floor(15 + Math.random() * 30) : null,
        substance_free: substanceFree,
        substance_notes_encrypted: substanceFree ? null : knex.raw(`pgp_sym_encrypt('Had a difficult day and drank 3 beers. Calling sponsor.', ?)`, [encryptionKey]),
        days_sober: substanceFree ? Math.max(0, recoveryDay - 3) : 0,
        attended_meeting: substanceFree && Math.random() > 0.2, // 80% meeting attendance
        meeting_type: substanceFree && Math.random() > 0.2 ? 'AA' : null,
        journal_entry_encrypted: knex.raw(`pgp_sym_encrypt('${substanceFree ? 'Another day sober. Taking it one day at a time.' : 'Struggling today. Need to get back on track.'}', ?)`, [encryptionKey]),
        checkin_date: checkinDate,
        checkin_time: new Date(checkinDate.getTime() + 8 * 60 * 60 * 1000), // 8 AM
        is_complete: true,
        completion_method: 'manual',
        created_at: new Date(checkinDate.getTime() + 8 * 60 * 60 * 1000),
        updated_at: new Date(checkinDate.getTime() + 8 * 60 * 60 * 1000)
      });
    }
  }

  await knex('daily_checkins').insert(dailyCheckins);
  console.log(`✅ Inserted ${dailyCheckins.length} daily check-ins`);

  // 4. Create Appointments
  console.log('📅 Creating appointments...');
  
  const appointments = [
    // John's upcoming therapy session
    {
      id: uuidv4(),
      patient_id: patient1.id,
      provider_id: provider2.id,
      care_plan_id: carePlans[0].id,
      title_encrypted: knex.raw(`pgp_sym_encrypt('CBT Therapy Session', ?)`, [encryptionKey]),
      description_encrypted: knex.raw(`pgp_sym_encrypt('Weekly cognitive behavioral therapy session focusing on anxiety management techniques', ?)`, [encryptionKey]),
      appointment_type: 'therapy',
      modality: 'telehealth',
      scheduled_start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Day after tomorrow, 2 PM
      scheduled_end: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000), // 1 hour session
      duration_minutes: 60,
      timezone: 'America/New_York',
      telehealth_link_encrypted: knex.raw(`pgp_sym_encrypt('https://serenity-telehealth.com/room/12345', ?)`, [encryptionKey]),
      status: 'confirmed',
      cpt_code: '90837',
      diagnosis_codes_encrypted: knex.raw(`pgp_sym_encrypt('F32.1, F41.1', ?)`, [encryptionKey]),
      session_fee: 150.00,
      copay_amount: 20.00,
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // John's psychiatric medication review
    {
      id: uuidv4(),
      patient_id: patient1.id,
      provider_id: provider1.id,
      care_plan_id: carePlans[0].id,
      title_encrypted: knex.raw(`pgp_sym_encrypt('Medication Management', ?)`, [encryptionKey]),
      description_encrypted: knex.raw(`pgp_sym_encrypt('Monthly medication review and assessment', ?)`, [encryptionKey]),
      appointment_type: 'psychiatry',
      modality: 'in_person',
      scheduled_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Next week, 10 AM
      scheduled_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 10.5 * 60 * 60 * 1000), // 30 min session
      duration_minutes: 30,
      timezone: 'America/New_York',
      location_encrypted: knex.raw(`pgp_sym_encrypt('789 Medical Plaza, Suite 200, Boston, MA 02115', ?)`, [encryptionKey]),
      room_number_encrypted: knex.raw(`pgp_sym_encrypt('200B', ?)`, [encryptionKey]),
      status: 'scheduled',
      cpt_code: '99213',
      diagnosis_codes_encrypted: knex.raw(`pgp_sym_encrypt('F32.1, F41.1', ?)`, [encryptionKey]),
      session_fee: 200.00,
      copay_amount: 30.00,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  if (patient2.id !== patient1.id && carePlans.length > 1) {
    // Jane's IOP group session
    appointments.push({
      id: uuidv4(),
      patient_id: patient2.id,
      provider_id: provider2.id,
      care_plan_id: carePlans[1].id,
      title_encrypted: knex.raw(`pgp_sym_encrypt('IOP Group Therapy', ?)`, [encryptionKey]),
      description_encrypted: knex.raw(`pgp_sym_encrypt('Intensive Outpatient Program group therapy session', ?)`, [encryptionKey]),
      appointment_type: 'group',
      modality: 'in_person',
      scheduled_start: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000), // Tomorrow, 6 PM
      scheduled_end: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 19.5 * 60 * 60 * 1000), // 1.5 hour session
      duration_minutes: 90,
      timezone: 'America/New_York',
      location_encrypted: knex.raw(`pgp_sym_encrypt('321 Therapy Center, Group Room A, Cambridge, MA 02140', ?)`, [encryptionKey]),
      room_number_encrypted: knex.raw(`pgp_sym_encrypt('A', ?)`, [encryptionKey]),
      status: 'confirmed',
      cpt_code: '90853',
      session_fee: 75.00,
      copay_amount: 15.00,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  await knex('appointments').insert(appointments);
  console.log(`✅ Inserted ${appointments.length} appointments`);

  // 5. Create Medication Tracking
  console.log('💊 Creating medication tracking...');
  
  const medications = [
    // John's medications
    {
      id: uuidv4(),
      patient_id: patient1.id,
      prescribed_by: provider1.id,
      care_plan_id: carePlans[0].id,
      medication_name_encrypted: knex.raw(`pgp_sym_encrypt('Sertraline', ?)`, [encryptionKey]),
      generic_name_encrypted: knex.raw(`pgp_sym_encrypt('Sertraline', ?)`, [encryptionKey]),
      brand_name_encrypted: knex.raw(`pgp_sym_encrypt('Zoloft', ?)`, [encryptionKey]),
      strength_encrypted: knex.raw(`pgp_sym_encrypt('50mg', ?)`, [encryptionKey]),
      dosage_form_encrypted: knex.raw(`pgp_sym_encrypt('Tablet', ?)`, [encryptionKey]),
      dosage_instructions_encrypted: knex.raw(`pgp_sym_encrypt('Take 1 tablet by mouth once daily with or without food', ?)`, [encryptionKey]),
      frequency: 'once_daily',
      pills_per_dose: 1,
      dose_amount: 50.000,
      dose_unit: 'mg',
      morning_dose_time: '08:00:00',
      prescribed_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      quantity_prescribed: 90,
      refills_remaining: 2,
      refill_due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      indication_encrypted: knex.raw(`pgp_sym_encrypt('Major Depressive Disorder', ?)`, [encryptionKey]),
      side_effects_to_monitor_encrypted: knex.raw(`pgp_sym_encrypt('["nausea", "headache", "drowsiness", "sexual_dysfunction"]', ?)`, [encryptionKey]),
      current_adherence_rate: 87.50,
      total_doses_prescribed: 30,
      total_doses_taken: 27,
      total_doses_missed: 3,
      is_active: true,
      status: 'active',
      adherence_tracking_enabled: true,
      reminder_notifications_enabled: true,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      patient_id: patient1.id,
      prescribed_by: provider1.id,
      care_plan_id: carePlans[0].id,
      medication_name_encrypted: knex.raw(`pgp_sym_encrypt('Lorazepam', ?)`, [encryptionKey]),
      generic_name_encrypted: knex.raw(`pgp_sym_encrypt('Lorazepam', ?)`, [encryptionKey]),
      brand_name_encrypted: knex.raw(`pgp_sym_encrypt('Ativan', ?)`, [encryptionKey]),
      strength_encrypted: knex.raw(`pgp_sym_encrypt('0.5mg', ?)`, [encryptionKey]),
      dosage_form_encrypted: knex.raw(`pgp_sym_encrypt('Tablet', ?)`, [encryptionKey]),
      dosage_instructions_encrypted: knex.raw(`pgp_sym_encrypt('Take 1 tablet by mouth as needed for severe anxiety, maximum 3 times per day', ?)`, [encryptionKey]),
      frequency: 'as_needed',
      pills_per_dose: 1,
      dose_amount: 0.500,
      dose_unit: 'mg',
      prescribed_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      quantity_prescribed: 30,
      refills_remaining: 0,
      refill_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      indication_encrypted: knex.raw(`pgp_sym_encrypt('Generalized Anxiety Disorder (PRN)', ?)`, [encryptionKey]),
      side_effects_to_monitor_encrypted: knex.raw(`pgp_sym_encrypt('["drowsiness", "dizziness", "dependency_risk"]', ?)`, [encryptionKey]),
      special_instructions_encrypted: knex.raw(`pgp_sym_encrypt('Do not drive after taking. Avoid alcohol. Use sparingly to prevent dependence.', ?)`, [encryptionKey]),
      current_adherence_rate: 95.00,
      is_active: true,
      status: 'active',
      adherence_tracking_enabled: false, // PRN medication
      reminder_notifications_enabled: false,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updated_at: new Date()
    }
  ];

  if (patient2.id !== patient1.id && carePlans.length > 1) {
    // Jane's medications
    medications.push(
      {
        id: uuidv4(),
        patient_id: patient2.id,
        prescribed_by: provider1.id,
        care_plan_id: carePlans[1].id,
        medication_name_encrypted: knex.raw(`pgp_sym_encrypt('Naltrexone', ?)`, [encryptionKey]),
        generic_name_encrypted: knex.raw(`pgp_sym_encrypt('Naltrexone', ?)`, [encryptionKey]),
        brand_name_encrypted: knex.raw(`pgp_sym_encrypt('Revia', ?)`, [encryptionKey]),
        strength_encrypted: knex.raw(`pgp_sym_encrypt('50mg', ?)`, [encryptionKey]),
        dosage_form_encrypted: knex.raw(`pgp_sym_encrypt('Tablet', ?)`, [encryptionKey]),
        dosage_instructions_encrypted: knex.raw(`pgp_sym_encrypt('Take 1 tablet by mouth once daily for alcohol dependence', ?)`, [encryptionKey]),
        frequency: 'once_daily',
        pills_per_dose: 1,
        dose_amount: 50.000,
        dose_unit: 'mg',
        morning_dose_time: '09:00:00',
        prescribed_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        quantity_prescribed: 30,
        refills_remaining: 1,
        refill_due_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
        indication_encrypted: knex.raw(`pgp_sym_encrypt('Alcohol Use Disorder', ?)`, [encryptionKey]),
        side_effects_to_monitor_encrypted: knex.raw(`pgp_sym_encrypt('["nausea", "headache", "fatigue", "liver_function"]', ?)`, [encryptionKey]),
        requires_monitoring: true,
        monitoring_parameters_encrypted: knex.raw(`pgp_sym_encrypt('Liver function tests monthly', ?)`, [encryptionKey]),
        current_adherence_rate: 78.57, // Some missed doses
        total_doses_prescribed: 14,
        total_doses_taken: 11,
        total_doses_missed: 3,
        is_active: true,
        status: 'active',
        adherence_tracking_enabled: true,
        reminder_notifications_enabled: true,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        updated_at: new Date()
      }
    );
  }

  await knex('medication_tracking').insert(medications);
  console.log(`✅ Inserted ${medications.length} medication prescriptions`);

  // 6. Create some sample notifications
  console.log('🔔 Creating sample notifications...');
  
  const notifications = [
    // Reminder notifications
    {
      id: uuidv4(),
      user_id: patient1.id,
      title_encrypted: knex.raw(`pgp_sym_encrypt('Daily Check-in Reminder', ?)`, [encryptionKey]),
      message_encrypted: knex.raw(`pgp_sym_encrypt('Don\\'t forget to complete your daily mood and wellness check-in!', ?)`, [encryptionKey]),
      notification_type: 'checkin_reminder',
      priority: 'normal',
      channel: 'push',
      status: 'delivered',
      sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      delivered_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
      contains_phi: false,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: uuidv4(),
      user_id: patient1.id,
      title_encrypted: knex.raw(`pgp_sym_encrypt('Upcoming Appointment', ?)`, [encryptionKey]),
      message_encrypted: knex.raw(`pgp_sym_encrypt('You have a therapy session with Michael Thompson tomorrow at 2:00 PM', ?)`, [encryptionKey]),
      notification_type: 'appointment_reminder',
      priority: 'high',
      channel: 'sms',
      status: 'delivered',
      related_appointment_id: appointments[0].id,
      sent_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      delivered_at: new Date(Date.now() - 30 * 60 * 1000),
      contains_phi: true,
      created_at: new Date(Date.now() - 30 * 60 * 1000)
    }
  ];

  await knex('notifications').insert(notifications);
  console.log(`✅ Inserted ${notifications.length} sample notifications`);

  console.log('\n🎉 Healthcare test data seeded successfully!');
  console.log('\n📊 Data Summary:');
  console.log('================');
  console.log(`📞 Emergency Contacts: ${emergencyContacts.length}`);
  console.log(`📋 Care Plans: ${carePlans.length}`);
  console.log(`📊 Daily Check-ins: ${dailyCheckins.length} (14 days of data)`);
  console.log(`📅 Appointments: ${appointments.length}`);
  console.log(`💊 Medications: ${medications.length}`);
  console.log(`🔔 Notifications: ${notifications.length}`);
  console.log('\n⚠️  WARNING: This data is for DEVELOPMENT ONLY!');
};
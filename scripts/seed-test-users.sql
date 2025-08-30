-- Seed Test Users for Development
-- Password for all test users: TestSerenity2024!@#

-- Insert test users
INSERT INTO users (id, email, password_hash, is_active, created_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'test-patient@serenity.com', '$2a$10$YourHashHere', true, NOW()),
    ('22222222-2222-2222-2222-222222222222', 'test-provider@serenity.com', '$2a$10$YourHashHere', true, NOW()),
    ('33333333-3333-3333-3333-333333333333', 'test-supporter@serenity.com', '$2a$10$YourHashHere', true, NOW()),
    ('44444444-4444-4444-4444-444444444444', 'john.doe@example.com', '$2a$10$YourHashHere', true, NOW()),
    ('55555555-5555-5555-5555-555555555555', 'jane.smith@example.com', '$2a$10$YourHashHere', true, NOW()),
    ('66666666-6666-6666-6666-666666666666', 'admin@serenity.com', '$2a$10$YourHashHere', true, NOW());

-- Insert profiles
INSERT INTO profiles (id, full_name, phone_number, date_of_birth) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Patient', '555-0100', '1990-01-01'),
    ('22222222-2222-2222-2222-222222222222', 'Dr. Test Provider', '555-0200', '1980-06-15'),
    ('33333333-3333-3333-3333-333333333333', 'Test Supporter', '555-0300', '1985-03-20'),
    ('44444444-4444-4444-4444-444444444444', 'John Doe', '555-0400', '1992-07-10'),
    ('55555555-5555-5555-5555-555555555555', 'Jane Smith', '555-0500', '1988-11-25'),
    ('66666666-6666-6666-6666-666666666666', 'System Admin', '555-0600', '1975-05-05');

-- Assign roles
INSERT INTO user_roles (user_id, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'patient'),
    ('22222222-2222-2222-2222-222222222222', 'provider'),
    ('33333333-3333-3333-3333-333333333333', 'supporter'),
    ('44444444-4444-4444-4444-444444444444', 'patient'),
    ('55555555-5555-5555-5555-555555555555', 'patient'),
    ('66666666-6666-6666-6666-666666666666', 'admin');

-- Create support connections
INSERT INTO support_connections (patient_id, supporter_id, connection_type, can_receive_alerts, can_view_checkins) VALUES
    ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'supporter', true, true),
    ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'supporter', true, false),
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'provider', true, true);

-- Add emergency contacts
INSERT INTO emergency_contacts (user_id, name, relationship, phone, email, priority) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Emergency Contact 1', 'Family', '555-0911', 'emergency1@example.com', 1),
    ('11111111-1111-1111-1111-111111111111', 'Emergency Contact 2', 'Friend', '555-0912', 'emergency2@example.com', 2),
    ('44444444-4444-4444-4444-444444444444', 'John Emergency', 'Spouse', '555-0913', 'johnemergency@example.com', 1);

-- Add sample check-ins for the test patient
INSERT INTO daily_checkins (user_id, check_in_date, mood, anxiety_level, sleep_hours, medication_taken, notes) VALUES
    ('11111111-1111-1111-1111-111111111111', CURRENT_DATE, 7, 4, 7.5, true, 'Feeling good today'),
    ('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day', 6, 5, 6.5, true, 'Had some anxiety yesterday'),
    ('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '2 days', 8, 3, 8.0, true, 'Great sleep, feeling rested'),
    ('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '3 days', 5, 6, 5.5, false, 'Forgot medication, rough day'),
    ('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '4 days', 7, 4, 7.0, true, 'Steady progress'),
    ('44444444-4444-4444-4444-444444444444', CURRENT_DATE, 8, 2, 8.5, true, 'Excellent day');

-- Add sample notifications
INSERT INTO notifications (user_id, type, title, message, data) VALUES
    ('11111111-1111-1111-1111-111111111111', 'info', 'Welcome to Serenity', 'Your account has been created successfully', '{"welcome": true}'),
    ('11111111-1111-1111-1111-111111111111', 'reminder', 'Daily Check-in', 'Remember to complete your daily check-in', '{"type": "checkin"}'),
    ('22222222-2222-2222-2222-222222222222', 'alert', 'New Patient', 'A new patient has been assigned to you', '{"patientId": "11111111-1111-1111-1111-111111111111"}');

-- Add audit log entries
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, metadata) VALUES
    ('11111111-1111-1111-1111-111111111111', 'LOGIN', 'user', '11111111-1111-1111-1111-111111111111', '127.0.0.1', '{"method": "password"}'),
    ('11111111-1111-1111-1111-111111111111', 'CREATE', 'daily_checkin', uuid_generate_v4(), '127.0.0.1', '{"mood": 7}'),
    ('22222222-2222-2222-2222-222222222222', 'VIEW', 'patient_profile', '11111111-1111-1111-1111-111111111111', '127.0.0.1', '{"reason": "routine_checkup"}');

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Test users seeded successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Credentials:';
    RAISE NOTICE '================';
    RAISE NOTICE 'Patient: test-patient@serenity.com / TestSerenity2024!@#';
    RAISE NOTICE 'Provider: test-provider@serenity.com / TestSerenity2024!@#';
    RAISE NOTICE 'Supporter: test-supporter@serenity.com / TestSerenity2024!@#';
    RAISE NOTICE 'Admin: admin@serenity.com / TestSerenity2024!@#';
END $$;
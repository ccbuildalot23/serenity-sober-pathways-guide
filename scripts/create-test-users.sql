-- Create Test Users for Serenity Platform
-- These users will be used for E2E testing and development

-- Test Patient User
INSERT INTO users (id, email, email_verified, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'test-patient@serenity.com', true, true);

INSERT INTO profiles (id, full_name, phone_number, bio)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Patient', '+15551234567', 'Test patient account for E2E testing');

INSERT INTO user_roles (user_id, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'patient');

-- Test Provider User
INSERT INTO users (id, email, email_verified, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'test-provider@serenity.com', true, true);

INSERT INTO profiles (id, full_name, phone_number, bio)
VALUES ('22222222-2222-2222-2222-222222222222', 'Test Provider', '+15551234568', 'Test provider account for E2E testing');

INSERT INTO user_roles (user_id, role)
VALUES ('22222222-2222-2222-2222-222222222222', 'provider');

-- Test Supporter User
INSERT INTO users (id, email, email_verified, is_active)
VALUES ('33333333-3333-3333-3333-333333333333', 'test-supporter@serenity.com', true, true);

INSERT INTO profiles (id, full_name, phone_number, bio)
VALUES ('33333333-3333-3333-3333-333333333333', 'Test Supporter', '+15551234569', 'Test supporter account for E2E testing');

INSERT INTO user_roles (user_id, role)
VALUES ('33333333-3333-3333-3333-333333333333', 'supporter');

-- Create support connections
-- Connect supporter to patient
INSERT INTO support_connections (patient_id, supporter_id, connection_type, can_view_checkins, can_receive_alerts)
VALUES ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'family', true, true);

-- Connect provider to patient
INSERT INTO support_connections (patient_id, supporter_id, connection_type, can_view_checkins, can_receive_alerts)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'provider', true, true);

-- Add emergency contacts for patient
INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, priority, is_primary)
VALUES ('11111111-1111-1111-1111-111111111111', 'Emergency Contact 1', '+15559999999', 'Family', 1, true);

INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, priority)
VALUES ('11111111-1111-1111-1111-111111111111', 'Emergency Contact 2', '+15558888888', 'Friend', 2);

-- Add sample check-ins for patient
INSERT INTO daily_checkins (user_id, check_in_date, mood, anxiety_level, sleep_hours, medication_taken, notes)
VALUES 
('11111111-1111-1111-1111-111111111111', CURRENT_DATE, 'good', 3, 7.5, true, 'Feeling good today'),
('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '1 day', 'neutral', 5, 6.5, true, 'Average day'),
('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '2 days', 'good', 4, 8.0, true, 'Slept well');

-- Verify users created
SELECT u.email, p.full_name, r.role 
FROM users u 
JOIN profiles p ON u.id = p.id 
JOIN user_roles r ON u.id = r.user_id
ORDER BY u.email;
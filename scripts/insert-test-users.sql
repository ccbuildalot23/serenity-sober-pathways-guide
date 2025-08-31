-- Insert test users for MVP testing
-- These users have hardcoded passwords in the backend server

-- Test Patient
INSERT INTO users (id, email, created_at) 
VALUES ('11111111-1111-1111-1111-111111111111', 'test-patient@serenity.com', NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id, full_name, phone_number) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Patient', '555-0100')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role) 
VALUES ('11111111-1111-1111-1111-111111111111', 'patient')
ON CONFLICT (user_id, role) DO NOTHING;

-- Test Provider
INSERT INTO users (id, email, created_at) 
VALUES ('22222222-2222-2222-2222-222222222222', 'test-provider@serenity.com', NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id, full_name, phone_number) 
VALUES ('22222222-2222-2222-2222-222222222222', 'Test Provider', '555-0200')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role) 
VALUES ('22222222-2222-2222-2222-222222222222', 'provider')
ON CONFLICT (user_id, role) DO NOTHING;

-- Test Supporter
INSERT INTO users (id, email, created_at) 
VALUES ('33333333-3333-3333-3333-333333333333', 'test-supporter@serenity.com', NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id, full_name, phone_number) 
VALUES ('33333333-3333-3333-3333-333333333333', 'Test Supporter', '555-0300')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role) 
VALUES ('33333333-3333-3333-3333-333333333333', 'supporter')
ON CONFLICT (user_id, role) DO NOTHING;
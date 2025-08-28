-- Enable Row Level Security (RLS) for HIPAA compliance
-- Users can only access their own data unless they have elevated permissions

-- Enable RLS on all tables with sensitive data
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis.support_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.delivery_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can only see their own user record
CREATE POLICY users_own_data ON auth.users
    FOR ALL
    TO serenity_app
    USING (id = current_setting('app.current_user_id')::uuid);

-- Allow admins to see all users
CREATE POLICY users_admin_access ON auth.users
    FOR ALL
    TO serenity_admin
    USING (true);

-- Sessions policy - users can only see their own sessions
CREATE POLICY sessions_own_data ON auth.sessions
    FOR ALL
    TO serenity_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Profiles policy - users can only see their own profile
CREATE POLICY profiles_own_data ON clinical.profiles
    FOR ALL
    TO serenity_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Providers can see profiles of their patients
CREATE POLICY profiles_provider_access ON clinical.profiles
    FOR SELECT
    TO serenity_app
    USING (EXISTS (
        SELECT 1 FROM clinical.provider_patient_relationships ppr
        WHERE ppr.patient_id = user_id 
        AND ppr.provider_id = current_setting('app.current_user_id')::uuid
        AND ppr.is_active = true
    ));

-- Daily check-ins policy - users can only see their own check-ins
CREATE POLICY checkins_own_data ON clinical.daily_checkins
    FOR ALL
    TO serenity_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Providers can see check-ins of their patients
CREATE POLICY checkins_provider_access ON clinical.daily_checkins
    FOR SELECT
    TO serenity_app
    USING (EXISTS (
        SELECT 1 FROM clinical.provider_patient_relationships ppr
        WHERE ppr.patient_id = user_id 
        AND ppr.provider_id = current_setting('app.current_user_id')::uuid
        AND ppr.is_active = true
    ));

-- Crisis alerts policy - users can see their own alerts
CREATE POLICY alerts_own_data ON crisis.alerts
    FOR ALL
    TO serenity_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Support network can see alerts of their supported users
CREATE POLICY alerts_support_access ON crisis.alerts
    FOR SELECT
    TO serenity_app
    USING (EXISTS (
        SELECT 1 FROM crisis.support_network sn
        WHERE sn.user_id = crisis.alerts.user_id
        AND sn.contact_id = current_setting('app.current_user_id')::uuid
        AND sn.is_active = true
    ));

-- Support network policy - users can manage their own support network
CREATE POLICY support_network_own_data ON crisis.support_network
    FOR ALL
    TO serenity_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Notification delivery log policy - users can see their own notifications
CREATE POLICY delivery_log_own_data ON notifications.delivery_log
    FOR SELECT
    TO serenity_app
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO serenity_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA clinical TO serenity_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA crisis TO serenity_app;
GRANT SELECT ON ALL TABLES IN SCHEMA notifications TO serenity_app;
GRANT INSERT ON notifications.delivery_log TO serenity_app;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA auth TO serenity_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA clinical TO serenity_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA crisis TO serenity_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA notifications TO serenity_app;

-- Audit table permissions (read-only for most users)
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO serenity_readonly;
GRANT INSERT ON audit.access_log, audit.data_changes TO serenity_app;
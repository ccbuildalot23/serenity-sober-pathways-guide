-- Serenity Database Initialization Script
-- HIPAA-compliant database setup with proper security and audit trails

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create roles and users
CREATE ROLE serenity_app;
CREATE ROLE serenity_readonly;
CREATE ROLE serenity_admin;

-- Create user for Grafana
CREATE USER grafana_user WITH PASSWORD 'grafana_db_password';
CREATE DATABASE serenity_grafana OWNER grafana_user;

-- Grant privileges
GRANT CONNECT ON DATABASE serenity_dev TO serenity_app;
GRANT CONNECT ON DATABASE serenity_dev TO serenity_readonly;
GRANT CONNECT ON DATABASE serenity_dev TO serenity_admin;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS clinical;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS crisis;

-- Grant schema privileges
GRANT USAGE ON SCHEMA auth TO serenity_app;
GRANT USAGE ON SCHEMA clinical TO serenity_app;
GRANT USAGE ON SCHEMA billing TO serenity_app;
GRANT USAGE ON SCHEMA audit TO serenity_readonly;
GRANT USAGE ON SCHEMA notifications TO serenity_app;
GRANT USAGE ON SCHEMA crisis TO serenity_app;

GRANT ALL ON SCHEMA auth TO serenity_admin;
GRANT ALL ON SCHEMA clinical TO serenity_admin;
GRANT ALL ON SCHEMA billing TO serenity_admin;
GRANT ALL ON SCHEMA audit TO serenity_admin;
GRANT ALL ON SCHEMA notifications TO serenity_admin;
GRANT ALL ON SCHEMA crisis TO serenity_admin;
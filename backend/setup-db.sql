-- Serenity Database Setup Script
-- Run this with: psql -U postgres < setup-db.sql

-- Create database if not exists
CREATE DATABASE serenity;

-- Connect to serenity database
\c serenity;

-- Create user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_user
      WHERE usename = 'serenity_user') THEN
      CREATE USER serenity_user WITH PASSWORD 'serenity_password';
   END IF;
END
$do$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE serenity TO serenity_user;
GRANT ALL ON SCHEMA public TO serenity_user;

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'patient',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    mood INTEGER CHECK (mood >= 1 AND mood <= 10),
    anxiety_level INTEGER CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
    sleep_hours DECIMAL(3,1),
    medication_taken BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, check_in_date)
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    relationship VARCHAR(100),
    priority INTEGER DEFAULT 1,
    can_receive_crisis_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crisis_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    severity VARCHAR(20) DEFAULT 'high',
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    message TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_network (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    supporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, supporter_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO serenity_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO serenity_user;

-- Insert test users
INSERT INTO users (email, password_hash, name, role) VALUES
('test-patient@serenity.com', '$2b$10$YKvVjX0QzH7UxXqKmrW0OuGxGwKzKFZFyHfvF8e3hVZXKJvS5XqNy', 'Test Patient', 'patient'),
('test-provider@serenity.com', '$2b$10$YKvVjX0QzH7UxXqKmrW0OuGxGwKzKFZFyHfvF8e3hVZXKJvS5XqNy', 'Test Provider', 'provider'),
('test-supporter@serenity.com', '$2b$10$YKvVjX0QzH7UxXqKmrW0OuGxGwKzKFZFyHfvF8e3hVZXKJvS5XqNy', 'Test Supporter', 'supporter')
ON CONFLICT (email) DO NOTHING;

-- Password for all test users is: TestPass123!

\echo 'Database setup complete!'
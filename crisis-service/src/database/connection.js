/**
 * PostgreSQL Database Connection
 * HIPAA-compliant database layer with connection pooling
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');
const config = require('../config/config');

class DatabaseConnection {
    constructor() {
        this.pool = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
    }

    async connect() {
        try {
            logger.info('Connecting to PostgreSQL database...');
            
            this.pool = new Pool({
                connectionString: config.database.url,
                min: config.database.pool.min,
                max: config.database.pool.max,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: config.database.timeout,
                ssl: config.environment === 'production' ? {
                    rejectUnauthorized: false
                } : false
            });

            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            // Set up event listeners
            this.setupEventListeners();
            
            this.isConnected = true;
            this.connectionAttempts = 0;
            
            logger.info('PostgreSQL database connected successfully');
            
            // Run migrations if needed
            await this.runMigrations();
            
            return this.pool;
        } catch (error) {
            this.connectionAttempts++;
            logger.error(`Database connection failed (attempt ${this.connectionAttempts}):`, error);
            
            if (this.connectionAttempts < this.maxRetries) {
                logger.info(`Retrying database connection in 5 seconds...`);
                setTimeout(() => this.connect(), 5000);
            } else {
                throw new Error(`Failed to connect to database after ${this.maxRetries} attempts`);
            }
        }
    }

    setupEventListeners() {
        this.pool.on('connect', (client) => {
            logger.debug('Database client connected');
        });

        this.pool.on('acquire', (client) => {
            logger.debug('Database client acquired from pool');
        });

        this.pool.on('remove', (client) => {
            logger.debug('Database client removed from pool');
        });

        this.pool.on('error', (err, client) => {
            logger.error('Database pool error:', err);
            this.handleConnectionError();
        });
    }

    async handleConnectionError() {
        this.isConnected = false;
        
        // Attempt to reconnect
        setTimeout(() => {
            if (!this.isConnected) {
                logger.info('Attempting to reconnect to database...');
                this.connect().catch(err => {
                    logger.error('Database reconnection failed:', err);
                });
            }
        }, 5000);
    }

    async runMigrations() {
        try {
            logger.info('Checking database migrations...');
            
            // Create migrations table if it doesn't exist
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS migrations (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // Define migrations
            const migrations = [
                {
                    name: '001_create_crisis_tables',
                    sql: this.getCrisisTablesMigration()
                },
                {
                    name: '002_create_detection_tables',
                    sql: this.getDetectionTablesMigration()
                },
                {
                    name: '003_create_emergency_tables',
                    sql: this.getEmergencyTablesMigration()
                },
                {
                    name: '004_create_location_tables',
                    sql: this.getLocationTablesMigration()
                },
                {
                    name: '005_create_safety_tables',
                    sql: this.getSafetyTablesMigration()
                }
            ];

            // Run pending migrations
            for (const migration of migrations) {
                const result = await this.pool.query(
                    'SELECT id FROM migrations WHERE name = $1',
                    [migration.name]
                );

                if (result.rows.length === 0) {
                    logger.info(`Running migration: ${migration.name}`);
                    
                    const client = await this.pool.connect();
                    try {
                        await client.query('BEGIN');
                        await client.query(migration.sql);
                        await client.query(
                            'INSERT INTO migrations (name) VALUES ($1)',
                            [migration.name]
                        );
                        await client.query('COMMIT');
                        logger.info(`Migration completed: ${migration.name}`);
                    } catch (error) {
                        await client.query('ROLLBACK');
                        throw error;
                    } finally {
                        client.release();
                    }
                }
            }

            logger.info('Database migrations completed');
        } catch (error) {
            logger.error('Migration error:', error);
            throw error;
        }
    }

    getCrisisTablesMigration() {
        return `
            -- Crisis events table
            CREATE TABLE IF NOT EXISTS crisis_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                severity INTEGER NOT NULL CHECK (severity >= 0 AND severity <= 10),
                confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
                type VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                location_lat DECIMAL(10,8),
                location_lng DECIMAL(11,8),
                location_accuracy INTEGER,
                detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP WITH TIME ZONE,
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Crisis indicators table
            CREATE TABLE IF NOT EXISTS crisis_indicators (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                crisis_event_id UUID NOT NULL REFERENCES crisis_events(id) ON DELETE CASCADE,
                type VARCHAR(100) NOT NULL,
                category VARCHAR(50),
                severity INTEGER NOT NULL,
                confidence DECIMAL(3,2),
                data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Crisis responses table
            CREATE TABLE IF NOT EXISTS crisis_responses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                crisis_event_id UUID NOT NULL REFERENCES crisis_events(id) ON DELETE CASCADE,
                response_type VARCHAR(50) NOT NULL,
                responder_type VARCHAR(50),
                responder_id VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'initiated',
                response_time_ms INTEGER,
                details JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_crisis_events_user_id ON crisis_events(user_id);
            CREATE INDEX IF NOT EXISTS idx_crisis_events_detected_at ON crisis_events(detected_at);
            CREATE INDEX IF NOT EXISTS idx_crisis_events_severity ON crisis_events(severity);
            CREATE INDEX IF NOT EXISTS idx_crisis_events_status ON crisis_events(status);
            CREATE INDEX IF NOT EXISTS idx_crisis_indicators_crisis_event_id ON crisis_indicators(crisis_event_id);
            CREATE INDEX IF NOT EXISTS idx_crisis_responses_crisis_event_id ON crisis_responses(crisis_event_id);
        `;
    }

    getDetectionTablesMigration() {
        return `
            -- User baselines for behavioral analysis
            CREATE TABLE IF NOT EXISTS user_baselines (
                user_id UUID PRIMARY KEY,
                avg_checkin_time INTEGER,
                avg_sleep_hours DECIMAL(4,2),
                avg_heart_rate DECIMAL(5,2),
                avg_mood_score DECIMAL(3,1),
                avg_activity_level DECIMAL(5,2),
                risk_level VARCHAR(20) DEFAULT 'medium',
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Detection history
            CREATE TABLE IF NOT EXISTS detection_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                detection_type VARCHAR(50) NOT NULL,
                severity INTEGER NOT NULL,
                confidence DECIMAL(3,2) NOT NULL,
                response_time_ms INTEGER NOT NULL,
                indicators JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- User risk profiles
            CREATE TABLE IF NOT EXISTS user_risk_profiles (
                user_id UUID PRIMARY KEY,
                risk_score DECIMAL(4,2) NOT NULL DEFAULT 0.5,
                risk_factors JSONB,
                last_crisis_date TIMESTAMP WITH TIME ZONE,
                total_crisis_count INTEGER DEFAULT 0,
                high_risk_flag BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_detection_history_user_id ON detection_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_detection_history_created_at ON detection_history(created_at);
            CREATE INDEX IF NOT EXISTS idx_user_risk_profiles_risk_score ON user_risk_profiles(risk_score);
        `;
    }

    getEmergencyTablesMigration() {
        return `
            -- Emergency contacts
            CREATE TABLE IF NOT EXISTS emergency_contacts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                contact_type VARCHAR(50) NOT NULL, -- 'tier1', 'tier2', 'professional', 'emergency'
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                email VARCHAR(255),
                relationship VARCHAR(100),
                priority_order INTEGER NOT NULL DEFAULT 1,
                is_active BOOLEAN DEFAULT TRUE,
                notification_preferences JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Emergency escalations
            CREATE TABLE IF NOT EXISTS emergency_escalations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                crisis_event_id UUID NOT NULL REFERENCES crisis_events(id) ON DELETE CASCADE,
                escalation_level INTEGER NOT NULL,
                contact_id UUID REFERENCES emergency_contacts(id),
                notification_type VARCHAR(50) NOT NULL, -- 'sms', 'call', 'email', 'push'
                status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'acknowledged'
                attempts INTEGER DEFAULT 0,
                max_attempts INTEGER DEFAULT 3,
                delay_ms INTEGER NOT NULL,
                scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
                sent_at TIMESTAMP WITH TIME ZONE,
                acknowledged_at TIMESTAMP WITH TIME ZONE,
                response_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Emergency service integrations
            CREATE TABLE IF NOT EXISTS emergency_service_calls (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                crisis_event_id UUID NOT NULL REFERENCES crisis_events(id) ON DELETE CASCADE,
                service_type VARCHAR(50) NOT NULL, -- '911', 'crisis_hotline', 'mental_health'
                call_id VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'initiated',
                location_lat DECIMAL(10,8),
                location_lng DECIMAL(11,8),
                caller_info JSONB,
                service_response JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);
            CREATE INDEX IF NOT EXISTS idx_emergency_contacts_contact_type ON emergency_contacts(contact_type);
            CREATE INDEX IF NOT EXISTS idx_emergency_escalations_crisis_event_id ON emergency_escalations(crisis_event_id);
            CREATE INDEX IF NOT EXISTS idx_emergency_escalations_scheduled_for ON emergency_escalations(scheduled_for);
            CREATE INDEX IF NOT EXISTS idx_emergency_service_calls_crisis_event_id ON emergency_service_calls(crisis_event_id);
        `;
    }

    getLocationTablesMigration() {
        return `
            -- User locations
            CREATE TABLE IF NOT EXISTS user_locations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                latitude DECIMAL(10,8) NOT NULL,
                longitude DECIMAL(11,8) NOT NULL,
                accuracy INTEGER,
                altitude DECIMAL(8,2),
                speed DECIMAL(6,2),
                heading DECIMAL(6,2),
                is_crisis_location BOOLEAN DEFAULT FALSE,
                location_source VARCHAR(50), -- 'gps', 'network', 'manual'
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Safety zones (geofences)
            CREATE TABLE IF NOT EXISTS safety_zones (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                name VARCHAR(255) NOT NULL,
                center_lat DECIMAL(10,8) NOT NULL,
                center_lng DECIMAL(11,8) NOT NULL,
                radius_meters INTEGER NOT NULL DEFAULT 500,
                zone_type VARCHAR(50) NOT NULL, -- 'safe', 'trigger', 'restricted'
                is_active BOOLEAN DEFAULT TRUE,
                entry_alert BOOLEAN DEFAULT FALSE,
                exit_alert BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Location events (geofence triggers)
            CREATE TABLE IF NOT EXISTS location_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                safety_zone_id UUID REFERENCES safety_zones(id) ON DELETE CASCADE,
                event_type VARCHAR(50) NOT NULL, -- 'entered', 'exited'
                latitude DECIMAL(10,8) NOT NULL,
                longitude DECIMAL(11,8) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Nearby emergency services
            CREATE TABLE IF NOT EXISTS emergency_services (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                service_type VARCHAR(50) NOT NULL, -- 'hospital', 'police', 'fire', 'crisis_center'
                address TEXT,
                phone VARCHAR(50),
                latitude DECIMAL(10,8) NOT NULL,
                longitude DECIMAL(11,8) NOT NULL,
                is_24_7 BOOLEAN DEFAULT FALSE,
                specialties TEXT[],
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Spatial indexes for location queries
            CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_locations_created_at ON user_locations(created_at);
            CREATE INDEX IF NOT EXISTS idx_safety_zones_user_id ON safety_zones(user_id);
            CREATE INDEX IF NOT EXISTS idx_location_events_user_id ON location_events(user_id);
            CREATE INDEX IF NOT EXISTS idx_emergency_services_service_type ON emergency_services(service_type);
        `;
    }

    getSafetyTablesMigration() {
        return `
            -- Safety check-ins
            CREATE TABLE IF NOT EXISTS safety_checkins (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                status VARCHAR(50) NOT NULL, -- 'safe', 'concerned', 'crisis'
                mood_score INTEGER,
                anxiety_level INTEGER,
                notes TEXT,
                location_lat DECIMAL(10,8),
                location_lng DECIMAL(11,8),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Safety plans
            CREATE TABLE IF NOT EXISTS safety_plans (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                plan_name VARCHAR(255) NOT NULL,
                warning_signs TEXT[],
                coping_strategies TEXT[],
                support_contacts JSONB,
                professional_contacts JSONB,
                environmental_safety JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Coping resources
            CREATE TABLE IF NOT EXISTS coping_resources (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                category VARCHAR(100) NOT NULL, -- 'breathing', 'grounding', 'distraction', 'mindfulness'
                title VARCHAR(255) NOT NULL,
                description TEXT,
                content JSONB, -- Instructions, audio files, etc.
                duration_minutes INTEGER,
                difficulty_level INTEGER DEFAULT 1, -- 1-5
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- User coping resource usage
            CREATE TABLE IF NOT EXISTS user_coping_usage (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                resource_id UUID NOT NULL REFERENCES coping_resources(id),
                session_duration_seconds INTEGER,
                effectiveness_rating INTEGER, -- 1-10
                notes TEXT,
                used_during_crisis BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_safety_checkins_user_id ON safety_checkins(user_id);
            CREATE INDEX IF NOT EXISTS idx_safety_checkins_created_at ON safety_checkins(created_at);
            CREATE INDEX IF NOT EXISTS idx_safety_plans_user_id ON safety_plans(user_id);
            CREATE INDEX IF NOT EXISTS idx_coping_resources_category ON coping_resources(category);
            CREATE INDEX IF NOT EXISTS idx_user_coping_usage_user_id ON user_coping_usage(user_id);
        `;
    }

    async query(text, params = []) {
        const start = Date.now();
        
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            logger.performance('Database query', duration, {
                query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                rows: result.rowCount
            });
            
            return result;
        } catch (error) {
            const duration = Date.now() - start;
            logger.error('Database query error:', {
                error: error.message,
                query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                duration
            });
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            logger.info('Closing database connection pool...');
            await this.pool.end();
            this.isConnected = false;
            logger.info('Database connection closed');
        }
    }

    getPool() {
        return this.pool;
    }

    isHealthy() {
        return this.isConnected && this.pool && this.pool.totalCount > 0;
    }
}

// Singleton instance
let dbInstance = null;

async function connectDatabase() {
    if (!dbInstance) {
        dbInstance = new DatabaseConnection();
        await dbInstance.connect();
    }
    return dbInstance;
}

function getDatabaseConnection() {
    if (!dbInstance) {
        throw new Error('Database not connected. Call connectDatabase() first.');
    }
    return dbInstance;
}

module.exports = {
    connectDatabase,
    getDatabaseConnection
};
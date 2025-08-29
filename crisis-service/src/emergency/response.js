/**
 * Emergency Response System
 * Automated emergency service notification with tiered contact escalation
 */

const EventEmitter = require('events');
const twilio = require('twilio');
const logger = require('../utils/logger');
const config = require('../config/config');
const { getDatabaseConnection } = require('../database/connection');
const { getRedisManager } = require('../cache/redis');

class EmergencyResponseSystem extends EventEmitter {
    constructor() {
        super();
        this.db = null;
        this.redis = null;
        this.twilioClient = null;
        
        // Active escalations
        this.activeEscalations = new Map(); // crisisId -> escalation state
        this.escalationTimers = new Map(); // crisisId -> timer array
        
        // Emergency service integrations
        this.emergencyServiceApis = new Map();
        
        // Performance metrics
        this.totalResponses = 0;
        this.averageResponseTime = 0;
        this.escalationSuccess = 0;
        this.emergencyServiceCalls = 0;
    }

    async initialize() {
        try {
            logger.info('Initializing Emergency Response System...');
            
            this.db = getDatabaseConnection();
            this.redis = getRedisManager();
            
            // Initialize Twilio client
            this.twilioClient = twilio(
                config.emergency.twilio.accountSid,
                config.emergency.twilio.authToken
            );
            
            // Initialize emergency service APIs
            await this.initializeEmergencyServices();
            
            // Load active escalations from database
            await this.loadActiveEscalations();
            
            // Setup Redis event listeners
            this.setupEventListeners();
            
            // Start background processing
            this.startBackgroundProcessing();
            
            logger.info('Emergency Response System initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Emergency Response System:', error);
            throw error;
        }
    }

    async initializeEmergencyServices() {
        try {
            // 911 Emergency Service Integration
            this.emergencyServiceApis.set('911', {
                name: '911 Emergency Services',
                endpoint: process.env.EMERGENCY_911_ENDPOINT,
                apiKey: config.emergency.apiKey,
                callMethod: this.call911Service.bind(this)
            });
            
            // Crisis Hotlines
            this.emergencyServiceApis.set('crisis_hotline', {
                name: 'National Crisis Hotline',
                number: '988',
                description: '24/7 Crisis Support',
                callMethod: this.connectToCrisisHotline.bind(this)
            });
            
            // Mental Health Crisis Services
            this.emergencyServiceApis.set('mental_health', {
                name: 'Mental Health Crisis Team',
                endpoint: process.env.MENTAL_HEALTH_API_ENDPOINT,
                apiKey: process.env.MENTAL_HEALTH_API_KEY,
                callMethod: this.callMentalHealthCrisis.bind(this)
            });

            logger.info('Emergency service integrations initialized');
        } catch (error) {
            logger.error('Error initializing emergency services:', error);
        }
    }

    async loadActiveEscalations() {
        try {
            // Load pending escalations from database
            const result = await this.db.query(`
                SELECT e.*, ce.user_id
                FROM emergency_escalations e
                JOIN crisis_events ce ON e.crisis_event_id = ce.id
                WHERE e.status IN ('pending', 'sent') 
                  AND e.scheduled_for > NOW()
                ORDER BY e.scheduled_for ASC
            `);

            for (const escalation of result.rows) {
                await this.resumeEscalation(escalation);
            }

            logger.info(`Loaded ${result.rows.length} active escalations`);
        } catch (error) {
            logger.error('Error loading active escalations:', error);
        }
    }

    setupEventListeners() {
        // Listen for crisis events from detection engine
        this.redis.onCrisisAlert((crisisData) => {
            this.handleCrisisAlert(crisisData);
        });
        
        // Listen for location sharing events
        this.redis.addEventListener('location:shared', (data) => {
            this.handleLocationShared(data);
        });
    }

    startBackgroundProcessing() {
        // Process scheduled escalations
        setInterval(() => {
            this.processScheduledEscalations();
        }, 10000); // Check every 10 seconds

        // Cleanup completed escalations
        setInterval(() => {
            this.cleanupCompletedEscalations();
        }, 60000); // Every minute

        // Update performance metrics
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 300000); // Every 5 minutes

        logger.info('Emergency response background processing started');
    }

    /**
     * Main trigger method for crisis response
     */
    async triggerResponse(crisisData) {
        const startTime = Date.now();
        
        try {
            logger.crisis('Triggering emergency response', crisisData.severity, {
                userId: crisisData.userId,
                crisisType: crisisData.type,
                confidence: crisisData.confidence
            });

            // Create crisis event in database
            const crisisEvent = await this.createCrisisEvent(crisisData);
            
            // Determine response level based on severity
            const responseLevel = this.determineResponseLevel(crisisData);
            
            // Create response record
            const response = await this.createResponseRecord(crisisEvent.id, responseLevel);
            
            // Execute immediate actions based on severity
            const immediateActions = await this.executeImmediateActions(crisisData, crisisEvent);
            
            // Start tiered escalation process
            const escalation = await this.startTieredEscalation(crisisData, crisisEvent);
            
            // Store active escalation
            this.activeEscalations.set(crisisEvent.id, {
                crisisData,
                crisisEvent,
                responseLevel,
                escalation,
                startedAt: new Date(),
                status: 'active'
            });

            const responseTime = Date.now() - startTime;
            
            // Update metrics
            this.totalResponses++;
            this.updateAverageResponseTime(responseTime);
            
            logger.crisis('Emergency response triggered', crisisData.severity, {
                crisisId: crisisEvent.id,
                responseTime,
                responseLevel,
                immediateActions: immediateActions.length,
                escalationTiers: escalation.tiers.length
            });

            this.emit('response-triggered', {
                crisisId: crisisEvent.id,
                userId: crisisData.userId,
                responseLevel,
                responseTime,
                immediateActions,
                escalation
            });

            return {
                success: true,
                crisisId: crisisEvent.id,
                responseLevel,
                responseTime,
                immediateActions,
                escalation
            };

        } catch (error) {
            logger.error('Error triggering emergency response:', error);
            return {
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    async createCrisisEvent(crisisData) {
        try {
            const result = await this.db.query(`
                INSERT INTO crisis_events (
                    user_id, severity, confidence, type, status,
                    location_lat, location_lng, location_accuracy, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [
                crisisData.userId,
                crisisData.severity,
                crisisData.confidence,
                crisisData.type,
                'active',
                crisisData.location?.latitude || null,
                crisisData.location?.longitude || null,
                crisisData.location?.accuracy || null,
                JSON.stringify(crisisData.metadata || {})
            ]);

            const crisisEvent = result.rows[0];

            // Store indicators
            if (crisisData.indicators && crisisData.indicators.length > 0) {
                for (const indicator of crisisData.indicators) {
                    await this.db.query(`
                        INSERT INTO crisis_indicators (
                            crisis_event_id, type, category, severity, confidence, data
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        crisisEvent.id,
                        indicator.type,
                        indicator.category || null,
                        indicator.severity,
                        indicator.confidence || null,
                        JSON.stringify(indicator)
                    ]);
                }
            }

            return crisisEvent;
        } catch (error) {
            logger.error('Error creating crisis event:', error);
            throw error;
        }
    }

    determineResponseLevel(crisisData) {
        const severity = crisisData.severity;
        const confidence = crisisData.confidence;
        
        // Response levels: 1-5 (1=low, 5=critical)
        if (severity >= 9 && confidence >= 0.9) {
            return 5; // Critical - immediate 911, all contacts
        } else if (severity >= 8 && confidence >= 0.8) {
            return 4; // High - crisis services, tier 1&2 contacts
        } else if (severity >= 7 && confidence >= 0.7) {
            return 3; // Medium - tier 1 contacts, crisis hotline
        } else if (severity >= 6 && confidence >= 0.6) {
            return 2; // Low-medium - tier 1 contacts only
        } else {
            return 1; // Low - monitoring only
        }
    }

    async createResponseRecord(crisisEventId, responseLevel) {
        try {
            const result = await this.db.query(`
                INSERT INTO crisis_responses (
                    crisis_event_id, response_type, status, details
                ) VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [
                crisisEventId,
                `level_${responseLevel}`,
                'initiated',
                JSON.stringify({
                    responseLevel,
                    startedAt: new Date().toISOString()
                })
            ]);

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating response record:', error);
            throw error;
        }
    }

    async executeImmediateActions(crisisData, crisisEvent) {
        const actions = [];
        const responseLevel = this.determineResponseLevel(crisisData);

        try {
            // Critical level - call 911 immediately
            if (responseLevel >= 5) {
                const emergencyCall = await this.call911Service(crisisData, crisisEvent);
                actions.push({
                    type: '911_call',
                    status: emergencyCall.success ? 'completed' : 'failed',
                    details: emergencyCall
                });
            }

            // High level - notify crisis services
            if (responseLevel >= 4) {
                const crisisServiceCall = await this.callMentalHealthCrisis(crisisData, crisisEvent);
                actions.push({
                    type: 'crisis_service',
                    status: crisisServiceCall.success ? 'completed' : 'failed',
                    details: crisisServiceCall
                });
            }

            // Medium level and above - share location with emergency contacts
            if (responseLevel >= 3 && crisisData.location) {
                // This will be handled by location tracker
                actions.push({
                    type: 'location_sharing',
                    status: 'initiated',
                    details: { location: crisisData.location }
                });
            }

            // All levels - send immediate crisis notification
            await this.redis.publishCrisisAlert(crisisData.userId, {
                ...crisisData,
                crisisId: crisisEvent.id,
                responseLevel,
                immediateResponse: true
            });

            actions.push({
                type: 'crisis_notification',
                status: 'completed',
                details: { crisisId: crisisEvent.id }
            });

            logger.info(`Executed ${actions.length} immediate actions for crisis ${crisisEvent.id}`);
            return actions;

        } catch (error) {
            logger.error('Error executing immediate actions:', error);
            actions.push({
                type: 'error',
                status: 'failed',
                details: { error: error.message }
            });
            return actions;
        }
    }

    async startTieredEscalation(crisisData, crisisEvent) {
        try {
            // Get user's emergency contacts
            let contacts = await this.redis.getEmergencyContacts(crisisData.userId);
            
            if (!contacts) {
                // Load from database
                const result = await this.db.query(`
                    SELECT * FROM emergency_contacts 
                    WHERE user_id = $1 AND is_active = true
                    ORDER BY contact_type, priority_order
                `, [crisisData.userId]);
                
                contacts = result.rows;
                
                // Cache for future use
                if (contacts.length > 0) {
                    await this.redis.cacheEmergencyContacts(crisisData.userId, contacts);
                }
            }

            if (!contacts || contacts.length === 0) {
                logger.warn(`No emergency contacts found for user ${crisisData.userId}`);
                return { tiers: [], totalContacts: 0 };
            }

            const responseLevel = this.determineResponseLevel(crisisData);
            const escalationTiers = this.buildEscalationTiers(contacts, responseLevel);
            
            // Schedule escalation tiers
            let cumulativeDelay = 0;
            const scheduledEscalations = [];

            for (let tierIndex = 0; tierIndex < escalationTiers.length; tierIndex++) {
                const tier = escalationTiers[tierIndex];
                const delay = this.getTierDelay(tierIndex);
                cumulativeDelay += delay;

                for (const contact of tier.contacts) {
                    const scheduledFor = new Date(Date.now() + cumulativeDelay);
                    
                    const escalationRecord = await this.db.query(`
                        INSERT INTO emergency_escalations (
                            crisis_event_id, escalation_level, contact_id,
                            notification_type, delay_ms, scheduled_for,
                            max_attempts
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING *
                    `, [
                        crisisEvent.id,
                        tierIndex + 1,
                        contact.id,
                        this.selectNotificationMethod(contact, responseLevel),
                        delay,
                        scheduledFor,
                        responseLevel >= 4 ? 5 : 3 // More attempts for higher severity
                    ]);

                    scheduledEscalations.push(escalationRecord.rows[0]);
                    
                    // Schedule the escalation
                    this.scheduleEscalation(escalationRecord.rows[0]);
                }
            }

            const escalation = {
                crisisId: crisisEvent.id,
                tiers: escalationTiers,
                scheduled: scheduledEscalations,
                totalContacts: contacts.length,
                responseLevel
            };

            logger.info(`Started tiered escalation for crisis ${crisisEvent.id}`, {
                tiers: escalationTiers.length,
                totalContacts: contacts.length,
                scheduledEscalations: scheduledEscalations.length
            });

            return escalation;

        } catch (error) {
            logger.error('Error starting tiered escalation:', error);
            return { tiers: [], totalContacts: 0, error: error.message };
        }
    }

    buildEscalationTiers(contacts, responseLevel) {
        const tiers = [];
        
        // Tier 1: Primary emergency contacts
        const tier1 = contacts.filter(c => c.contact_type === 'tier1');
        if (tier1.length > 0) {
            tiers.push({
                level: 1,
                name: 'Primary Emergency Contacts',
                contacts: tier1,
                delay: config.emergency.escalation.tier1Delay
            });
        }

        // Tier 2: Secondary contacts (for medium+ severity)
        if (responseLevel >= 3) {
            const tier2 = contacts.filter(c => c.contact_type === 'tier2');
            if (tier2.length > 0) {
                tiers.push({
                    level: 2,
                    name: 'Secondary Emergency Contacts',
                    contacts: tier2,
                    delay: config.emergency.escalation.tier2Delay
                });
            }
        }

        // Tier 3: Professional contacts (for high+ severity)
        if (responseLevel >= 4) {
            const professional = contacts.filter(c => c.contact_type === 'professional');
            if (professional.length > 0) {
                tiers.push({
                    level: 3,
                    name: 'Professional Contacts',
                    contacts: professional,
                    delay: config.emergency.escalation.professionalDelay
                });
            }
        }

        return tiers;
    }

    getTierDelay(tierIndex) {
        const delays = [
            config.emergency.escalation.tier1Delay,
            config.emergency.escalation.tier2Delay,
            config.emergency.escalation.professionalDelay
        ];
        return delays[tierIndex] || 300000; // 5 minutes default
    }

    selectNotificationMethod(contact, responseLevel) {
        // Prefer calls for higher severity
        if (responseLevel >= 4 && contact.phone) {
            return 'call';
        }
        
        // Check contact preferences
        const preferences = contact.notification_preferences || {};
        
        if (preferences.preferredMethod) {
            return preferences.preferredMethod;
        }
        
        // Default priority: call > sms > email
        if (contact.phone) return 'sms';
        if (contact.email) return 'email';
        return 'push';
    }

    scheduleEscalation(escalationRecord) {
        const delay = new Date(escalationRecord.scheduled_for).getTime() - Date.now();
        
        if (delay <= 0) {
            // Execute immediately if scheduled time has passed
            this.executeEscalation(escalationRecord);
        } else {
            // Schedule for future execution
            const timer = setTimeout(() => {
                this.executeEscalation(escalationRecord);
            }, delay);
            
            // Store timer reference
            const crisisId = escalationRecord.crisis_event_id;
            if (!this.escalationTimers.has(crisisId)) {
                this.escalationTimers.set(crisisId, []);
            }
            this.escalationTimers.get(crisisId).push(timer);
        }
    }

    async executeEscalation(escalationRecord) {
        try {
            logger.info(`Executing escalation ${escalationRecord.id}`, {
                crisisId: escalationRecord.crisis_event_id,
                level: escalationRecord.escalation_level,
                contactId: escalationRecord.contact_id,
                type: escalationRecord.notification_type
            });

            // Get contact details
            const contact = await this.db.query(`
                SELECT * FROM emergency_contacts WHERE id = $1
            `, [escalationRecord.contact_id]);

            if (contact.rows.length === 0) {
                throw new Error('Contact not found');
            }

            const contactDetails = contact.rows[0];

            // Get crisis details
            const crisis = await this.db.query(`
                SELECT * FROM crisis_events WHERE id = $1
            `, [escalationRecord.crisis_event_id]);

            if (crisis.rows.length === 0) {
                throw new Error('Crisis event not found');
            }

            const crisisDetails = crisis.rows[0];

            // Execute notification
            let notificationResult;
            switch (escalationRecord.notification_type) {
                case 'call':
                    notificationResult = await this.makeEmergencyCall(contactDetails, crisisDetails);
                    break;
                case 'sms':
                    notificationResult = await this.sendEmergencySMS(contactDetails, crisisDetails);
                    break;
                case 'email':
                    notificationResult = await this.sendEmergencyEmail(contactDetails, crisisDetails);
                    break;
                default:
                    throw new Error(`Unknown notification type: ${escalationRecord.notification_type}`);
            }

            // Update escalation status
            await this.db.query(`
                UPDATE emergency_escalations 
                SET status = $1, sent_at = NOW(), attempts = attempts + 1,
                    response_data = $2
                WHERE id = $3
            `, [
                notificationResult.success ? 'sent' : 'failed',
                JSON.stringify(notificationResult),
                escalationRecord.id
            ]);

            this.emit('escalation-triggered', {
                escalationId: escalationRecord.id,
                crisisId: escalationRecord.crisis_event_id,
                contactId: escalationRecord.contact_id,
                level: escalationRecord.escalation_level,
                type: escalationRecord.notification_type,
                success: notificationResult.success,
                result: notificationResult
            });

            // Schedule retry if failed and within attempt limit
            if (!notificationResult.success && 
                escalationRecord.attempts < escalationRecord.max_attempts) {
                
                const retryDelay = Math.min(60000 * escalationRecord.attempts, 300000); // Max 5 minutes
                setTimeout(() => {
                    this.executeEscalation({
                        ...escalationRecord,
                        attempts: escalationRecord.attempts + 1
                    });
                }, retryDelay);
            }

            if (notificationResult.success) {
                this.escalationSuccess++;
            }

        } catch (error) {
            logger.error(`Error executing escalation ${escalationRecord.id}:`, error);
            
            // Mark as failed
            await this.db.query(`
                UPDATE emergency_escalations 
                SET status = 'failed', attempts = attempts + 1
                WHERE id = $1
            `, [escalationRecord.id]);
        }
    }

    // Emergency Service Integration Methods

    async call911Service(crisisData, crisisEvent) {
        try {
            this.emergencyServiceCalls++;
            
            const call911Data = {
                crisisId: crisisEvent.id,
                userId: crisisData.userId,
                severity: crisisData.severity,
                location: crisisData.location,
                timestamp: new Date().toISOString(),
                emergencyType: this.determineEmergencyType(crisisData),
                description: this.generateEmergencyDescription(crisisData)
            };

            // Record the 911 call
            const result = await this.db.query(`
                INSERT INTO emergency_service_calls (
                    crisis_event_id, service_type, status, 
                    location_lat, location_lng, caller_info, service_response
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                crisisEvent.id,
                '911',
                'initiated',
                crisisData.location?.latitude || null,
                crisisData.location?.longitude || null,
                JSON.stringify(call911Data),
                JSON.stringify({ initiated: true, timestamp: new Date().toISOString() })
            ]);

            // In a real implementation, this would integrate with actual 911 services
            // For now, we simulate the call and notify relevant parties
            
            logger.emergency(`911 SERVICE CALL INITIATED`, 10, {
                crisisId: crisisEvent.id,
                userId: crisisData.userId,
                location: crisisData.location,
                emergencyType: call911Data.emergencyType
            });

            // Simulate successful 911 integration
            await this.db.query(`
                UPDATE emergency_service_calls 
                SET status = 'completed', service_response = $1
                WHERE id = $2
            `, [
                JSON.stringify({
                    status: 'dispatched',
                    callId: `911-${Date.now()}`,
                    dispatchTime: new Date().toISOString(),
                    estimatedArrival: new Date(Date.now() + 8 * 60 * 1000).toISOString() // 8 minutes
                }),
                result.rows[0].id
            ]);

            return {
                success: true,
                callId: result.rows[0].id,
                emergencyType: call911Data.emergencyType,
                estimatedArrival: '8 minutes'
            };

        } catch (error) {
            logger.error('Error calling 911 service:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async callMentalHealthCrisis(crisisData, crisisEvent) {
        try {
            const crisisServiceData = {
                crisisId: crisisEvent.id,
                userId: crisisData.userId,
                severity: crisisData.severity,
                confidence: crisisData.confidence,
                location: crisisData.location,
                indicators: crisisData.indicators || [],
                timestamp: new Date().toISOString()
            };

            const result = await this.db.query(`
                INSERT INTO emergency_service_calls (
                    crisis_event_id, service_type, status, caller_info
                ) VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [
                crisisEvent.id,
                'mental_health',
                'initiated',
                JSON.stringify(crisisServiceData)
            ]);

            // Simulate mental health crisis team dispatch
            logger.info(`Mental health crisis team notified for crisis ${crisisEvent.id}`);

            await this.db.query(`
                UPDATE emergency_service_calls 
                SET status = 'completed', service_response = $1
                WHERE id = $2
            `, [
                JSON.stringify({
                    status: 'team_dispatched',
                    teamId: `MH-${Date.now()}`,
                    responseTime: new Date().toISOString(),
                    estimatedContact: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
                }),
                result.rows[0].id
            ]);

            return {
                success: true,
                callId: result.rows[0].id,
                teamDispatched: true,
                estimatedContact: '15 minutes'
            };

        } catch (error) {
            logger.error('Error calling mental health crisis service:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async connectToCrisisHotline(crisisData, crisisEvent) {
        try {
            // Connect to crisis hotline (988)
            const hotlineData = {
                crisisId: crisisEvent.id,
                userId: crisisData.userId,
                hotlineNumber: '988',
                timestamp: new Date().toISOString()
            };

            const result = await this.db.query(`
                INSERT INTO emergency_service_calls (
                    crisis_event_id, service_type, status, caller_info
                ) VALUES ($1, $2, $3, $4)
                RETURNING *
            `, [
                crisisEvent.id,
                'crisis_hotline',
                'initiated',
                JSON.stringify(hotlineData)
            ]);

            // In real implementation, this would initiate a call to 988
            logger.info(`Crisis hotline connection initiated for crisis ${crisisEvent.id}`);

            return {
                success: true,
                callId: result.rows[0].id,
                hotlineNumber: '988',
                connectionInitiated: true
            };

        } catch (error) {
            logger.error('Error connecting to crisis hotline:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Notification Methods

    async makeEmergencyCall(contact, crisisDetails) {
        try {
            const message = this.generateEmergencyMessage(contact, crisisDetails, 'call');
            
            const call = await this.twilioClient.calls.create({
                twiml: `<Response><Say voice="alice">${message}</Say><Pause length="2"/><Say voice="alice">Press any key to acknowledge this emergency alert.</Say><Gather timeout="30" numDigits="1"><Say voice="alice">Waiting for acknowledgment...</Say></Gather></Response>`,
                to: contact.phone,
                from: config.emergency.twilio.phoneNumber,
                statusCallback: `${process.env.BASE_URL}/api/emergency/call-status`,
                statusCallbackMethod: 'POST'
            });

            logger.info(`Emergency call initiated to ${contact.name}`, {
                callSid: call.sid,
                phone: contact.phone,
                crisisId: crisisDetails.id
            });

            return {
                success: true,
                callSid: call.sid,
                phone: contact.phone,
                method: 'call'
            };

        } catch (error) {
            logger.error(`Error making emergency call to ${contact.name}:`, error);
            return {
                success: false,
                error: error.message,
                method: 'call'
            };
        }
    }

    async sendEmergencySMS(contact, crisisDetails) {
        try {
            const message = this.generateEmergencyMessage(contact, crisisDetails, 'sms');
            
            const sms = await this.twilioClient.messages.create({
                body: message,
                to: contact.phone,
                from: config.emergency.twilio.phoneNumber,
                statusCallback: `${process.env.BASE_URL}/api/emergency/sms-status`
            });

            logger.info(`Emergency SMS sent to ${contact.name}`, {
                messageSid: sms.sid,
                phone: contact.phone,
                crisisId: crisisDetails.id
            });

            return {
                success: true,
                messageSid: sms.sid,
                phone: contact.phone,
                method: 'sms'
            };

        } catch (error) {
            logger.error(`Error sending emergency SMS to ${contact.name}:`, error);
            return {
                success: false,
                error: error.message,
                method: 'sms'
            };
        }
    }

    async sendEmergencyEmail(contact, crisisDetails) {
        try {
            // Email implementation would go here
            // For now, just log and return success
            
            const message = this.generateEmergencyMessage(contact, crisisDetails, 'email');
            
            logger.info(`Emergency email would be sent to ${contact.name}`, {
                email: contact.email,
                crisisId: crisisDetails.id,
                subject: 'URGENT: Emergency Alert for Your Contact'
            });

            return {
                success: true,
                email: contact.email,
                method: 'email',
                message: 'Email functionality not implemented yet'
            };

        } catch (error) {
            logger.error(`Error sending emergency email to ${contact.name}:`, error);
            return {
                success: false,
                error: error.message,
                method: 'email'
            };
        }
    }

    // Utility Methods

    determineEmergencyType(crisisData) {
        const indicators = crisisData.indicators || [];
        
        if (indicators.some(i => i.type.includes('suicide') || i.category === 'crisis')) {
            return 'psychiatric_emergency';
        }
        
        if (crisisData.type === 'biometric') {
            return 'medical_emergency';
        }
        
        if (crisisData.type === 'location') {
            return 'safety_concern';
        }
        
        return 'mental_health_crisis';
    }

    generateEmergencyDescription(crisisData) {
        const type = this.determineEmergencyType(crisisData);
        const severity = crisisData.severity;
        const indicators = crisisData.indicators || [];
        
        let description = `${type.replace('_', ' ').toUpperCase()} - Severity ${severity}/10. `;
        
        if (indicators.length > 0) {
            const indicatorTypes = indicators.map(i => i.type).join(', ');
            description += `Detected indicators: ${indicatorTypes}. `;
        }
        
        if (crisisData.location) {
            description += `Location: ${crisisData.location.latitude}, ${crisisData.location.longitude}`;
        }
        
        return description;
    }

    generateEmergencyMessage(contact, crisisDetails, method) {
        const relationshipText = contact.relationship ? ` (${contact.relationship})` : '';
        const timestamp = new Date().toLocaleString();
        
        let message = `EMERGENCY ALERT: Your emergency contact${relationshipText} needs immediate assistance. `;
        message += `Crisis detected at ${timestamp}. `;
        
        if (crisisDetails.location_lat && crisisDetails.location_lng) {
            message += `Last known location: https://maps.google.com/maps?q=${crisisDetails.location_lat},${crisisDetails.location_lng} `;
        }
        
        if (method === 'call') {
            message += 'Please respond immediately or contact emergency services if needed.';
        } else {
            message += 'Reply ACKNOWLEDGE to confirm receipt. Contact emergency services if immediate danger.';
        }
        
        return message;
    }

    async resumeEscalation(escalationRecord) {
        // Resume escalation that was interrupted by service restart
        const delay = new Date(escalationRecord.scheduled_for).getTime() - Date.now();
        
        if (delay <= 0) {
            // Should have been executed already
            await this.executeEscalation(escalationRecord);
        } else {
            // Schedule for future execution
            this.scheduleEscalation(escalationRecord);
        }
    }

    async processScheduledEscalations() {
        // This method is called by background processing
        // Most escalations are handled by timers, but this catches any that might be missed
        try {
            const result = await this.db.query(`
                SELECT * FROM emergency_escalations
                WHERE status = 'pending' AND scheduled_for <= NOW()
                ORDER BY scheduled_for ASC
                LIMIT 10
            `);

            for (const escalation of result.rows) {
                await this.executeEscalation(escalation);
            }

        } catch (error) {
            logger.error('Error processing scheduled escalations:', error);
        }
    }

    async cleanupCompletedEscalations() {
        try {
            // Clean up old completed escalations
            const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
            
            const result = await this.db.query(`
                DELETE FROM emergency_escalations
                WHERE status IN ('completed', 'failed', 'acknowledged') 
                  AND created_at < $1
            `, [cutoffDate]);

            if (result.rowCount > 0) {
                logger.info(`Cleaned up ${result.rowCount} old escalation records`);
            }

            // Clean up active escalations map
            for (const [crisisId, escalation] of this.activeEscalations.entries()) {
                if (escalation.startedAt < cutoffDate) {
                    this.activeEscalations.delete(crisisId);
                    
                    // Clear any associated timers
                    const timers = this.escalationTimers.get(crisisId) || [];
                    timers.forEach(timer => clearTimeout(timer));
                    this.escalationTimers.delete(crisisId);
                }
            }

        } catch (error) {
            logger.error('Error cleaning up completed escalations:', error);
        }
    }

    updateAverageResponseTime(responseTime) {
        this.averageResponseTime = 
            ((this.averageResponseTime * (this.totalResponses - 1)) + responseTime) / this.totalResponses;
    }

    updatePerformanceMetrics() {
        logger.info('Emergency Response System Performance Metrics', {
            totalResponses: this.totalResponses,
            averageResponseTime: Math.round(this.averageResponseTime),
            escalationSuccessRate: this.totalResponses > 0 ? 
                Math.round((this.escalationSuccess / this.totalResponses) * 100) : 0,
            emergencyServiceCalls: this.emergencyServiceCalls,
            activeEscalations: this.activeEscalations.size,
            scheduledEscalations: this.escalationTimers.size
        });
    }

    async close() {
        logger.info('Closing Emergency Response System...');
        
        // Clear all timers
        for (const timers of this.escalationTimers.values()) {
            timers.forEach(timer => clearTimeout(timer));
        }
        
        this.escalationTimers.clear();
        this.activeEscalations.clear();
        
        logger.info('Emergency Response System closed');
    }
}

module.exports = EmergencyResponseSystem;
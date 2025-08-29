/**
 * Emergency Response Routes
 * API endpoints for emergency services and escalation management
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { getDatabaseConnection } = require('../database/connection');

const router = express.Router();

/**
 * Get emergency contacts for a user
 */
router.get('/contacts/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { userId } = req.params;
        const db = getDatabaseConnection();

        const result = await db.query(`
            SELECT id, contact_type, name, phone, email, relationship,
                   priority_order, is_active, notification_preferences
            FROM emergency_contacts
            WHERE user_id = $1 AND is_active = true
            ORDER BY contact_type, priority_order
        `, [userId]);

        const contacts = result.rows.map(row => ({
            id: row.id,
            type: row.contact_type,
            name: row.name,
            phone: row.phone,
            email: row.email,
            relationship: row.relationship,
            priority: row.priority_order,
            notificationPreferences: row.notification_preferences || {}
        }));

        res.json({
            success: true,
            contacts,
            totalCount: contacts.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching emergency contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch emergency contacts',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Add or update emergency contact
 */
router.post('/contacts/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('type').isIn(['tier1', 'tier2', 'professional', 'emergency']).withMessage('Invalid contact type'),
    body('name').isString().isLength({ min: 1, max: 255 }).withMessage('Name required and must be under 255 characters'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('relationship').optional().isString().isLength({ max: 100 }).withMessage('Relationship too long'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1 and 10'),
    body('notificationPreferences').optional().isObject().withMessage('Notification preferences must be an object')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { userId } = req.params;
        const {
            type,
            name,
            phone = null,
            email = null,
            relationship = null,
            priority = 1,
            notificationPreferences = {}
        } = req.body;

        // Validate at least phone or email is provided
        if (!phone && !email) {
            return res.status(400).json({
                error: 'Either phone or email must be provided',
                timestamp: new Date().toISOString()
            });
        }

        const db = getDatabaseConnection();

        const result = await db.query(`
            INSERT INTO emergency_contacts (
                user_id, contact_type, name, phone, email, relationship,
                priority_order, notification_preferences
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `, [
            userId, type, name, phone, email, relationship, priority,
            JSON.stringify(notificationPreferences)
        ]);

        const contactId = result.rows[0].id;

        logger.audit('emergency_contact_added', userId, {
            contactId,
            contactType: type,
            contactName: name,
            ip: req.ip
        });

        res.status(201).json({
            success: true,
            contactId,
            message: 'Emergency contact added successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error adding emergency contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add emergency contact',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Update emergency contact
 */
router.put('/contacts/:userId/:contactId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    param('contactId').isUUID().withMessage('Valid contact ID required'),
    body('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Name must be under 255 characters'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('relationship').optional().isString().isLength({ max: 100 }).withMessage('Relationship too long'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1 and 10'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    body('notificationPreferences').optional().isObject().withMessage('Notification preferences must be an object')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { userId, contactId } = req.params;
        const updateData = req.body;

        const db = getDatabaseConnection();

        // Build dynamic update query
        const updateFields = [];
        const params = [contactId, userId];
        let paramIndex = 3;

        for (const [key, value] of Object.entries(updateData)) {
            const columnMap = {
                name: 'name',
                phone: 'phone', 
                email: 'email',
                relationship: 'relationship',
                priority: 'priority_order',
                isActive: 'is_active',
                notificationPreferences: 'notification_preferences'
            };

            if (columnMap[key]) {
                if (key === 'notificationPreferences') {
                    updateFields.push(`${columnMap[key]} = $${paramIndex}`);
                    params.push(JSON.stringify(value));
                } else {
                    updateFields.push(`${columnMap[key]} = $${paramIndex}`);
                    params.push(value);
                }
                paramIndex++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update',
                timestamp: new Date().toISOString()
            });
        }

        updateFields.push('updated_at = NOW()');

        const query = `
            UPDATE emergency_contacts 
            SET ${updateFields.join(', ')}
            WHERE id = $1 AND user_id = $2
            RETURNING id, name, contact_type
        `;

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Emergency contact not found',
                timestamp: new Date().toISOString()
            });
        }

        logger.audit('emergency_contact_updated', userId, {
            contactId,
            contactName: result.rows[0].name,
            contactType: result.rows[0].contact_type,
            updatedFields: Object.keys(updateData),
            ip: req.ip
        });

        res.json({
            success: true,
            contactId,
            message: 'Emergency contact updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error updating emergency contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update emergency contact',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Delete emergency contact
 */
router.delete('/contacts/:userId/:contactId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    param('contactId').isUUID().withMessage('Valid contact ID required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { userId, contactId } = req.params;
        const db = getDatabaseConnection();

        const result = await db.query(`
            UPDATE emergency_contacts 
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING name, contact_type
        `, [contactId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Emergency contact not found',
                timestamp: new Date().toISOString()
            });
        }

        logger.audit('emergency_contact_deleted', userId, {
            contactId,
            contactName: result.rows[0].name,
            contactType: result.rows[0].contact_type,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Emergency contact deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error deleting emergency contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete emergency contact',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get escalation history for a crisis
 */
router.get('/escalations/crisis/:crisisId', [
    param('crisisId').isUUID().withMessage('Valid crisis ID required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { crisisId } = req.params;
        const db = getDatabaseConnection();

        const result = await db.query(`
            SELECT ee.id, ee.escalation_level, ee.notification_type, ee.status,
                   ee.attempts, ee.max_attempts, ee.delay_ms, ee.scheduled_for,
                   ee.sent_at, ee.acknowledged_at, ee.response_data, ee.created_at,
                   ec.name as contact_name, ec.phone as contact_phone, 
                   ec.email as contact_email, ec.relationship, ec.contact_type
            FROM emergency_escalations ee
            LEFT JOIN emergency_contacts ec ON ee.contact_id = ec.id
            WHERE ee.crisis_event_id = $1
            ORDER BY ee.escalation_level, ee.created_at
        `, [crisisId]);

        const escalations = result.rows.map(row => ({
            id: row.id,
            level: row.escalation_level,
            notificationType: row.notification_type,
            status: row.status,
            attempts: row.attempts,
            maxAttempts: row.max_attempts,
            delayMs: row.delay_ms,
            scheduledFor: row.scheduled_for,
            sentAt: row.sent_at,
            acknowledgedAt: row.acknowledged_at,
            responseData: row.response_data,
            createdAt: row.created_at,
            contact: row.contact_name ? {
                name: row.contact_name,
                phone: row.contact_phone,
                email: row.contact_email,
                relationship: row.relationship,
                type: row.contact_type
            } : null
        }));

        // Get escalation summary
        const summary = {
            totalEscalations: escalations.length,
            completedEscalations: escalations.filter(e => e.status === 'sent').length,
            failedEscalations: escalations.filter(e => e.status === 'failed').length,
            acknowledgedEscalations: escalations.filter(e => e.acknowledgedAt).length,
            pendingEscalations: escalations.filter(e => e.status === 'pending').length,
            maxLevel: Math.max(...escalations.map(e => e.level), 0)
        };

        res.json({
            success: true,
            crisisId,
            escalations,
            summary,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching escalation history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch escalation history',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Acknowledge escalation
 */
router.post('/escalations/:escalationId/acknowledge', [
    param('escalationId').isUUID().withMessage('Valid escalation ID required'),
    body('acknowledgedBy').isString().isLength({ min: 1, max: 255 }).withMessage('acknowledgedBy required'),
    body('message').optional().isString().isLength({ max: 500 }).withMessage('Message too long')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { escalationId } = req.params;
        const { acknowledgedBy, message = '' } = req.body;

        const db = getDatabaseConnection();

        const result = await db.query(`
            UPDATE emergency_escalations 
            SET status = 'acknowledged',
                acknowledged_at = NOW(),
                response_data = jsonb_set(
                    COALESCE(response_data, '{}'),
                    '{acknowledgment}',
                    json_build_object('by', $2, 'message', $3, 'timestamp', NOW())::jsonb
                )
            WHERE id = $1 AND status IN ('sent', 'pending')
            RETURNING crisis_event_id, escalation_level, contact_id
        `, [escalationId, acknowledgedBy, message]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Escalation not found or already acknowledged',
                timestamp: new Date().toISOString()
            });
        }

        const escalation = result.rows[0];

        logger.info('Escalation acknowledged', {
            escalationId,
            crisisId: escalation.crisis_event_id,
            level: escalation.escalation_level,
            acknowledgedBy,
            message
        });

        res.json({
            success: true,
            escalationId,
            message: 'Escalation acknowledged successfully',
            acknowledgedAt: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error acknowledging escalation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to acknowledge escalation',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get emergency service call history
 */
router.get('/service-calls/crisis/:crisisId', [
    param('crisisId').isUUID().withMessage('Valid crisis ID required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { crisisId } = req.params;
        const db = getDatabaseConnection();

        const result = await db.query(`
            SELECT id, service_type, call_id, status, location_lat, location_lng,
                   caller_info, service_response, created_at, updated_at
            FROM emergency_service_calls
            WHERE crisis_event_id = $1
            ORDER BY created_at ASC
        `, [crisisId]);

        const serviceCalls = result.rows.map(row => ({
            id: row.id,
            serviceType: row.service_type,
            callId: row.call_id,
            status: row.status,
            location: row.location_lat && row.location_lng ? {
                latitude: parseFloat(row.location_lat),
                longitude: parseFloat(row.location_lng)
            } : null,
            callerInfo: row.caller_info,
            serviceResponse: row.service_response,
            initiatedAt: row.created_at,
            lastUpdated: row.updated_at
        }));

        res.json({
            success: true,
            crisisId,
            serviceCalls,
            totalCalls: serviceCalls.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching service call history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch service call history',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Manual trigger emergency escalation (for providers/admins)
 */
router.post('/escalate/manual', [
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('severity').isInt({ min: 1, max: 10 }).withMessage('Severity must be between 1 and 10'),
    body('reason').isString().isLength({ min: 1, max: 500 }).withMessage('Reason required and must be under 500 characters'),
    body('triggerLevel').optional().isInt({ min: 1, max: 5 }).withMessage('Trigger level must be between 1 and 5'),
    body('location').optional().isObject().withMessage('Location must be an object')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const {
            userId,
            severity,
            reason,
            triggerLevel = null,
            location = null
        } = req.body;

        // Import emergency response system
        const EmergencyResponseSystem = require('../emergency/response');
        const emergencyResponse = new EmergencyResponseSystem();
        await emergencyResponse.initialize();

        // Create manual crisis data
        const manualCrisisData = {
            userId,
            type: 'manual_escalation',
            severity,
            confidence: 1.0, // High confidence for manual triggers
            location,
            metadata: {
                reason,
                triggeredBy: 'api',
                triggerLevel,
                ip: req.ip,
                userAgent: req.get('user-agent'),
                timestamp: new Date().toISOString()
            }
        };

        // Trigger emergency response
        const response = await emergencyResponse.triggerResponse(manualCrisisData);

        logger.emergency('Manual escalation triggered via API', severity, {
            userId,
            reason,
            triggerLevel,
            ip: req.ip
        });

        res.status(202).json({
            success: true,
            crisisId: response.crisisId,
            message: 'Manual escalation triggered successfully',
            response: {
                level: response.responseLevel,
                immediateActions: response.immediateActions.length,
                escalationTiers: response.escalation?.tiers?.length || 0
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error triggering manual escalation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to trigger manual escalation',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Webhook endpoint for Twilio call/SMS status updates
 */
router.post('/webhook/twilio', [
    body('CallSid').optional().isString(),
    body('MessageSid').optional().isString(),
    body('CallStatus').optional().isString(),
    body('MessageStatus').optional().isString()
], async (req, res) => {
    try {
        const {
            CallSid,
            MessageSid,
            CallStatus,
            MessageStatus,
            From,
            To,
            CallDuration,
            RecordingUrl,
            Digits
        } = req.body;

        logger.info('Twilio webhook received', {
            callSid: CallSid,
            messageSid: MessageSid,
            callStatus: CallStatus,
            messageStatus: MessageStatus,
            from: From,
            to: To
        });

        // Update escalation status based on webhook data
        const db = getDatabaseConnection();
        
        if (CallSid && CallStatus) {
            // Handle call status update
            await db.query(`
                UPDATE emergency_escalations 
                SET response_data = jsonb_set(
                    COALESCE(response_data, '{}'),
                    '{twilio_status}',
                    json_build_object(
                        'call_sid', $1,
                        'status', $2,
                        'duration', $3,
                        'recording_url', $4,
                        'digits', $5,
                        'updated_at', NOW()
                    )::jsonb
                )
                WHERE response_data->>'callSid' = $1
            `, [CallSid, CallStatus, CallDuration, RecordingUrl, Digits]);

            // If call was answered and digits were pressed, mark as acknowledged
            if (CallStatus === 'completed' && Digits) {
                await db.query(`
                    UPDATE emergency_escalations 
                    SET status = 'acknowledged', acknowledged_at = NOW()
                    WHERE response_data->>'callSid' = $1 AND status = 'sent'
                `, [CallSid]);
            }
        }

        if (MessageSid && MessageStatus) {
            // Handle SMS status update
            await db.query(`
                UPDATE emergency_escalations 
                SET response_data = jsonb_set(
                    COALESCE(response_data, '{}'),
                    '{twilio_status}',
                    json_build_object(
                        'message_sid', $1,
                        'status', $2,
                        'updated_at', NOW()
                    )::jsonb
                )
                WHERE response_data->>'messageSid' = $1
            `, [MessageSid, MessageStatus]);
        }

        res.status(200).send('OK');

    } catch (error) {
        logger.error('Error processing Twilio webhook:', error);
        res.status(500).send('Error processing webhook');
    }
});

module.exports = router;
/**
 * Crisis Management Routes
 * API endpoints for crisis detection, reporting, and response
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const config = require('../config/config');
const { getDatabaseConnection } = require('../database/connection');

const router = express.Router();

// Rate limiting for crisis endpoints - higher limits for emergency situations
const crisisLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute for crisis endpoints
    message: {
        error: 'Too many crisis requests. Please wait a moment.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for emergency override
        return req.headers['x-emergency-override'] === config.emergency.overrideKey;
    }
});

router.use(crisisLimiter);

/**
 * Report a crisis event
 */
router.post('/alert', [
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('severity').isInt({ min: 1, max: 10 }).withMessage('Severity must be between 1 and 10'),
    body('type').isIn(['voice', 'text', 'behavioral', 'biometric', 'location', 'manual']).withMessage('Invalid crisis type'),
    body('confidence').optional().isFloat({ min: 0, max: 1 }).withMessage('Confidence must be between 0 and 1'),
    body('location').optional().isObject().withMessage('Location must be an object'),
    body('location.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('location.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('message').optional().isString().isLength({ max: 1000 }).withMessage('Message too long'),
    body('indicators').optional().isArray().withMessage('Indicators must be an array'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
], async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Crisis alert validation failed', {
                errors: errors.array(),
                body: req.body
            });
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array(),
                timestamp: new Date().toISOString()
            });
        }

        const {
            userId,
            severity,
            type,
            confidence = 0.8,
            location = null,
            message = '',
            indicators = [],
            metadata = {}
        } = req.body;

        // Log the crisis alert
        logger.crisis('Crisis alert received via API', severity, {
            userId,
            type,
            confidence,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Import crisis detection engine dynamically to avoid circular dependencies
        const CrisisDetectionEngine = require('../detection/engine');
        const detectionEngine = new CrisisDetectionEngine();
        
        // Process the crisis
        const crisisData = {
            userId,
            type,
            data: {
                [type]: {
                    severity,
                    confidence,
                    message,
                    indicators,
                    location
                }
            },
            metadata: {
                ...metadata,
                source: 'api',
                ip: req.ip,
                userAgent: req.get('user-agent'),
                timestamp: new Date().toISOString()
            }
        };

        // Trigger crisis detection and response
        const detectionResult = await detectionEngine.detectCrisis(crisisData);
        
        const responseTime = Date.now() - startTime;
        
        // Log performance
        logger.performance('Crisis alert processing', responseTime, {
            userId,
            severity: detectionResult.severity,
            confidence: detectionResult.confidence
        });

        // Ensure sub-500ms response time for critical alerts
        if (responseTime > 500 && severity >= 8) {
            logger.warn('Crisis response time exceeded 500ms for critical alert', {
                responseTime,
                severity,
                userId
            });
        }

        res.status(202).json({
            success: true,
            crisisId: detectionResult.crisisId || `crisis-${Date.now()}`,
            severity: detectionResult.severity,
            confidence: detectionResult.confidence,
            responseTime,
            escalationTriggered: detectionResult.severity >= 7,
            emergencyResponse: detectionResult.severity >= 8,
            message: severity >= 8 ? 
                'Crisis alert received. Emergency response initiated.' :
                'Crisis alert received and being processed.',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;
        logger.error('Error processing crisis alert:', error);
        
        res.status(500).json({
            success: false,
            error: 'Failed to process crisis alert',
            responseTime,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
        });
    }
});

/**
 * Get crisis events for a user
 */
router.get('/events/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    query('severity').optional().isInt({ min: 1, max: 10 }).withMessage('Invalid severity level'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
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
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate = new Date().toISOString(),
            severity = null,
            limit = 50,
            offset = 0
        } = req.query;

        const db = getDatabaseConnection();
        
        let query = `
            SELECT ce.id, ce.severity, ce.confidence, ce.type, ce.status,
                   ce.location_lat, ce.location_lng, ce.detected_at, ce.resolved_at,
                   ce.metadata,
                   COUNT(ci.id) as indicator_count,
                   COUNT(cr.id) as response_count
            FROM crisis_events ce
            LEFT JOIN crisis_indicators ci ON ce.id = ci.crisis_event_id
            LEFT JOIN crisis_responses cr ON ce.id = cr.crisis_event_id
            WHERE ce.user_id = $1
              AND ce.detected_at >= $2
              AND ce.detected_at <= $3
        `;
        
        const params = [userId, startDate, endDate];
        let paramIndex = 4;

        if (severity) {
            query += ` AND ce.severity >= $${paramIndex}`;
            params.push(severity);
            paramIndex++;
        }

        query += `
            GROUP BY ce.id
            ORDER BY ce.detected_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM crisis_events ce
            WHERE ce.user_id = $1
              AND ce.detected_at >= $2
              AND ce.detected_at <= $3
        `;
        
        const countParams = [userId, startDate, endDate];
        if (severity) {
            countQuery += ` AND ce.severity >= $4`;
            countParams.push(severity);
        }

        const countResult = await db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].total);

        const events = result.rows.map(row => ({
            id: row.id,
            severity: row.severity,
            confidence: parseFloat(row.confidence),
            type: row.type,
            status: row.status,
            location: row.location_lat && row.location_lng ? {
                latitude: parseFloat(row.location_lat),
                longitude: parseFloat(row.location_lng)
            } : null,
            detectedAt: row.detected_at,
            resolvedAt: row.resolved_at,
            indicatorCount: parseInt(row.indicator_count),
            responseCount: parseInt(row.response_count),
            metadata: row.metadata
        }));

        res.json({
            success: true,
            events,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
            },
            filters: {
                userId,
                startDate,
                endDate,
                severity
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching crisis events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch crisis events',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get crisis event details
 */
router.get('/events/:userId/:crisisId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
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

        const { userId, crisisId } = req.params;
        const db = getDatabaseConnection();

        // Get crisis event
        const crisisResult = await db.query(`
            SELECT ce.*, 
                   COUNT(DISTINCT ci.id) as indicator_count,
                   COUNT(DISTINCT cr.id) as response_count,
                   COUNT(DISTINCT ee.id) as escalation_count
            FROM crisis_events ce
            LEFT JOIN crisis_indicators ci ON ce.id = ci.crisis_event_id
            LEFT JOIN crisis_responses cr ON ce.id = cr.crisis_event_id
            LEFT JOIN emergency_escalations ee ON ce.id = ee.crisis_event_id
            WHERE ce.id = $1 AND ce.user_id = $2
            GROUP BY ce.id
        `, [crisisId, userId]);

        if (crisisResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crisis event not found',
                timestamp: new Date().toISOString()
            });
        }

        const crisis = crisisResult.rows[0];

        // Get indicators
        const indicatorsResult = await db.query(`
            SELECT type, category, severity, confidence, data, created_at
            FROM crisis_indicators
            WHERE crisis_event_id = $1
            ORDER BY created_at ASC
        `, [crisisId]);

        // Get responses
        const responsesResult = await db.query(`
            SELECT response_type, responder_type, responder_id, status,
                   response_time_ms, details, created_at, updated_at
            FROM crisis_responses
            WHERE crisis_event_id = $1
            ORDER BY created_at ASC
        `, [crisisId]);

        // Get escalations
        const escalationsResult = await db.query(`
            SELECT ee.escalation_level, ee.notification_type, ee.status,
                   ee.attempts, ee.scheduled_for, ee.sent_at, ee.acknowledged_at,
                   ec.name as contact_name, ec.relationship, ec.contact_type
            FROM emergency_escalations ee
            LEFT JOIN emergency_contacts ec ON ee.contact_id = ec.id
            WHERE ee.crisis_event_id = $1
            ORDER BY ee.escalation_level, ee.created_at
        `, [crisisId]);

        const crisisDetails = {
            id: crisis.id,
            userId: crisis.user_id,
            severity: crisis.severity,
            confidence: parseFloat(crisis.confidence),
            type: crisis.type,
            status: crisis.status,
            location: crisis.location_lat && crisis.location_lng ? {
                latitude: parseFloat(crisis.location_lat),
                longitude: parseFloat(crisis.location_lng),
                accuracy: crisis.location_accuracy
            } : null,
            detectedAt: crisis.detected_at,
            resolvedAt: crisis.resolved_at,
            metadata: crisis.metadata,
            indicators: indicatorsResult.rows.map(indicator => ({
                type: indicator.type,
                category: indicator.category,
                severity: indicator.severity,
                confidence: indicator.confidence ? parseFloat(indicator.confidence) : null,
                data: indicator.data,
                timestamp: indicator.created_at
            })),
            responses: responsesResult.rows.map(response => ({
                type: response.response_type,
                responderType: response.responder_type,
                responderId: response.responder_id,
                status: response.status,
                responseTime: response.response_time_ms,
                details: response.details,
                initiated: response.created_at,
                lastUpdated: response.updated_at
            })),
            escalations: escalationsResult.rows.map(escalation => ({
                level: escalation.escalation_level,
                notificationType: escalation.notification_type,
                status: escalation.status,
                attempts: escalation.attempts,
                scheduledFor: escalation.scheduled_for,
                sentAt: escalation.sent_at,
                acknowledgedAt: escalation.acknowledged_at,
                contact: escalation.contact_name ? {
                    name: escalation.contact_name,
                    relationship: escalation.relationship,
                    type: escalation.contact_type
                } : null
            })),
            summary: {
                indicatorCount: parseInt(crisis.indicator_count),
                responseCount: parseInt(crisis.response_count),
                escalationCount: parseInt(crisis.escalation_count),
                duration: crisis.resolved_at ? 
                    new Date(crisis.resolved_at) - new Date(crisis.detected_at) : 
                    Date.now() - new Date(crisis.detected_at)
            }
        };

        res.json({
            success: true,
            crisis: crisisDetails,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching crisis event details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch crisis event details',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Update crisis event status
 */
router.patch('/events/:userId/:crisisId/status', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    param('crisisId').isUUID().withMessage('Valid crisis ID required'),
    body('status').isIn(['active', 'resolved', 'false_alarm']).withMessage('Invalid status'),
    body('resolution_notes').optional().isString().isLength({ max: 1000 }).withMessage('Resolution notes too long'),
    body('resolved_by').optional().isString().isLength({ max: 255 }).withMessage('Resolved by field too long')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { userId, crisisId } = req.params;
        const { status, resolution_notes = '', resolved_by = 'system' } = req.body;

        const db = getDatabaseConnection();

        // Update crisis status
        const updateFields = ['status = $3', 'updated_at = NOW()'];
        const params = [crisisId, userId, status];
        const paramIndex = 4;

        if (status === 'resolved') {
            updateFields.push(`resolved_at = NOW()`);
        }

        const query = `
            UPDATE crisis_events 
            SET ${updateFields.join(', ')}
            WHERE id = $1 AND user_id = $2
            RETURNING id, status, resolved_at
        `;

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Crisis event not found',
                timestamp: new Date().toISOString()
            });
        }

        const updatedCrisis = result.rows[0];

        // Log the status update
        logger.audit('crisis_status_updated', userId, {
            crisisId,
            newStatus: status,
            resolvedBy: resolved_by,
            notes: resolution_notes,
            ip: req.ip
        });

        res.json({
            success: true,
            crisisId: updatedCrisis.id,
            status: updatedCrisis.status,
            resolvedAt: updatedCrisis.resolved_at,
            message: `Crisis status updated to ${status}`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error updating crisis status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update crisis status',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get crisis statistics for a user
 */
router.get('/stats/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period'),
    query('includeResolved').optional().isBoolean().withMessage('includeResolved must be boolean')
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
        const { period = '30d', includeResolved = true } = req.query;

        // Calculate date range
        const periodDays = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        };

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays[period]);

        const db = getDatabaseConnection();

        // Get crisis statistics
        let query = `
            SELECT 
                COUNT(*) as total_crises,
                AVG(severity) as avg_severity,
                MAX(severity) as max_severity,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_crises,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_crises,
                COUNT(CASE WHEN severity >= 8 THEN 1 END) as critical_crises,
                COUNT(CASE WHEN severity >= 6 AND severity < 8 THEN 1 END) as high_crises,
                COUNT(CASE WHEN severity >= 4 AND severity < 6 THEN 1 END) as medium_crises,
                COUNT(CASE WHEN severity < 4 THEN 1 END) as low_crises
            FROM crisis_events
            WHERE user_id = $1 AND detected_at >= $2
        `;

        const params = [userId, startDate];

        if (!includeResolved) {
            query += ` AND status != 'resolved'`;
        }

        const statsResult = await db.query(query, params);

        // Get crisis type breakdown
        const typeQuery = `
            SELECT type, COUNT(*) as count
            FROM crisis_events
            WHERE user_id = $1 AND detected_at >= $2
            GROUP BY type
            ORDER BY count DESC
        `;

        const typeResult = await db.query(typeQuery, [userId, startDate]);

        // Get monthly trend (for longer periods)
        const trendQuery = `
            SELECT 
                DATE_TRUNC('day', detected_at) as date,
                COUNT(*) as crisis_count,
                AVG(severity) as avg_severity
            FROM crisis_events
            WHERE user_id = $1 AND detected_at >= $2
            GROUP BY DATE_TRUNC('day', detected_at)
            ORDER BY date ASC
        `;

        const trendResult = await db.query(trendQuery, [userId, startDate]);

        const stats = statsResult.rows[0];

        res.json({
            success: true,
            userId,
            period,
            dateRange: {
                start: startDate.toISOString(),
                end: new Date().toISOString()
            },
            statistics: {
                total: parseInt(stats.total_crises) || 0,
                averageSeverity: stats.avg_severity ? parseFloat(stats.avg_severity) : 0,
                maxSeverity: parseInt(stats.max_severity) || 0,
                byStatus: {
                    active: parseInt(stats.active_crises) || 0,
                    resolved: parseInt(stats.resolved_crises) || 0
                },
                bySeverity: {
                    critical: parseInt(stats.critical_crises) || 0,
                    high: parseInt(stats.high_crises) || 0,
                    medium: parseInt(stats.medium_crises) || 0,
                    low: parseInt(stats.low_crises) || 0
                },
                byType: typeResult.rows.map(row => ({
                    type: row.type,
                    count: parseInt(row.count)
                })),
                trend: trendResult.rows.map(row => ({
                    date: row.date.toISOString().split('T')[0],
                    count: parseInt(row.crisis_count),
                    avgSeverity: parseFloat(row.avg_severity)
                }))
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching crisis statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch crisis statistics',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Test crisis detection (development/testing only)
 */
if (config.environment === 'development' || config.environment === 'test') {
    router.post('/test', [
        body('userId').isUUID().withMessage('Valid user ID required'),
        body('severity').optional().isInt({ min: 1, max: 10 }).withMessage('Invalid severity'),
        body('type').optional().isString().withMessage('Type must be string'),
        body('mockResponse').optional().isBoolean().withMessage('mockResponse must be boolean')
    ], async (req, res) => {
        try {
            const { userId, severity = 5, type = 'test', mockResponse = true } = req.body;

            logger.info(`Test crisis triggered`, {
                userId,
                severity,
                type,
                environment: config.environment
            });

            const testCrisisData = {
                crisisId: `test-${Date.now()}`,
                userId,
                severity,
                type,
                confidence: 0.8,
                timestamp: new Date().toISOString(),
                source: 'test_endpoint',
                mockResponse
            };

            if (mockResponse) {
                // Return mock response without triggering actual crisis response
                res.json({
                    success: true,
                    message: 'Test crisis created (mock mode)',
                    crisis: testCrisisData,
                    note: 'This is a test crisis and did not trigger real emergency response'
                });
            } else {
                // Actually trigger crisis detection (be careful with this!)
                const CrisisDetectionEngine = require('../detection/engine');
                const detectionEngine = new CrisisDetectionEngine();
                
                const result = await detectionEngine.detectCrisis({
                    userId,
                    type,
                    data: { [type]: { severity, confidence: 0.8 } },
                    metadata: { source: 'test_endpoint' }
                });

                res.json({
                    success: true,
                    message: 'Test crisis processed',
                    result,
                    warning: 'This triggered actual crisis response systems'
                });
            }

        } catch (error) {
            logger.error('Error in test crisis endpoint:', error);
            res.status(500).json({
                success: false,
                error: 'Test crisis failed',
                timestamp: new Date().toISOString()
            });
        }
    });
}

module.exports = router;
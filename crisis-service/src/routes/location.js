/**
 * Location Tracking Routes
 * API endpoints for GPS tracking, geofencing, and emergency services
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { getDatabaseConnection } = require('../database/connection');

const router = express.Router();

/**
 * Update user location
 */
router.post('/update/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('accuracy').optional().isInt({ min: 0 }).withMessage('Accuracy must be non-negative'),
    body('altitude').optional().isFloat().withMessage('Altitude must be a number'),
    body('speed').optional().isFloat({ min: 0 }).withMessage('Speed must be non-negative'),
    body('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Heading must be between 0 and 360'),
    body('source').optional().isIn(['gps', 'network', 'passive', 'manual']).withMessage('Invalid location source'),
    body('isCrisisLocation').optional().isBoolean().withMessage('isCrisisLocation must be boolean')
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
            latitude,
            longitude,
            accuracy = null,
            altitude = null,
            speed = null,
            heading = null,
            source = 'manual',
            isCrisisLocation = false
        } = req.body;

        // Import location tracker
        const LocationTracker = require('../location/tracker');
        const locationTracker = new LocationTracker();
        await locationTracker.initialize();

        // Update location
        const result = await locationTracker.updateLocation(userId, {
            latitude,
            longitude,
            accuracy,
            altitude,
            speed,
            heading
        }, {
            source,
            isCrisisLocation,
            ip: req.ip
        });

        if (result.success) {
            res.json({
                success: true,
                locationId: result.locationId,
                timestamp: new Date().toISOString(),
                responseTime: result.responseTime,
                geofenceChecked: true,
                message: 'Location updated successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        logger.error('Error updating location:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update location',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get user's current location
 */
router.get('/current/:userId', [
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
            SELECT id, latitude, longitude, accuracy, altitude, speed, heading,
                   is_crisis_location, location_source, created_at
            FROM user_locations
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No location data found',
                timestamp: new Date().toISOString()
            });
        }

        const location = result.rows[0];

        res.json({
            success: true,
            location: {
                id: location.id,
                latitude: parseFloat(location.latitude),
                longitude: parseFloat(location.longitude),
                accuracy: location.accuracy,
                altitude: location.altitude,
                speed: location.speed,
                heading: location.heading,
                isCrisisLocation: location.is_crisis_location,
                source: location.location_source,
                timestamp: location.created_at
            }
        });

    } catch (error) {
        logger.error('Error fetching current location:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch current location',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get location history
 */
router.get('/history/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    query('crisisOnly').optional().isBoolean().withMessage('crisisOnly must be boolean')
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
            startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endDate = new Date().toISOString(),
            limit = 100,
            crisisOnly = false
        } = req.query;

        // Import location tracker
        const LocationTracker = require('../location/tracker');
        const locationTracker = new LocationTracker();
        await locationTracker.initialize();

        const history = await locationTracker.getLocationHistory(userId, {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            limit: parseInt(limit),
            includeCrisisOnly: crisisOnly
        });

        res.json({
            success: true,
            ...history,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching location history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch location history',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Share location with emergency contacts
 */
router.post('/share/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('crisisId').optional().isUUID().withMessage('Invalid crisis ID'),
    body('message').optional().isString().isLength({ max: 500 }).withMessage('Message too long'),
    body('includeNearbyServices').optional().isBoolean().withMessage('includeNearbyServices must be boolean')
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
        const { crisisId = null, message = '', includeNearbyServices = true } = req.body;

        // Import location tracker
        const LocationTracker = require('../location/tracker');
        const locationTracker = new LocationTracker();
        await locationTracker.initialize();

        const result = await locationTracker.shareLocationWithContacts(userId, crisisId);

        if (result.success) {
            logger.info(`Location shared for user ${userId}`, {
                crisisId,
                contactsNotified: result.contactsNotified
            });

            res.json({
                success: true,
                locationShare: result.locationShare,
                contactsNotified: result.contactsNotified,
                message: `Location shared with ${result.contactsNotified} emergency contacts`,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        logger.error('Error sharing location:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to share location',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get safety zones (geofences) for user
 */
router.get('/safety-zones/:userId', [
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
            SELECT id, name, center_lat, center_lng, radius_meters,
                   zone_type, entry_alert, exit_alert, is_active,
                   created_at, updated_at
            FROM safety_zones
            WHERE user_id = $1 AND is_active = true
            ORDER BY created_at ASC
        `, [userId]);

        const safetyZones = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            center: {
                latitude: parseFloat(row.center_lat),
                longitude: parseFloat(row.center_lng)
            },
            radiusMeters: row.radius_meters,
            type: row.zone_type,
            alerts: {
                entry: row.entry_alert,
                exit: row.exit_alert
            },
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json({
            success: true,
            safetyZones,
            totalCount: safetyZones.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching safety zones:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch safety zones',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Create safety zone (geofence)
 */
router.post('/safety-zones/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('name').isString().isLength({ min: 1, max: 255 }).withMessage('Name required and must be under 255 characters'),
    body('center').isObject().withMessage('Center coordinates required'),
    body('center.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid center latitude'),
    body('center.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid center longitude'),
    body('radiusMeters').optional().isInt({ min: 10, max: 50000 }).withMessage('Radius must be between 10 and 50000 meters'),
    body('type').isIn(['safe', 'trigger', 'restricted']).withMessage('Invalid zone type'),
    body('entryAlert').optional().isBoolean().withMessage('entryAlert must be boolean'),
    body('exitAlert').optional().isBoolean().withMessage('exitAlert must be boolean')
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
            name,
            center,
            radiusMeters = 500,
            type,
            entryAlert = false,
            exitAlert = true
        } = req.body;

        // Import location tracker
        const LocationTracker = require('../location/tracker');
        const locationTracker = new LocationTracker();
        await locationTracker.initialize();

        const result = await locationTracker.createSafetyZone(userId, {
            name,
            center,
            radius: radiusMeters,
            type,
            entryAlert,
            exitAlert
        });

        if (result.success) {
            logger.audit('safety_zone_created', userId, {
                zoneId: result.zoneId,
                zoneName: name,
                zoneType: type,
                center,
                radius: radiusMeters,
                ip: req.ip
            });

            res.status(201).json({
                success: true,
                safetyZone: result.zone,
                message: 'Safety zone created successfully',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        logger.error('Error creating safety zone:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create safety zone',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Update safety zone
 */
router.put('/safety-zones/:userId/:zoneId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    param('zoneId').isUUID().withMessage('Valid zone ID required'),
    body('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Name must be under 255 characters'),
    body('radiusMeters').optional().isInt({ min: 10, max: 50000 }).withMessage('Radius must be between 10 and 50000 meters'),
    body('entryAlert').optional().isBoolean().withMessage('entryAlert must be boolean'),
    body('exitAlert').optional().isBoolean().withMessage('exitAlert must be boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { userId, zoneId } = req.params;
        const updateData = req.body;

        const db = getDatabaseConnection();

        // Build dynamic update query
        const updateFields = [];
        const params = [zoneId, userId];
        let paramIndex = 3;

        const columnMap = {
            name: 'name',
            radiusMeters: 'radius_meters',
            entryAlert: 'entry_alert',
            exitAlert: 'exit_alert',
            isActive: 'is_active'
        };

        for (const [key, value] of Object.entries(updateData)) {
            if (columnMap[key]) {
                updateFields.push(`${columnMap[key]} = $${paramIndex}`);
                params.push(value);
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
            UPDATE safety_zones 
            SET ${updateFields.join(', ')}
            WHERE id = $1 AND user_id = $2
            RETURNING id, name, zone_type
        `;

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Safety zone not found',
                timestamp: new Date().toISOString()
            });
        }

        logger.audit('safety_zone_updated', userId, {
            zoneId,
            zoneName: result.rows[0].name,
            zoneType: result.rows[0].zone_type,
            updatedFields: Object.keys(updateData),
            ip: req.ip
        });

        res.json({
            success: true,
            zoneId,
            message: 'Safety zone updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error updating safety zone:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update safety zone',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Delete safety zone
 */
router.delete('/safety-zones/:userId/:zoneId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    param('zoneId').isUUID().withMessage('Valid zone ID required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { userId, zoneId } = req.params;
        const db = getDatabaseConnection();

        const result = await db.query(`
            UPDATE safety_zones 
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING name, zone_type
        `, [zoneId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Safety zone not found',
                timestamp: new Date().toISOString()
            });
        }

        logger.audit('safety_zone_deleted', userId, {
            zoneId,
            zoneName: result.rows[0].name,
            zoneType: result.rows[0].zone_type,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Safety zone deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error deleting safety zone:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete safety zone',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get location events (geofence triggers)
 */
router.get('/events/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('eventType').optional().isIn(['entered', 'exited']).withMessage('Invalid event type'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
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
            startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            endDate = new Date().toISOString(),
            eventType = null,
            limit = 50
        } = req.query;

        const db = getDatabaseConnection();

        let query = `
            SELECT le.id, le.event_type, le.latitude, le.longitude, le.created_at,
                   sz.name as zone_name, sz.zone_type, sz.radius_meters
            FROM location_events le
            JOIN safety_zones sz ON le.safety_zone_id = sz.id
            WHERE le.user_id = $1 
              AND le.created_at >= $2 
              AND le.created_at <= $3
        `;

        const params = [userId, startDate, endDate];
        let paramIndex = 4;

        if (eventType) {
            query += ` AND le.event_type = $${paramIndex}`;
            params.push(eventType);
            paramIndex++;
        }

        query += ` ORDER BY le.created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await db.query(query, params);

        const events = result.rows.map(row => ({
            id: row.id,
            eventType: row.event_type,
            location: {
                latitude: parseFloat(row.latitude),
                longitude: parseFloat(row.longitude)
            },
            zone: {
                name: row.zone_name,
                type: row.zone_type,
                radiusMeters: row.radius_meters
            },
            timestamp: row.created_at
        }));

        res.json({
            success: true,
            events,
            totalCount: events.length,
            filters: {
                startDate,
                endDate,
                eventType,
                limit
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching location events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch location events',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Find nearby emergency services
 */
router.get('/emergency-services/nearby', [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    query('radius').optional().isInt({ min: 1000, max: 100000 }).withMessage('Radius must be between 1000 and 100000 meters'),
    query('serviceType').optional().isIn(['hospital', 'police', 'fire', 'crisis_center']).withMessage('Invalid service type'),
    query('only24_7').optional().isBoolean().withMessage('only24_7 must be boolean'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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
            latitude,
            longitude,
            radius = 25000, // 25km default
            serviceType = null,
            only24_7 = false,
            limit = 10
        } = req.query;

        // Import location tracker
        const LocationTracker = require('../location/tracker');
        const locationTracker = new LocationTracker();
        await locationTracker.initialize();

        const result = await locationTracker.findNearestEmergencyServices(
            { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
            {
                serviceType,
                radius: parseInt(radius),
                only24_7: only24_7 === 'true',
                limit: parseInt(limit)
            }
        );

        res.json({
            success: true,
            ...result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error finding emergency services:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to find emergency services',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Start location tracking for user
 */
router.post('/tracking/start/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('frequency').optional().isInt({ min: 10000, max: 300000 }).withMessage('Frequency must be between 10 and 300 seconds'),
    body('accuracy').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid accuracy setting'),
    body('emergencyMode').optional().isBoolean().withMessage('emergencyMode must be boolean')
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
            frequency = 30000, // 30 seconds
            accuracy = 'high',
            emergencyMode = false
        } = req.body;

        // Import location tracker
        const LocationTracker = require('../location/tracker');
        const locationTracker = new LocationTracker();
        await locationTracker.initialize();

        const success = await locationTracker.startTracking(userId, {
            frequency,
            accuracy,
            emergencyMode
        });

        if (success) {
            logger.info(`Location tracking started for user ${userId}`, {
                frequency,
                accuracy,
                emergencyMode
            });

            res.json({
                success: true,
                message: 'Location tracking started successfully',
                config: {
                    frequency,
                    accuracy,
                    emergencyMode
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to start location tracking',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        logger.error('Error starting location tracking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start location tracking',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Stop location tracking for user
 */
router.post('/tracking/stop/:userId', [
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

        // Import location tracker
        const LocationTracker = require('../location/tracker');
        const locationTracker = new LocationTracker();
        await locationTracker.initialize();

        const success = await locationTracker.stopTracking(userId);

        if (success) {
            logger.info(`Location tracking stopped for user ${userId}`);

            res.json({
                success: true,
                message: 'Location tracking stopped successfully',
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to stop location tracking or tracking was not active',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        logger.error('Error stopping location tracking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop location tracking',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
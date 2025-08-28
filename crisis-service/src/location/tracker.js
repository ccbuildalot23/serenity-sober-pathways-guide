/**
 * GPS and Location Tracking System
 * Real-time location tracking, geofencing, and emergency service locator
 */

const EventEmitter = require('events');
const geolib = require('geolib');
const logger = require('../utils/logger');
const config = require('../config/config');
const { getDatabaseConnection } = require('../database/connection');
const { getRedisManager } = require('../cache/redis');

class LocationTracker extends EventEmitter {
    constructor() {
        super();
        this.db = null;
        this.redis = null;
        this.activeTracking = new Map(); // userId -> tracking config
        this.geofences = new Map(); // userId -> geofence array
        this.emergencyServices = new Map(); // cached emergency services by region
        
        // Google Maps API integration
        this.googleMapsApiKey = config.location.googleMapsApiKey;
        this.defaultGeofenceRadius = config.location.geofenceRadius;
        
        // Performance tracking
        this.locationUpdates = 0;
        this.geofenceChecks = 0;
        this.emergencyServiceQueries = 0;
    }

    async initialize() {
        try {
            logger.info('Initializing Location Tracker...');
            
            this.db = getDatabaseConnection();
            this.redis = getRedisManager();
            
            // Load existing safety zones from database
            await this.loadSafetyZones();
            
            // Load emergency services
            await this.loadEmergencyServices();
            
            // Start background processing
            this.startBackgroundProcessing();
            
            logger.info('Location Tracker initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Location Tracker:', error);
            throw error;
        }
    }

    async loadSafetyZones() {
        try {
            const result = await this.db.query(`
                SELECT user_id, id, name, center_lat, center_lng, radius_meters, 
                       zone_type, entry_alert, exit_alert
                FROM safety_zones 
                WHERE is_active = true
            `);

            for (const zone of result.rows) {
                const userId = zone.user_id;
                
                if (!this.geofences.has(userId)) {
                    this.geofences.set(userId, []);
                }
                
                this.geofences.get(userId).push({
                    id: zone.id,
                    name: zone.name,
                    center: {
                        latitude: parseFloat(zone.center_lat),
                        longitude: parseFloat(zone.center_lng)
                    },
                    radius: zone.radius_meters,
                    type: zone.zone_type,
                    entryAlert: zone.entry_alert,
                    exitAlert: zone.exit_alert
                });
            }

            logger.info(`Loaded safety zones for ${this.geofences.size} users`);
        } catch (error) {
            logger.error('Error loading safety zones:', error);
        }
    }

    async loadEmergencyServices() {
        try {
            const result = await this.db.query(`
                SELECT id, name, service_type, address, phone, 
                       latitude, longitude, is_24_7, specialties
                FROM emergency_services
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            `);

            // Group services by geographic regions for faster queries
            for (const service of result.rows) {
                const regionKey = this.getRegionKey(service.latitude, service.longitude);
                
                if (!this.emergencyServices.has(regionKey)) {
                    this.emergencyServices.set(regionKey, []);
                }
                
                this.emergencyServices.get(regionKey).push({
                    id: service.id,
                    name: service.name,
                    type: service.service_type,
                    address: service.address,
                    phone: service.phone,
                    location: {
                        latitude: parseFloat(service.latitude),
                        longitude: parseFloat(service.longitude)
                    },
                    is24_7: service.is_24_7,
                    specialties: service.specialties || []
                });
            }

            logger.info(`Loaded ${result.rows.length} emergency services across ${this.emergencyServices.size} regions`);
        } catch (error) {
            logger.error('Error loading emergency services:', error);
        }
    }

    getRegionKey(lat, lng) {
        // Create region keys based on 0.1 degree grid (roughly 11km squares)
        const latGrid = Math.floor(lat * 10) / 10;
        const lngGrid = Math.floor(lng * 10) / 10;
        return `${latGrid},${lngGrid}`;
    }

    startBackgroundProcessing() {
        // Clean up old location data
        setInterval(() => {
            this.cleanupOldLocations();
        }, 60 * 60 * 1000); // Every hour

        // Update performance metrics
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 5 * 60 * 1000); // Every 5 minutes

        logger.info('Location tracker background processing started');
    }

    /**
     * Start tracking a user's location
     */
    async startTracking(userId, options = {}) {
        try {
            const trackingConfig = {
                userId,
                frequency: options.frequency || 30000, // 30 seconds default
                accuracy: options.accuracy || 'high', // 'high', 'medium', 'low'
                geofenceEnabled: options.geofenceEnabled !== false, // default true
                emergencyMode: options.emergencyMode || false,
                backgroundMode: options.backgroundMode || false,
                startedAt: new Date()
            };

            this.activeTracking.set(userId, trackingConfig);

            // Cache tracking status in Redis
            await this.redis.cacheUserBaseline(userId, {
                locationTracking: true,
                trackingConfig: JSON.stringify(trackingConfig)
            });

            logger.info(`Started location tracking for user ${userId}`, trackingConfig);

            this.emit('tracking-started', { userId, config: trackingConfig });
            return true;
        } catch (error) {
            logger.error(`Error starting location tracking for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Stop tracking a user's location
     */
    async stopTracking(userId) {
        try {
            if (this.activeTracking.has(userId)) {
                this.activeTracking.delete(userId);

                // Update Redis cache
                const baseline = await this.redis.getUserBaseline(userId);
                if (baseline) {
                    baseline.locationTracking = false;
                    await this.redis.cacheUserBaseline(userId, baseline);
                }

                logger.info(`Stopped location tracking for user ${userId}`);
                this.emit('tracking-stopped', { userId });
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`Error stopping location tracking for user ${userId}:`, error);
            return false;
        }
    }

    /**
     * Update user location
     */
    async updateLocation(userId, locationData, metadata = {}) {
        const startTime = Date.now();
        
        try {
            const {
                latitude,
                longitude,
                accuracy = null,
                altitude = null,
                speed = null,
                heading = null,
                timestamp = new Date()
            } = locationData;

            // Validate coordinates
            if (!this.isValidCoordinate(latitude, longitude)) {
                throw new Error('Invalid coordinates provided');
            }

            // Store in database
            const result = await this.db.query(`
                INSERT INTO user_locations (
                    user_id, latitude, longitude, accuracy, altitude, 
                    speed, heading, is_crisis_location, location_source, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `, [
                userId, latitude, longitude, accuracy, altitude,
                speed, heading, metadata.isCrisisLocation || false,
                metadata.source || 'gps', timestamp
            ]);

            const locationId = result.rows[0].id;

            // Cache current location in Redis
            await this.redis.cacheUserLocation(userId, {
                latitude,
                longitude,
                accuracy,
                altitude,
                speed,
                heading,
                timestamp: timestamp.toISOString(),
                locationId
            });

            // Publish real-time location update
            await this.redis.publishLocationUpdate(userId, {
                latitude,
                longitude,
                accuracy,
                timestamp: timestamp.toISOString(),
                source: metadata.source || 'gps'
            });

            // Check geofences if enabled
            const trackingConfig = this.activeTracking.get(userId);
            if (trackingConfig?.geofenceEnabled) {
                await this.checkGeofences(userId, { latitude, longitude });
            }

            // Update performance metrics
            this.locationUpdates++;
            const responseTime = Date.now() - startTime;
            
            logger.performance('Location update', responseTime, {
                userId,
                accuracy,
                source: metadata.source
            });

            this.emit('location-updated', {
                userId,
                location: { latitude, longitude, accuracy },
                locationId,
                responseTime
            });

            return {
                success: true,
                locationId,
                responseTime
            };

        } catch (error) {
            logger.error(`Error updating location for user ${userId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check geofences for location events
     */
    async checkGeofences(userId, location) {
        try {
            const userGeofences = this.geofences.get(userId) || [];
            
            if (userGeofences.length === 0) return;

            const currentLocation = {
                latitude: location.latitude,
                longitude: location.longitude
            };

            // Get user's last location from Redis to determine entry/exit
            const lastLocation = await this.getLastKnownLocation(userId);
            
            for (const geofence of userGeofences) {
                const distanceFromCenter = geolib.getDistance(currentLocation, geofence.center);
                const isInside = distanceFromCenter <= geofence.radius;
                
                // Check if user was previously inside/outside
                let wasInside = false;
                if (lastLocation) {
                    const lastDistance = geolib.getDistance(
                        { latitude: lastLocation.latitude, longitude: lastLocation.longitude },
                        geofence.center
                    );
                    wasInside = lastDistance <= geofence.radius;
                }

                let eventType = null;
                let shouldAlert = false;

                // Determine event type
                if (isInside && !wasInside) {
                    eventType = 'entered';
                    shouldAlert = geofence.entryAlert;
                } else if (!isInside && wasInside) {
                    eventType = 'exited';
                    shouldAlert = geofence.exitAlert;
                }

                if (eventType) {
                    // Record location event
                    await this.db.query(`
                        INSERT INTO location_events (user_id, safety_zone_id, event_type, latitude, longitude)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [userId, geofence.id, eventType, location.latitude, location.longitude]);

                    logger.info(`Geofence event: User ${userId} ${eventType} ${geofence.name}`, {
                        userId,
                        geofenceId: geofence.id,
                        geofenceName: geofence.name,
                        eventType,
                        distance: distanceFromCenter
                    });

                    // Emit event
                    this.emit('geofence-event', {
                        userId,
                        geofence,
                        eventType,
                        location,
                        distance: distanceFromCenter,
                        shouldAlert
                    });

                    // Trigger alert if configured
                    if (shouldAlert) {
                        await this.handleGeofenceAlert(userId, geofence, eventType, location);
                    }
                }
            }

            this.geofenceChecks++;

        } catch (error) {
            logger.error(`Error checking geofences for user ${userId}:`, error);
        }
    }

    async handleGeofenceAlert(userId, geofence, eventType, location) {
        try {
            // Determine severity based on zone type and event
            let severity = 3; // default
            
            if (geofence.type === 'trigger' && eventType === 'entered') {
                severity = 7; // High severity for entering trigger zones
            } else if (geofence.type === 'safe' && eventType === 'exited') {
                severity = 6; // Medium-high severity for leaving safe zones
            } else if (geofence.type === 'restricted' && eventType === 'entered') {
                severity = 8; // Very high severity for entering restricted zones
            }

            // Create location-based crisis event
            const crisisData = {
                userId,
                type: 'location',
                severity,
                confidence: 0.9, // High confidence for location events
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude
                },
                metadata: {
                    geofenceId: geofence.id,
                    geofenceName: geofence.name,
                    geofenceType: geofence.type,
                    eventType,
                    triggeredAt: new Date().toISOString()
                }
            };

            // Publish crisis alert
            await this.redis.publishCrisisAlert(userId, crisisData);

            logger.crisis('Geofence crisis alert triggered', severity, {
                userId,
                geofenceName: geofence.name,
                eventType,
                location
            });

        } catch (error) {
            logger.error('Error handling geofence alert:', error);
        }
    }

    /**
     * Find nearest emergency services
     */
    async findNearestEmergencyServices(location, options = {}) {
        try {
            const {
                serviceType = null, // 'hospital', 'police', 'fire', 'crisis_center'
                radius = 50000, // 50km default
                limit = 10,
                only24_7 = false
            } = options;

            const currentLocation = {
                latitude: location.latitude,
                longitude: location.longitude
            };

            // Search in current and adjacent regions
            const searchRegions = this.getSearchRegions(location.latitude, location.longitude);
            let allServices = [];

            for (const regionKey of searchRegions) {
                const regionServices = this.emergencyServices.get(regionKey) || [];
                allServices.push(...regionServices);
            }

            // Filter by service type if specified
            if (serviceType) {
                allServices = allServices.filter(service => service.type === serviceType);
            }

            // Filter by 24/7 availability if requested
            if (only24_7) {
                allServices = allServices.filter(service => service.is24_7);
            }

            // Calculate distances and filter by radius
            const servicesWithDistance = allServices
                .map(service => {
                    const distance = geolib.getDistance(currentLocation, service.location);
                    return {
                        ...service,
                        distance,
                        distanceText: this.formatDistance(distance)
                    };
                })
                .filter(service => service.distance <= radius)
                .sort((a, b) => a.distance - b.distance)
                .slice(0, limit);

            this.emergencyServiceQueries++;

            logger.info(`Found ${servicesWithDistance.length} emergency services`, {
                location: currentLocation,
                serviceType,
                radius,
                resultCount: servicesWithDistance.length
            });

            return {
                location: currentLocation,
                services: servicesWithDistance,
                searchRadius: radius,
                resultCount: servicesWithDistance.length
            };

        } catch (error) {
            logger.error('Error finding nearest emergency services:', error);
            return {
                location: location,
                services: [],
                error: error.message
            };
        }
    }

    getSearchRegions(lat, lng) {
        // Get current region and 8 adjacent regions
        const baseLatGrid = Math.floor(lat * 10) / 10;
        const baseLngGrid = Math.floor(lng * 10) / 10;
        
        const regions = [];
        
        for (let latOffset = -0.1; latOffset <= 0.1; latOffset += 0.1) {
            for (let lngOffset = -0.1; lngOffset <= 0.1; lngOffset += 0.1) {
                const regionLat = baseLatGrid + latOffset;
                const regionLng = baseLngGrid + lngOffset;
                regions.push(`${regionLat},${regionLng}`);
            }
        }
        
        return regions;
    }

    /**
     * Create a new safety zone (geofence)
     */
    async createSafetyZone(userId, zoneData) {
        try {
            const {
                name,
                center, // { latitude, longitude }
                radius = this.defaultGeofenceRadius,
                type, // 'safe', 'trigger', 'restricted'
                entryAlert = false,
                exitAlert = type !== 'safe' // Default to true for non-safe zones
            } = zoneData;

            // Validate zone data
            if (!name || !center || !type) {
                throw new Error('Missing required zone data: name, center, or type');
            }

            if (!this.isValidCoordinate(center.latitude, center.longitude)) {
                throw new Error('Invalid center coordinates');
            }

            // Insert into database
            const result = await this.db.query(`
                INSERT INTO safety_zones (
                    user_id, name, center_lat, center_lng, radius_meters,
                    zone_type, entry_alert, exit_alert
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `, [
                userId, name, center.latitude, center.longitude,
                radius, type, entryAlert, exitAlert
            ]);

            const zoneId = result.rows[0].id;

            // Add to in-memory cache
            if (!this.geofences.has(userId)) {
                this.geofences.set(userId, []);
            }

            const newZone = {
                id: zoneId,
                name,
                center,
                radius,
                type,
                entryAlert,
                exitAlert
            };

            this.geofences.get(userId).push(newZone);

            logger.info(`Created safety zone for user ${userId}`, {
                zoneId,
                name,
                type,
                center,
                radius
            });

            return {
                success: true,
                zoneId,
                zone: newZone
            };

        } catch (error) {
            logger.error(`Error creating safety zone for user ${userId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user's location history
     */
    async getLocationHistory(userId, options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                endDate = new Date(),
                limit = 100,
                includeCrisisOnly = false
            } = options;

            const result = await this.db.query(`
                SELECT id, latitude, longitude, accuracy, altitude, speed, heading,
                       is_crisis_location, location_source, created_at
                FROM user_locations
                WHERE user_id = $1 
                  AND created_at >= $2 
                  AND created_at <= $3
                  ${includeCrisisOnly ? 'AND is_crisis_location = true' : ''}
                ORDER BY created_at DESC
                LIMIT $4
            `, [userId, startDate, endDate, limit]);

            const locations = result.rows.map(row => ({
                id: row.id,
                latitude: parseFloat(row.latitude),
                longitude: parseFloat(row.longitude),
                accuracy: row.accuracy,
                altitude: row.altitude,
                speed: row.speed,
                heading: row.heading,
                isCrisisLocation: row.is_crisis_location,
                source: row.location_source,
                timestamp: row.created_at
            }));

            return {
                userId,
                locations,
                totalCount: locations.length,
                dateRange: {
                    start: startDate,
                    end: endDate
                }
            };

        } catch (error) {
            logger.error(`Error getting location history for user ${userId}:`, error);
            return {
                userId,
                locations: [],
                error: error.message
            };
        }
    }

    /**
     * Share location with emergency contacts
     */
    async shareLocationWithContacts(userId, crisisId = null) {
        try {
            // Get current location
            const currentLocation = await this.redis.getUserLocation(userId);
            if (!currentLocation || !currentLocation.latitude) {
                throw new Error('No current location available');
            }

            // Get emergency contacts
            const contacts = await this.redis.getEmergencyContacts(userId);
            if (!contacts || contacts.length === 0) {
                throw new Error('No emergency contacts available');
            }

            // Create shareable location data
            const locationShare = {
                userId,
                crisisId,
                location: {
                    latitude: parseFloat(currentLocation.latitude),
                    longitude: parseFloat(currentLocation.longitude),
                    accuracy: currentLocation.accuracy,
                    timestamp: currentLocation.timestamp
                },
                sharedAt: new Date().toISOString(),
                shareType: crisisId ? 'crisis' : 'manual'
            };

            // Find nearest emergency services
            const nearestServices = await this.findNearestEmergencyServices(
                locationShare.location,
                { limit: 3, only24_7: true }
            );

            locationShare.nearestEmergencyServices = nearestServices.services;

            // Generate share URL/map link
            locationShare.mapUrl = this.generateMapUrl(locationShare.location);
            locationShare.googleMapsUrl = this.generateGoogleMapsUrl(locationShare.location);

            logger.info(`Sharing location for user ${userId}`, {
                crisisId,
                contactCount: contacts.length,
                location: locationShare.location
            });

            // Emit event for notification system to handle
            this.emit('location-shared', {
                userId,
                locationShare,
                contacts,
                crisisId
            });

            return {
                success: true,
                locationShare,
                contactsNotified: contacts.length
            };

        } catch (error) {
            logger.error(`Error sharing location for user ${userId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Utility methods

    isValidCoordinate(latitude, longitude) {
        return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    }

    async getLastKnownLocation(userId) {
        try {
            const cachedLocation = await this.redis.getUserLocation(userId);
            if (cachedLocation && cachedLocation.latitude) {
                return {
                    latitude: parseFloat(cachedLocation.latitude),
                    longitude: parseFloat(cachedLocation.longitude),
                    timestamp: cachedLocation.timestamp
                };
            }

            // Fallback to database
            const result = await this.db.query(`
                SELECT latitude, longitude, created_at
                FROM user_locations
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 1
            `, [userId]);

            if (result.rows.length > 0) {
                const row = result.rows[0];
                return {
                    latitude: parseFloat(row.latitude),
                    longitude: parseFloat(row.longitude),
                    timestamp: row.created_at
                };
            }

            return null;
        } catch (error) {
            logger.error(`Error getting last known location for user ${userId}:`, error);
            return null;
        }
    }

    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)}m`;
        } else if (meters < 10000) {
            return `${(meters / 1000).toFixed(1)}km`;
        } else {
            return `${Math.round(meters / 1000)}km`;
        }
    }

    generateMapUrl(location) {
        // Generate a basic map URL - in production, this would use your mapping service
        return `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15`;
    }

    generateGoogleMapsUrl(location) {
        return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    }

    async cleanupOldLocations() {
        try {
            const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

            const result = await this.db.query(`
                DELETE FROM user_locations 
                WHERE created_at < $1 AND is_crisis_location = false
            `, [cutoffDate]);

            if (result.rowCount > 0) {
                logger.info(`Cleaned up ${result.rowCount} old location records`);
            }
        } catch (error) {
            logger.error('Error cleaning up old locations:', error);
        }
    }

    updatePerformanceMetrics() {
        logger.info('Location Tracker Performance Metrics', {
            activeTrackingUsers: this.activeTracking.size,
            totalGeofences: Array.from(this.geofences.values()).reduce((sum, zones) => sum + zones.length, 0),
            locationUpdates: this.locationUpdates,
            geofenceChecks: this.geofenceChecks,
            emergencyServiceQueries: this.emergencyServiceQueries,
            emergencyServicesLoaded: Array.from(this.emergencyServices.values()).reduce((sum, services) => sum + services.length, 0)
        });
    }

    async close() {
        logger.info('Closing Location Tracker...');
        
        this.activeTracking.clear();
        this.geofences.clear();
        this.emergencyServices.clear();
        
        logger.info('Location Tracker closed');
    }
}

module.exports = LocationTracker;
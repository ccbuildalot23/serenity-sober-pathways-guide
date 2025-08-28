/**
 * Safety Tools Routes
 * API endpoints for safety planning, check-ins, and coping resources
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { getDatabaseConnection } = require('../database/connection');

const router = express.Router();

/**
 * Get or create safety plan for user
 */
router.get('/plan/:userId', [
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

        // Import safety tools service
        const SafetyToolsService = require('../safety/tools');
        const safetyTools = new SafetyToolsService();
        await safetyTools.initialize();

        const result = await safetyTools.getSafetyPlan(userId);

        if (result.success) {
            res.json({
                success: true,
                safetyPlan: result.safetyPlan,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(404).json({
                success: false,
                error: result.error,
                suggestion: result.suggestion,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        logger.error('Error fetching safety plan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch safety plan',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Create or update safety plan
 */
router.post('/plan/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('planName').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Plan name must be under 255 characters'),
    body('warningSigns').optional().isArray().withMessage('Warning signs must be an array'),
    body('warningSigns.*').optional().isString().withMessage('Warning signs must be strings'),
    body('copingStrategies').optional().isArray().withMessage('Coping strategies must be an array'),
    body('copingStrategies.*').optional().isString().withMessage('Coping strategies must be strings'),
    body('supportContacts').optional().isObject().withMessage('Support contacts must be an object'),
    body('professionalContacts').optional().isObject().withMessage('Professional contacts must be an object'),
    body('environmentalSafety').optional().isObject().withMessage('Environmental safety must be an object')
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
        const planData = req.body;

        // Import safety tools service
        const SafetyToolsService = require('../safety/tools');
        const safetyTools = new SafetyToolsService();
        await safetyTools.initialize();

        const result = await safetyTools.createSafetyPlan(userId, planData);

        if (result.success) {
            logger.audit('safety_plan_created', userId, {
                planName: result.safetyPlan.planName,
                warningSignsCount: result.safetyPlan.warningSigns.length,
                copingStrategiesCount: result.safetyPlan.copingStrategies.length,
                ip: req.ip
            });

            res.status(201).json({
                success: true,
                safetyPlan: result.safetyPlan,
                message: result.message,
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
        logger.error('Error creating safety plan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create safety plan',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Record safety check-in
 */
router.post('/checkin/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('status').isIn(['safe', 'concerned', 'crisis']).withMessage('Invalid status'),
    body('moodScore').optional().isInt({ min: 1, max: 10 }).withMessage('Mood score must be between 1 and 10'),
    body('anxietyLevel').optional().isInt({ min: 1, max: 10 }).withMessage('Anxiety level must be between 1 and 10'),
    body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes too long'),
    body('location').optional().isObject().withMessage('Location must be an object'),
    body('location.latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('location.longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('usedCopingTools').optional().isArray().withMessage('Used coping tools must be an array'),
    body('triggersEncountered').optional().isArray().withMessage('Triggers encountered must be an array')
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
        const checkinData = req.body;

        // Import safety tools service
        const SafetyToolsService = require('../safety/tools');
        const safetyTools = new SafetyToolsService();
        await safetyTools.initialize();

        const result = await safetyTools.recordSafetyCheckin(userId, checkinData);

        if (result.success) {
            logger.info(`Safety check-in recorded for user ${userId}`, {
                checkinId: result.checkinId,
                status: result.status,
                followUpActions: result.followUpActions.length
            });

            res.status(201).json({
                success: true,
                checkinId: result.checkinId,
                status: result.status,
                timestamp: result.timestamp,
                followUpActions: result.followUpActions,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        logger.error('Error recording safety check-in:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record safety check-in',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get safety check-in history
 */
router.get('/checkin-history/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date'),
    query('status').optional().isIn(['safe', 'concerned', 'crisis']).withMessage('Invalid status filter'),
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
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate = new Date().toISOString(),
            status = null,
            limit = 50
        } = req.query;

        const db = getDatabaseConnection();

        let query = `
            SELECT id, status, mood_score, anxiety_level, notes,
                   location_lat, location_lng, created_at
            FROM safety_checkins
            WHERE user_id = $1 
              AND created_at >= $2 
              AND created_at <= $3
        `;

        const params = [userId, startDate, endDate];
        let paramIndex = 4;

        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await db.query(query, params);

        const checkins = result.rows.map(row => ({
            id: row.id,
            status: row.status,
            moodScore: row.mood_score,
            anxietyLevel: row.anxiety_level,
            notes: row.notes,
            location: row.location_lat && row.location_lng ? {
                latitude: parseFloat(row.location_lat),
                longitude: parseFloat(row.location_lng)
            } : null,
            timestamp: row.created_at
        }));

        // Get summary statistics
        const statusCounts = {
            safe: checkins.filter(c => c.status === 'safe').length,
            concerned: checkins.filter(c => c.status === 'concerned').length,
            crisis: checkins.filter(c => c.status === 'crisis').length
        };

        const moodScores = checkins.filter(c => c.moodScore).map(c => c.moodScore);
        const avgMood = moodScores.length > 0 ? 
            moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length : null;

        const anxietyLevels = checkins.filter(c => c.anxietyLevel).map(c => c.anxietyLevel);
        const avgAnxiety = anxietyLevels.length > 0 ?
            anxietyLevels.reduce((sum, level) => sum + level, 0) / anxietyLevels.length : null;

        res.json({
            success: true,
            checkins,
            summary: {
                totalCheckins: checkins.length,
                statusBreakdown: statusCounts,
                averageMood: avgMood ? Math.round(avgMood * 10) / 10 : null,
                averageAnxiety: avgAnxiety ? Math.round(avgAnxiety * 10) / 10 : null,
                checkinStreak: await calculateCheckinStreak(userId, db)
            },
            filters: {
                startDate,
                endDate,
                status,
                limit
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching check-in history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch check-in history',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get available coping resources
 */
router.get('/coping-resources', [
    query('category').optional().isIn(['breathing', 'grounding', 'distraction', 'mindfulness', 'physical', 'creative', 'social', 'professional']).withMessage('Invalid category'),
    query('difficulty').optional().isInt({ min: 1, max: 5 }).withMessage('Difficulty must be between 1 and 5'),
    query('maxDuration').optional().isInt({ min: 1, max: 120 }).withMessage('Max duration must be between 1 and 120 minutes'),
    query('search').optional().isString().isLength({ max: 100 }).withMessage('Search query too long')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const filters = {
            category: req.query.category || null,
            difficulty: req.query.difficulty ? parseInt(req.query.difficulty) : null,
            maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration) : null,
            searchQuery: req.query.search || null
        };

        // For this endpoint, we'll use a default userId since it's general resources
        // In a real implementation, you'd get this from authentication
        const userId = '00000000-0000-0000-0000-000000000000';

        // Import safety tools service
        const SafetyToolsService = require('../safety/tools');
        const safetyTools = new SafetyToolsService();
        await safetyTools.initialize();

        const result = await safetyTools.getCopingResources(userId, filters);

        if (result.success) {
            res.json({
                success: true,
                resources: result.resources,
                categories: result.categories,
                totalCount: result.totalCount,
                filters,
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
        logger.error('Error fetching coping resources:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch coping resources',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get personalized coping recommendations
 */
router.post('/recommendations/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('currentMood').optional().isInt({ min: 1, max: 10 }).withMessage('Current mood must be between 1 and 10'),
    body('currentAnxiety').optional().isInt({ min: 1, max: 10 }).withMessage('Current anxiety must be between 1 and 10'),
    body('availableTime').optional().isInt({ min: 1, max: 120 }).withMessage('Available time must be between 1 and 120 minutes'),
    body('location').optional().isIn(['home', 'work', 'public', 'other']).withMessage('Invalid location')
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
        const context = req.body;

        // Import safety tools service
        const SafetyToolsService = require('../safety/tools');
        const safetyTools = new SafetyToolsService();
        await safetyTools.initialize();

        const result = await safetyTools.getPersonalizedRecommendations(userId, context);

        if (result.success) {
            logger.info(`Personalized recommendations generated for user ${userId}`, {
                recommendationCount: result.recommendations.length,
                context: result.context
            });

            res.json({
                success: true,
                recommendations: result.recommendations,
                context: result.context,
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
        logger.error('Error getting personalized recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get personalized recommendations',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Record coping tool usage
 */
router.post('/coping-usage/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('resourceId').isUUID().withMessage('Valid resource ID required'),
    body('sessionDurationSeconds').optional().isInt({ min: 0 }).withMessage('Session duration must be non-negative'),
    body('effectivenessRating').optional().isInt({ min: 1, max: 10 }).withMessage('Effectiveness rating must be between 1 and 10'),
    body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes too long'),
    body('usedDuringCrisis').optional().isBoolean().withMessage('usedDuringCrisis must be boolean')
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
        const usageData = req.body;

        // Import safety tools service
        const SafetyToolsService = require('../safety/tools');
        const safetyTools = new SafetyToolsService();
        await safetyTools.initialize();

        const result = await safetyTools.recordCopingToolUsage(
            userId, 
            usageData.resourceId,
            {
                sessionDurationSeconds: usageData.sessionDurationSeconds,
                effectivenessRating: usageData.effectivenessRating,
                notes: usageData.notes,
                usedDuringCrisis: usageData.usedDuringCrisis
            }
        );

        if (result.success) {
            res.status(201).json({
                success: true,
                usageId: result.usageId,
                timestamp: result.timestamp,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        logger.error('Error recording coping tool usage:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record coping tool usage',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get coping tool usage statistics for user
 */
router.get('/usage-stats/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period')
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
        const { period = '30d' } = req.query;

        const periodDays = {
            '7d': 7,
            '30d': 30,
            '90d': 90
        };

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays[period]);

        const db = getDatabaseConnection();

        // Get usage statistics
        const usageResult = await db.query(`
            SELECT 
                cr.category, cr.title, cr.id as resource_id,
                COUNT(ucu.id) as usage_count,
                AVG(ucu.effectiveness_rating) as avg_effectiveness,
                AVG(ucu.session_duration_seconds) as avg_duration,
                COUNT(CASE WHEN ucu.used_during_crisis = true THEN 1 END) as crisis_usage_count
            FROM user_coping_usage ucu
            JOIN coping_resources cr ON ucu.resource_id = cr.id
            WHERE ucu.user_id = $1 AND ucu.created_at >= $2
            GROUP BY cr.id, cr.category, cr.title
            ORDER BY usage_count DESC, avg_effectiveness DESC NULLS LAST
        `, [userId, startDate]);

        // Get overall statistics
        const overallResult = await db.query(`
            SELECT 
                COUNT(*) as total_sessions,
                AVG(effectiveness_rating) as avg_effectiveness,
                AVG(session_duration_seconds) as avg_session_duration,
                COUNT(CASE WHEN used_during_crisis = true THEN 1 END) as crisis_sessions,
                COUNT(CASE WHEN effectiveness_rating >= 7 THEN 1 END) as highly_effective_sessions
            FROM user_coping_usage
            WHERE user_id = $1 AND created_at >= $2
        `, [userId, startDate]);

        const overall = overallResult.rows[0];

        // Get category breakdown
        const categoryResult = await db.query(`
            SELECT 
                cr.category,
                COUNT(ucu.id) as usage_count,
                AVG(ucu.effectiveness_rating) as avg_effectiveness
            FROM user_coping_usage ucu
            JOIN coping_resources cr ON ucu.resource_id = cr.id
            WHERE ucu.user_id = $1 AND ucu.created_at >= $2
            GROUP BY cr.category
            ORDER BY usage_count DESC
        `, [userId, startDate]);

        const usageByResource = usageResult.rows.map(row => ({
            resourceId: row.resource_id,
            category: row.category,
            title: row.title,
            usageCount: parseInt(row.usage_count),
            averageEffectiveness: row.avg_effectiveness ? parseFloat(row.avg_effectiveness) : null,
            averageDuration: row.avg_duration ? Math.round(parseFloat(row.avg_duration)) : null,
            crisisUsageCount: parseInt(row.crisis_usage_count),
            effectiveness: row.avg_effectiveness ? 
                (parseFloat(row.avg_effectiveness) >= 7 ? 'high' : 
                 parseFloat(row.avg_effectiveness) >= 5 ? 'medium' : 'low') : 'unrated'
        }));

        const categoryBreakdown = categoryResult.rows.map(row => ({
            category: row.category,
            usageCount: parseInt(row.usage_count),
            averageEffectiveness: row.avg_effectiveness ? parseFloat(row.avg_effectiveness) : null
        }));

        res.json({
            success: true,
            period,
            overall: {
                totalSessions: parseInt(overall.total_sessions) || 0,
                averageEffectiveness: overall.avg_effectiveness ? parseFloat(overall.avg_effectiveness) : null,
                averageSessionDuration: overall.avg_session_duration ? Math.round(parseFloat(overall.avg_session_duration)) : null,
                crisisSessions: parseInt(overall.crisis_sessions) || 0,
                highlyEffectiveSessions: parseInt(overall.highly_effective_sessions) || 0,
                effectivenessRate: overall.total_sessions ? 
                    Math.round((parseInt(overall.highly_effective_sessions) / parseInt(overall.total_sessions)) * 100) : 0
            },
            usageByResource,
            categoryBreakdown,
            topResources: usageByResource.slice(0, 5),
            mostEffective: usageByResource
                .filter(r => r.averageEffectiveness !== null)
                .sort((a, b) => b.averageEffectiveness - a.averageEffectiveness)
                .slice(0, 3),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching usage statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch usage statistics',
            timestamp: new Date().toISOString()
        });
    }
});

// Helper function to calculate check-in streak
async function calculateCheckinStreak(userId, db) {
    try {
        const result = await db.query(`
            SELECT DATE(created_at) as checkin_date
            FROM safety_checkins
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 30
        `, [userId]);

        if (result.rows.length === 0) return 0;

        const dates = result.rows.map(row => new Date(row.checkin_date));
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (const checkinDate of dates) {
            const checkinDateOnly = new Date(checkinDate);
            checkinDateOnly.setHours(0, 0, 0, 0);

            const diffTime = currentDate.getTime() - checkinDateOnly.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === streak) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else if (diffDays === streak + 1 && streak === 0) {
                // Allow for today not having a check-in yet
                streak = 1;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    } catch (error) {
        logger.error('Error calculating check-in streak:', error);
        return 0;
    }
}

module.exports = router;
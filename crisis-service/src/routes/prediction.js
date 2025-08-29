/**
 * ML Prediction Routes
 * API endpoints for crisis prediction and risk assessment
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { getDatabaseConnection } = require('../database/connection');

const router = express.Router();

/**
 * Get crisis risk prediction for user
 */
router.post('/risk-assessment/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('currentData').optional().isObject().withMessage('currentData must be an object'),
    body('currentData.moodScore').optional().isInt({ min: 1, max: 10 }).withMessage('Mood score must be between 1 and 10'),
    body('currentData.anxietyLevel').optional().isInt({ min: 1, max: 10 }).withMessage('Anxiety level must be between 1 and 10'),
    body('currentData.sleepHours').optional().isFloat({ min: 0, max: 24 }).withMessage('Sleep hours must be between 0 and 24'),
    body('currentData.activityLevel').optional().isFloat({ min: 0, max: 10 }).withMessage('Activity level must be between 0 and 10'),
    body('currentData.socialInteractions').optional().isInt({ min: 0 }).withMessage('Social interactions must be non-negative'),
    body('currentData.sentimentScore').optional().isFloat({ min: -1, max: 1 }).withMessage('Sentiment score must be between -1 and 1')
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
        const { currentData = {} } = req.body;

        // Import prediction service
        const PredictionService = require('../ml/prediction');
        const predictionService = new PredictionService();
        await predictionService.initialize();

        // Get risk prediction
        const prediction = await predictionService.predictCrisisRisk(userId, currentData);

        logger.info(`Risk assessment completed for user ${userId}`, {
            riskScore: prediction.riskScore,
            riskLevel: prediction.riskLevel,
            confidence: prediction.confidence,
            predictionTime: prediction.predictionTime
        });

        res.json({
            success: true,
            userId,
            prediction: {
                riskScore: prediction.riskScore,
                riskLevel: prediction.riskLevel,
                confidence: prediction.confidence,
                patterns: prediction.patterns,
                interventions: prediction.interventions,
                timestamp: prediction.timestamp,
                predictionTime: prediction.predictionTime
            },
            recommendations: {
                immediate: prediction.interventions.filter(i => i.priority === 'urgent'),
                suggested: prediction.interventions.filter(i => i.priority === 'high'),
                preventive: prediction.interventions.filter(i => i.priority === 'medium')
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error in risk assessment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete risk assessment',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get risk history for user
 */
router.get('/risk-history/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period'),
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
        const { period = '30d', limit = 50 } = req.query;

        const periodDays = {
            '7d': 7,
            '30d': 30,
            '90d': 90
        };

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays[period]);

        const db = getDatabaseConnection();

        const result = await db.query(`
            SELECT risk_score, risk_factors, last_crisis_date, 
                   high_risk_flag, updated_at
            FROM user_risk_profiles
            WHERE user_id = $1 
              AND updated_at >= $2
            ORDER BY updated_at DESC
            LIMIT $3
        `, [userId, startDate, limit]);

        const riskHistory = result.rows.map(row => ({
            riskScore: parseFloat(row.risk_score),
            riskFactors: row.risk_factors,
            lastCrisisDate: row.last_crisis_date,
            highRiskFlag: row.high_risk_flag,
            timestamp: row.updated_at
        }));

        // Calculate risk trend
        let trend = 'stable';
        if (riskHistory.length >= 2) {
            const recent = riskHistory[0].riskScore;
            const older = riskHistory[riskHistory.length - 1].riskScore;
            const change = recent - older;
            
            if (change > 0.1) trend = 'increasing';
            else if (change < -0.1) trend = 'decreasing';
        }

        // Get current risk profile
        const currentResult = await db.query(`
            SELECT risk_score, high_risk_flag, total_crisis_count
            FROM user_risk_profiles
            WHERE user_id = $1
        `, [userId]);

        const currentProfile = currentResult.rows.length > 0 ? {
            currentRiskScore: parseFloat(currentResult.rows[0].risk_score),
            highRiskFlag: currentResult.rows[0].high_risk_flag,
            totalCrisisCount: currentResult.rows[0].total_crisis_count
        } : null;

        res.json({
            success: true,
            userId,
            period,
            currentProfile,
            riskHistory,
            trend,
            statistics: {
                averageRisk: riskHistory.length > 0 ? 
                    riskHistory.reduce((sum, r) => sum + r.riskScore, 0) / riskHistory.length : 0,
                maxRisk: Math.max(...riskHistory.map(r => r.riskScore), 0),
                minRisk: Math.min(...riskHistory.map(r => r.riskScore), 1),
                highRiskPeriods: riskHistory.filter(r => r.riskScore >= 0.7).length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching risk history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch risk history',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get intervention recommendations
 */
router.get('/interventions/:userId', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    query('context').optional().isJSON().withMessage('Context must be valid JSON'),
    query('urgency').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid urgency level')
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
        const { context = '{}', urgency = null } = req.query;

        let contextData = {};
        try {
            contextData = JSON.parse(context);
        } catch (e) {
            contextData = {};
        }

        // Import prediction service
        const PredictionService = require('../ml/prediction');
        const predictionService = new PredictionService();
        await predictionService.initialize();

        // Get current risk assessment to inform interventions
        const riskPrediction = await predictionService.predictCrisisRisk(userId, contextData);
        
        // Filter interventions by urgency if specified
        let interventions = riskPrediction.interventions || [];
        
        if (urgency) {
            const urgencyMap = {
                'urgent': ['urgent'],
                'high': ['urgent', 'high'],
                'medium': ['urgent', 'high', 'medium'],
                'low': ['urgent', 'high', 'medium', 'low']
            };
            
            interventions = interventions.filter(i => 
                urgencyMap[urgency].includes(i.priority)
            );
        }

        // Get user's intervention history for effectiveness data
        const db = getDatabaseConnection();
        const historyResult = await db.query(`
            SELECT intervention_type, success_rate, last_used
            FROM intervention_history
            WHERE user_id = $1
            ORDER BY success_rate DESC, last_used DESC
        `, [userId]);

        const interventionHistory = new Map();
        historyResult.rows.forEach(row => {
            interventionHistory.set(row.intervention_type, {
                successRate: parseFloat(row.success_rate),
                lastUsed: row.last_used
            });
        });

        // Enhance interventions with historical effectiveness
        const enhancedInterventions = interventions.map(intervention => {
            const history = interventionHistory.get(intervention.type);
            return {
                ...intervention,
                effectiveness: history ? {
                    successRate: history.successRate,
                    lastUsed: history.lastUsed,
                    recommended: history.successRate >= 0.7
                } : {
                    successRate: null,
                    lastUsed: null,
                    recommended: false
                }
            };
        });

        // Sort by priority and effectiveness
        enhancedInterventions.sort((a, b) => {
            const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            
            if (aPriority !== bPriority) return bPriority - aPriority;
            
            const aEffectiveness = a.effectiveness.successRate || 0.5;
            const bEffectiveness = b.effectiveness.successRate || 0.5;
            return bEffectiveness - aEffectiveness;
        });

        res.json({
            success: true,
            userId,
            currentRiskLevel: riskPrediction.riskLevel,
            interventions: enhancedInterventions,
            summary: {
                totalRecommendations: enhancedInterventions.length,
                urgentActions: enhancedInterventions.filter(i => i.priority === 'urgent').length,
                provenEffective: enhancedInterventions.filter(i => 
                    i.effectiveness.successRate >= 0.7).length,
                context: contextData
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error getting intervention recommendations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get intervention recommendations',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Record intervention outcome
 */
router.post('/interventions/:userId/outcome', [
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('interventionType').isString().withMessage('Intervention type required'),
    body('outcome').isIn(['successful', 'partially_successful', 'unsuccessful']).withMessage('Invalid outcome'),
    body('effectiveness').optional().isFloat({ min: 0, max: 1 }).withMessage('Effectiveness must be between 0 and 1'),
    body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be non-negative'),
    body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes too long')
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
            interventionType,
            outcome,
            effectiveness = null,
            duration = null,
            notes = ''
        } = req.body;

        const db = getDatabaseConnection();

        // Record intervention outcome
        const result = await db.query(`
            INSERT INTO intervention_outcomes (
                user_id, intervention_type, outcome, effectiveness,
                duration_minutes, notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at
        `, [userId, interventionType, outcome, effectiveness, duration, notes]);

        const outcomeId = result.rows[0].id;

        // Update intervention history
        await db.query(`
            INSERT INTO intervention_history (user_id, intervention_type, success_rate, last_used, total_uses)
            VALUES ($1, $2, $3, NOW(), 1)
            ON CONFLICT (user_id, intervention_type)
            DO UPDATE SET
                success_rate = (
                    (intervention_history.success_rate * intervention_history.total_uses + 
                     CASE WHEN $3 >= 0.7 THEN 1.0 ELSE 0.0 END) 
                    / (intervention_history.total_uses + 1)
                ),
                last_used = NOW(),
                total_uses = intervention_history.total_uses + 1
        `, [userId, interventionType, effectiveness || (outcome === 'successful' ? 1.0 : 0.0)]);

        logger.audit('intervention_outcome_recorded', userId, {
            outcomeId,
            interventionType,
            outcome,
            effectiveness,
            duration,
            ip: req.ip
        });

        res.status(201).json({
            success: true,
            outcomeId,
            message: 'Intervention outcome recorded successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error recording intervention outcome:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record intervention outcome',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get prediction model performance metrics
 */
router.get('/model/performance', async (req, res) => {
    try {
        // Import prediction service
        const PredictionService = require('../ml/prediction');
        const predictionService = new PredictionService();
        await predictionService.initialize();

        const metrics = predictionService.getPerformanceMetrics();

        const db = getDatabaseConnection();

        // Get additional statistics from database
        const statsResult = await db.query(`
            SELECT 
                COUNT(*) as total_predictions,
                AVG(risk_score) as avg_risk_score,
                COUNT(CASE WHEN high_risk_flag = true THEN 1 END) as high_risk_users,
                COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_predictions
            FROM user_risk_profiles
        `);

        const stats = statsResult.rows[0];

        res.json({
            success: true,
            performance: metrics,
            statistics: {
                totalPredictions: parseInt(stats.total_predictions),
                averageRiskScore: parseFloat(stats.avg_risk_score) || 0,
                highRiskUsers: parseInt(stats.high_risk_users),
                recentPredictions: parseInt(stats.recent_predictions)
            },
            modelInfo: {
                version: '2.0',
                lastTrained: '2024-01-01', // This would be dynamic in production
                features: [
                    'behavioral_patterns',
                    'temporal_analysis',
                    'contextual_factors',
                    'historical_data'
                ]
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error fetching model performance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model performance metrics',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Trigger model retraining (admin only)
 */
router.post('/model/retrain', async (req, res) => {
    try {
        // In production, this would require admin authentication
        logger.info('Model retraining triggered via API');

        // Import prediction service
        const PredictionService = require('../ml/prediction');
        const predictionService = new PredictionService();
        await predictionService.initialize();

        // Start retraining process (this would be async in production)
        await predictionService.retrainModels();

        res.json({
            success: true,
            message: 'Model retraining initiated',
            estimatedCompletion: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error triggering model retraining:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to trigger model retraining',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get feature importance analysis
 */
router.get('/model/features/:userId', [
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

        // Get latest prediction for the user
        const db = getDatabaseConnection();
        const result = await db.query(`
            SELECT risk_factors, updated_at
            FROM user_risk_profiles
            WHERE user_id = $1
            ORDER BY updated_at DESC
            LIMIT 1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No risk assessment found for user',
                timestamp: new Date().toISOString()
            });
        }

        const riskFactors = result.rows[0].risk_factors || {};

        // Analyze feature importance (simplified version)
        const featureImportance = {
            behavioral: {
                moodScore: 0.25,
                anxietyLevel: 0.20,
                sleepPattern: 0.15,
                socialInteraction: 0.10
            },
            temporal: {
                timeOfDay: 0.08,
                dayOfWeek: 0.05,
                seasonality: 0.03
            },
            contextual: {
                historyFactor: 0.10,
                riskProfile: 0.04
            }
        };

        // Get user-specific insights from risk factors
        const insights = [];
        
        if (riskFactors.patterns) {
            if (riskFactors.patterns.crisisRisk > 0.7) {
                insights.push({
                    type: 'warning',
                    message: 'Elevated crisis risk detected in behavioral patterns',
                    importance: 'high'
                });
            }
            
            if (riskFactors.patterns.stabilityScore < 0.3) {
                insights.push({
                    type: 'concern',
                    message: 'Stability indicators suggest need for additional support',
                    importance: 'medium'
                });
            }
        }

        res.json({
            success: true,
            userId,
            featureImportance,
            insights,
            riskFactors,
            lastAnalysis: result.rows[0].updated_at,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error getting feature importance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get feature importance analysis',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
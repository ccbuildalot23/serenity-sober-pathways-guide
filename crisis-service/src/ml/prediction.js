/**
 * Machine Learning Crisis Prediction and Prevention System
 * Advanced ML-based risk assessment and intervention recommendations
 */

// Make TensorFlow optional for development
let tf;
try {
    tf = require('@tensorflow/tfjs-node');
} catch (err) {
    console.warn('TensorFlow not available - ML features disabled');
    tf = null;
}
const logger = require('../utils/logger');
const config = require('../config/config');
const { getDatabaseConnection } = require('../database/connection');
const { getRedisManager } = require('../cache/redis');

class PredictionService {
    constructor() {
        this.db = null;
        this.redis = null;
        this.models = new Map();
        this.isInitialized = false;
        
        // Model configurations
        this.modelConfig = {
            riskAssessment: {
                inputSize: 15, // Features for risk assessment
                outputSize: 1,  // Risk score 0-1
                threshold: config.ml.confidenceThreshold,
                modelPath: `${config.ml.modelPath}/risk-assessment`
            },
            patternRecognition: {
                inputSize: 20, // Sequential patterns
                sequenceLength: 7, // 7 days of data
                outputSize: 3, // [crisis_risk, intervention_need, stability_score]
                modelPath: `${config.ml.modelPath}/pattern-recognition`
            },
            interventionRecommendation: {
                inputSize: 12, // User context + current state
                outputSize: 8,  // Different intervention types
                modelPath: `${config.ml.modelPath}/intervention-recommendation`
            }
        };
        
        // Feature engineering
        this.featureExtractors = {
            behavioral: this.extractBehavioralFeatures.bind(this),
            temporal: this.extractTemporalFeatures.bind(this),
            contextual: this.extractContextualFeatures.bind(this),
            historical: this.extractHistoricalFeatures.bind(this)
        };
        
        // Intervention types
        this.interventionTypes = [
            'immediate_crisis_support',
            'counseling_referral',
            'medication_review',
            'peer_support_connection',
            'safety_plan_update',
            'activity_engagement',
            'family_notification',
            'professional_followup'
        ];
        
        // Performance tracking
        this.predictionCount = 0;
        this.accuracyTracking = {
            truePositives: 0,
            falsePositives: 0,
            trueNegatives: 0,
            falseNegatives: 0
        };
    }

    async initialize() {
        try {
            logger.info('Initializing ML Prediction Service...');
            
            this.db = getDatabaseConnection();
            this.redis = getRedisManager();
            
            // Load or create ML models
            await this.loadModels();
            
            // Initialize feature preprocessing
            await this.initializePreprocessing();
            
            // Load historical data for baseline calculations
            await this.loadBaselines();
            
            // Start background model training
            this.startBackgroundTraining();
            
            this.isInitialized = true;
            logger.info('ML Prediction Service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize ML Prediction Service:', error);
            throw error;
        }
    }

    async loadModels() {
        try {
            // Risk Assessment Model
            try {
                const riskModel = await tf.loadLayersModel(`file://${this.modelConfig.riskAssessment.modelPath}/model.json`);
                this.models.set('riskAssessment', riskModel);
                logger.info('Risk assessment model loaded');
            } catch (error) {
                logger.warn('Risk assessment model not found, creating new model');
                const riskModel = this.createRiskAssessmentModel();
                this.models.set('riskAssessment', riskModel);
            }
            
            // Pattern Recognition Model
            try {
                const patternModel = await tf.loadLayersModel(`file://${this.modelConfig.patternRecognition.modelPath}/model.json`);
                this.models.set('patternRecognition', patternModel);
                logger.info('Pattern recognition model loaded');
            } catch (error) {
                logger.warn('Pattern recognition model not found, creating new model');
                const patternModel = this.createPatternRecognitionModel();
                this.models.set('patternRecognition', patternModel);
            }
            
            // Intervention Recommendation Model
            try {
                const interventionModel = await tf.loadLayersModel(`file://${this.modelConfig.interventionRecommendation.modelPath}/model.json`);
                this.models.set('interventionRecommendation', interventionModel);
                logger.info('Intervention recommendation model loaded');
            } catch (error) {
                logger.warn('Intervention recommendation model not found, creating new model');
                const interventionModel = this.createInterventionModel();
                this.models.set('interventionRecommendation', interventionModel);
            }
            
        } catch (error) {
            logger.error('Error loading ML models:', error);
            throw error;
        }
    }

    createRiskAssessmentModel() {
        if (!tf) {
            logger.warn('TensorFlow not available - using mock model');
            return null;
        }
        const model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [this.modelConfig.riskAssessment.inputSize],
                    units: 32,
                    activation: 'relu'
                }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 16, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 8, activation: 'relu' }),
                tf.layers.dense({ 
                    units: this.modelConfig.riskAssessment.outputSize, 
                    activation: 'sigmoid' 
                })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    createPatternRecognitionModel() {
        if (!tf) {
            logger.warn('TensorFlow not available - using mock model');
            return null;
        }
        const model = tf.sequential({
            layers: [
                tf.layers.lstm({
                    inputShape: [this.modelConfig.patternRecognition.sequenceLength, this.modelConfig.patternRecognition.inputSize],
                    units: 64,
                    returnSequences: true
                }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.lstm({ units: 32, returnSequences: false }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 16, activation: 'relu' }),
                tf.layers.dense({ 
                    units: this.modelConfig.patternRecognition.outputSize, 
                    activation: 'sigmoid' 
                })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mae']
        });

        return model;
    }

    createInterventionModel() {
        if (!tf) {
            logger.warn('TensorFlow not available - using mock model');
            return null;
        }
        const model = tf.sequential({
            layers: [
                tf.layers.dense({
                    inputShape: [this.modelConfig.interventionRecommendation.inputSize],
                    units: 24,
                    activation: 'relu'
                }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 16, activation: 'relu' }),
                tf.layers.dense({ 
                    units: this.modelConfig.interventionRecommendation.outputSize, 
                    activation: 'softmax' 
                })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    async initializePreprocessing() {
        // Load normalization parameters from Redis or calculate from data
        try {
            const normParams = await this.redis.getClient().get('ml:normalization_params');
            
            if (normParams) {
                this.normalizationParams = JSON.parse(normParams);
                logger.info('Loaded normalization parameters from cache');
            } else {
                await this.calculateNormalizationParams();
            }
        } catch (error) {
            logger.error('Error initializing preprocessing:', error);
            // Use default normalization parameters
            this.normalizationParams = this.getDefaultNormalizationParams();
        }
    }

    async calculateNormalizationParams() {
        try {
            // Calculate feature normalization parameters from historical data
            const result = await this.db.query(`
                SELECT 
                    AVG(mood_score) as avg_mood,
                    STDDEV(mood_score) as std_mood,
                    AVG(anxiety_level) as avg_anxiety,
                    STDDEV(anxiety_level) as std_anxiety,
                    AVG(sleep_hours) as avg_sleep,
                    STDDEV(sleep_hours) as std_sleep,
                    AVG(activity_level) as avg_activity,
                    STDDEV(activity_level) as std_activity
                FROM (
                    SELECT 
                        sc.mood_score,
                        sc.anxiety_level,
                        EXTRACT(HOUR FROM (sc.created_at - LAG(sc.created_at) OVER (PARTITION BY sc.user_id ORDER BY sc.created_at))) as sleep_hours,
                        COALESCE(ub.avg_activity_level, 5.0) as activity_level
                    FROM safety_checkins sc
                    LEFT JOIN user_baselines ub ON sc.user_id = ub.user_id
                    WHERE sc.created_at > NOW() - INTERVAL '30 days'
                      AND sc.mood_score IS NOT NULL
                ) features
            `);

            if (result.rows.length > 0) {
                const stats = result.rows[0];
                this.normalizationParams = {
                    mood: { mean: parseFloat(stats.avg_mood) || 5, std: parseFloat(stats.std_mood) || 2 },
                    anxiety: { mean: parseFloat(stats.avg_anxiety) || 5, std: parseFloat(stats.std_anxiety) || 2 },
                    sleep: { mean: parseFloat(stats.avg_sleep) || 8, std: parseFloat(stats.std_sleep) || 2 },
                    activity: { mean: parseFloat(stats.avg_activity) || 5, std: parseFloat(stats.std_activity) || 2 }
                };
                
                // Cache the parameters
                await this.redis.getClient().set(
                    'ml:normalization_params',
                    JSON.stringify(this.normalizationParams),
                    'EX',
                    24 * 60 * 60 // 24 hours
                );
                
                logger.info('Calculated and cached normalization parameters');
            } else {
                this.normalizationParams = this.getDefaultNormalizationParams();
            }
        } catch (error) {
            logger.error('Error calculating normalization parameters:', error);
            this.normalizationParams = this.getDefaultNormalizationParams();
        }
    }

    getDefaultNormalizationParams() {
        return {
            mood: { mean: 5, std: 2 },
            anxiety: { mean: 5, std: 2 },
            sleep: { mean: 8, std: 2 },
            activity: { mean: 5, std: 2 },
            heartRate: { mean: 70, std: 15 },
            socialInteraction: { mean: 3, std: 2 }
        };
    }

    async loadBaselines() {
        // Load user baseline data for feature engineering
        try {
            const result = await this.db.query(`
                SELECT user_id, avg_mood_score, avg_sleep_hours, 
                       avg_heart_rate, avg_activity_level, risk_level
                FROM user_baselines
            `);

            this.userBaselines = new Map();
            for (const row of result.rows) {
                this.userBaselines.set(row.user_id, {
                    avgMood: row.avg_mood_score,
                    avgSleep: row.avg_sleep_hours,
                    avgHeartRate: row.avg_heart_rate,
                    avgActivity: row.avg_activity_level,
                    riskLevel: row.risk_level
                });
            }

            logger.info(`Loaded baselines for ${this.userBaselines.size} users`);
        } catch (error) {
            logger.error('Error loading baselines:', error);
            this.userBaselines = new Map();
        }
    }

    startBackgroundTraining() {
        // Retrain models periodically with new data
        setInterval(() => {
            this.retrainModels();
        }, 24 * 60 * 60 * 1000); // Daily retraining

        // Update normalization parameters
        setInterval(() => {
            this.calculateNormalizationParams();
        }, 6 * 60 * 60 * 1000); // Every 6 hours

        logger.info('Background model training scheduled');
    }

    /**
     * Main prediction method - comprehensive risk assessment
     */
    async predictCrisisRisk(userId, currentData = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Prediction service not initialized');
            }

            const startTime = Date.now();
            
            // Extract features for prediction
            const features = await this.extractAllFeatures(userId, currentData);
            
            // Risk assessment prediction
            const riskScore = await this.predictRiskScore(features.risk);
            
            // Pattern recognition prediction
            const patterns = await this.predictPatterns(userId, features.patterns);
            
            // Intervention recommendations
            const interventions = await this.recommendInterventions(features.intervention);
            
            // Combine predictions into comprehensive assessment
            const prediction = {
                userId,
                timestamp: new Date(),
                riskScore: riskScore.score,
                riskLevel: this.categorizeRisk(riskScore.score),
                confidence: riskScore.confidence,
                patterns: {
                    crisisRisk: patterns.crisisRisk,
                    interventionNeed: patterns.interventionNeed,
                    stabilityScore: patterns.stabilityScore
                },
                interventions: interventions.recommendations,
                features: {
                    behavioral: features.behavioral,
                    temporal: features.temporal,
                    contextual: features.contextual
                },
                predictionTime: Date.now() - startTime
            };

            // Store prediction
            await this.storePrediction(prediction);
            
            // Update metrics
            this.predictionCount++;
            
            logger.info(`Crisis risk prediction for user ${userId}`, {
                riskScore: prediction.riskScore,
                riskLevel: prediction.riskLevel,
                confidence: prediction.confidence,
                predictionTime: prediction.predictionTime
            });

            return prediction;

        } catch (error) {
            logger.error(`Error predicting crisis risk for user ${userId}:`, error);
            return {
                userId,
                error: error.message,
                riskScore: 0.5, // Default moderate risk
                riskLevel: 'moderate',
                confidence: 0,
                timestamp: new Date()
            };
        }
    }

    async extractAllFeatures(userId, currentData) {
        const features = {
            risk: [],
            patterns: [],
            intervention: [],
            behavioral: {},
            temporal: {},
            contextual: {}
        };

        try {
            // Behavioral features
            features.behavioral = await this.extractBehavioralFeatures(userId, currentData);
            
            // Temporal features
            features.temporal = await this.extractTemporalFeatures(userId);
            
            // Contextual features
            features.contextual = await this.extractContextualFeatures(userId);
            
            // Historical features
            const historical = await this.extractHistoricalFeatures(userId);

            // Combine features for risk assessment
            features.risk = [
                ...Object.values(features.behavioral),
                ...Object.values(features.temporal),
                ...Object.values(features.contextual).slice(0, 5) // Limit contextual features
            ].slice(0, this.modelConfig.riskAssessment.inputSize);

            // Features for intervention recommendation
            features.intervention = [
                features.behavioral.moodScore || 5,
                features.behavioral.anxietyLevel || 5,
                features.behavioral.sleepQuality || 5,
                features.behavioral.socialInteraction || 3,
                features.temporal.daysSinceLastCheckin || 1,
                features.temporal.timeOfDay || 12,
                features.contextual.riskLevel || 0.5,
                features.contextual.previousCrises || 0,
                historical.crisisFrequency || 0,
                historical.interventionSuccess || 0.5,
                currentData.severity || 0,
                currentData.confidence || 0
            ];

            // Prepare sequential data for pattern recognition
            features.patterns = await this.extractSequentialFeatures(userId);

        } catch (error) {
            logger.error('Error extracting features:', error);
            // Return default features
            features.risk = new Array(this.modelConfig.riskAssessment.inputSize).fill(0.5);
            features.intervention = new Array(this.modelConfig.interventionRecommendation.inputSize).fill(0.5);
            features.patterns = new Array(this.modelConfig.patternRecognition.sequenceLength)
                .fill(null)
                .map(() => new Array(this.modelConfig.patternRecognition.inputSize).fill(0.5));
        }

        return features;
    }

    async extractBehavioralFeatures(userId, currentData) {
        try {
            const baseline = this.userBaselines.get(userId) || {};
            
            // Get recent check-ins
            const result = await this.db.query(`
                SELECT mood_score, anxiety_level, notes, created_at
                FROM safety_checkins
                WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
                LIMIT 10
            `, [userId]);

            const checkins = result.rows;
            
            let moodScore = currentData.moodScore || 5;
            let anxietyLevel = currentData.anxietyLevel || 5;
            let moodVariability = 0;
            let anxietyTrend = 0;
            
            if (checkins.length > 0) {
                const moods = checkins.map(c => c.mood_score).filter(Boolean);
                const anxieties = checkins.map(c => c.anxiety_level).filter(Boolean);
                
                if (moods.length > 0) {
                    moodScore = moods[0]; // Most recent
                    moodVariability = this.calculateVariability(moods);
                }
                
                if (anxieties.length > 0) {
                    anxietyLevel = anxieties[0];
                    anxietyTrend = this.calculateTrend(anxieties);
                }
            }

            // Normalize features
            const features = {
                moodScore: this.normalize(moodScore, this.normalizationParams.mood),
                anxietyLevel: this.normalize(anxietyLevel, this.normalizationParams.anxiety),
                moodVariability: Math.min(moodVariability / 10, 1), // Cap at 1
                anxietyTrend: Math.max(-1, Math.min(anxietyTrend, 1)), // Range -1 to 1
                sleepQuality: this.normalize(currentData.sleepHours || baseline.avgSleep || 8, this.normalizationParams.sleep),
                activityLevel: this.normalize(currentData.activityLevel || baseline.avgActivity || 5, this.normalizationParams.activity),
                socialInteraction: this.normalize(currentData.socialInteractions || 3, this.normalizationParams.socialInteraction),
                checkinFrequency: Math.min(checkins.length / 7, 1), // Checkins per day, capped at 1
                textSentiment: currentData.sentimentScore || 0, // -1 to 1
                missedCheckins: Math.min((currentData.missedCheckins || 0) / 5, 1) // Capped at 1
            };

            return features;
        } catch (error) {
            logger.error('Error extracting behavioral features:', error);
            return {
                moodScore: 0.5,
                anxietyLevel: 0.5,
                moodVariability: 0,
                anxietyTrend: 0,
                sleepQuality: 0.5,
                activityLevel: 0.5,
                socialInteraction: 0.5,
                checkinFrequency: 0.5,
                textSentiment: 0,
                missedCheckins: 0
            };
        }
    }

    async extractTemporalFeatures(userId) {
        try {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0-6
            const hourOfDay = now.getHours(); // 0-23
            
            // Get last check-in time
            const lastCheckinResult = await this.db.query(`
                SELECT created_at FROM safety_checkins
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 1
            `, [userId]);

            let daysSinceLastCheckin = 1;
            if (lastCheckinResult.rows.length > 0) {
                const lastCheckin = new Date(lastCheckinResult.rows[0].created_at);
                daysSinceLastCheckin = (now - lastCheckin) / (1000 * 60 * 60 * 24);
            }

            // Crisis history temporal patterns
            const crisisHistoryResult = await this.db.query(`
                SELECT EXTRACT(DOW FROM detected_at) as day_of_week,
                       EXTRACT(HOUR FROM detected_at) as hour_of_day,
                       COUNT(*) as crisis_count
                FROM crisis_events
                WHERE user_id = $1 AND detected_at > NOW() - INTERVAL '90 days'
                GROUP BY day_of_week, hour_of_day
                ORDER BY crisis_count DESC
                LIMIT 1
            `, [userId]);

            let crisisProbabilityByTime = 0;
            if (crisisHistoryResult.rows.length > 0) {
                const crisisPattern = crisisHistoryResult.rows[0];
                if (dayOfWeek === crisisPattern.day_of_week && 
                    Math.abs(hourOfDay - crisisPattern.hour_of_day) <= 2) {
                    crisisProbabilityByTime = 0.8;
                }
            }

            return {
                dayOfWeek: dayOfWeek / 6, // Normalize to 0-1
                timeOfDay: hourOfDay / 23, // Normalize to 0-1
                daysSinceLastCheckin: Math.min(daysSinceLastCheckin / 7, 1), // Cap at 1 week
                isWeekend: (dayOfWeek === 0 || dayOfWeek === 6) ? 1 : 0,
                isNightTime: (hourOfDay < 6 || hourOfDay > 22) ? 1 : 0,
                crisisProbabilityByTime: crisisProbabilityByTime,
                monthOfYear: now.getMonth() / 11 // Normalize to 0-1
            };

        } catch (error) {
            logger.error('Error extracting temporal features:', error);
            return {
                dayOfWeek: 0.5,
                timeOfDay: 0.5,
                daysSinceLastCheckin: 0.1,
                isWeekend: 0,
                isNightTime: 0,
                crisisProbabilityByTime: 0,
                monthOfYear: 0.5
            };
        }
    }

    async extractContextualFeatures(userId) {
        try {
            // Get user risk profile
            const riskProfileResult = await this.db.query(`
                SELECT risk_score, total_crisis_count, last_crisis_date, high_risk_flag
                FROM user_risk_profiles
                WHERE user_id = $1
            `, [userId]);

            let riskLevel = 0.5;
            let previousCrises = 0;
            let daysSinceLastCrisis = 365; // Default to 1 year
            let highRiskFlag = 0;

            if (riskProfileResult.rows.length > 0) {
                const profile = riskProfileResult.rows[0];
                riskLevel = parseFloat(profile.risk_score) || 0.5;
                previousCrises = profile.total_crisis_count || 0;
                highRiskFlag = profile.high_risk_flag ? 1 : 0;
                
                if (profile.last_crisis_date) {
                    const lastCrisis = new Date(profile.last_crisis_date);
                    daysSinceLastCrisis = (new Date() - lastCrisis) / (1000 * 60 * 60 * 24);
                }
            }

            // Get recent detection history
            const detectionResult = await this.db.query(`
                SELECT severity, confidence
                FROM detection_history
                WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
                ORDER BY created_at DESC
                LIMIT 5
            `, [userId]);

            let recentDetectionSeverity = 0;
            let recentDetectionConfidence = 0;
            
            if (detectionResult.rows.length > 0) {
                recentDetectionSeverity = detectionResult.rows.reduce((sum, d) => sum + d.severity, 0) / detectionResult.rows.length;
                recentDetectionConfidence = detectionResult.rows.reduce((sum, d) => sum + d.confidence, 0) / detectionResult.rows.length;
            }

            return {
                riskLevel,
                previousCrises: Math.min(previousCrises / 10, 1), // Cap at 10 crises
                daysSinceLastCrisis: Math.min(daysSinceLastCrisis / 365, 1), // Normalize to years
                highRiskFlag,
                recentDetectionSeverity: recentDetectionSeverity / 10, // Normalize to 0-1
                recentDetectionConfidence,
                hasActiveContacts: 1, // Assume true for now
                treatmentCompliance: 0.8 // Default good compliance
            };

        } catch (error) {
            logger.error('Error extracting contextual features:', error);
            return {
                riskLevel: 0.5,
                previousCrises: 0,
                daysSinceLastCrisis: 1,
                highRiskFlag: 0,
                recentDetectionSeverity: 0,
                recentDetectionConfidence: 0,
                hasActiveContacts: 1,
                treatmentCompliance: 0.8
            };
        }
    }

    async extractHistoricalFeatures(userId) {
        try {
            // Get historical crisis patterns
            const historyResult = await this.db.query(`
                SELECT 
                    COUNT(*) as total_crises,
                    AVG(severity) as avg_severity,
                    MAX(detected_at) as last_crisis,
                    COUNT(CASE WHEN detected_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_crises
                FROM crisis_events
                WHERE user_id = $1
            `, [userId]);

            const history = historyResult.rows[0] || {};
            
            // Get intervention success rate
            const interventionResult = await this.db.query(`
                SELECT 
                    COUNT(*) as total_interventions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_interventions
                FROM crisis_responses cr
                JOIN crisis_events ce ON cr.crisis_event_id = ce.id
                WHERE ce.user_id = $1
            `, [userId]);

            const interventions = interventionResult.rows[0] || {};
            
            return {
                crisisFrequency: Math.min((history.total_crises || 0) / 12, 1), // Per year, capped at 1
                avgSeverity: (history.avg_severity || 0) / 10,
                recentCrisisCount: Math.min((history.recent_crises || 0) / 5, 1),
                interventionSuccess: interventions.total_interventions > 0 ? 
                    interventions.successful_interventions / interventions.total_interventions : 0.5
            };

        } catch (error) {
            logger.error('Error extracting historical features:', error);
            return {
                crisisFrequency: 0,
                avgSeverity: 0,
                recentCrisisCount: 0,
                interventionSuccess: 0.5
            };
        }
    }

    async extractSequentialFeatures(userId) {
        try {
            // Get 7 days of sequential data for pattern recognition
            const result = await this.db.query(`
                SELECT 
                    DATE(created_at) as date,
                    AVG(mood_score) as mood,
                    AVG(anxiety_level) as anxiety,
                    COUNT(*) as checkin_count,
                    MAX(CASE WHEN notes IS NOT NULL THEN 1 ELSE 0 END) as has_notes
                FROM safety_checkins
                WHERE user_id = $1 AND created_at > NOW() - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY date DESC
                LIMIT 7
            `, [userId]);

            const sequentialData = [];
            const today = new Date();
            
            // Fill in 7 days of data
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                
                const dayData = result.rows.find(r => r.date.toISOString().split('T')[0] === dateStr);
                
                if (dayData) {
                    sequentialData.push([
                        this.normalize(dayData.mood || 5, this.normalizationParams.mood),
                        this.normalize(dayData.anxiety || 5, this.normalizationParams.anxiety),
                        Math.min(dayData.checkin_count / 3, 1), // Normalize checkin count
                        dayData.has_notes ? 1 : 0,
                        date.getDay() / 6, // Day of week
                        0, // Placeholder for additional features
                        0, 0, 0, 0, 0, // More placeholders to reach inputSize
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0 // Total 20 features
                    ]);
                } else {
                    // Fill with default values for missing days
                    sequentialData.push(new Array(20).fill(0.5));
                }
            }

            return sequentialData;

        } catch (error) {
            logger.error('Error extracting sequential features:', error);
            // Return default sequential data
            return new Array(7).fill(null).map(() => new Array(20).fill(0.5));
        }
    }

    async predictRiskScore(features) {
        try {
            const model = this.models.get('riskAssessment');
            if (!model) {
                throw new Error('Risk assessment model not available');
            }

            // Ensure we have the right number of features
            const inputFeatures = features.slice(0, this.modelConfig.riskAssessment.inputSize);
            while (inputFeatures.length < this.modelConfig.riskAssessment.inputSize) {
                inputFeatures.push(0.5); // Default value
            }

            const inputTensor = tf.tensor2d([inputFeatures]);
            const prediction = model.predict(inputTensor);
            const score = await prediction.data();
            
            inputTensor.dispose();
            prediction.dispose();

            return {
                score: score[0],
                confidence: score[0] > this.modelConfig.riskAssessment.threshold ? 
                    Math.min(score[0] * 1.2, 1) : score[0] * 0.8
            };

        } catch (error) {
            logger.error('Error predicting risk score:', error);
            return {
                score: 0.5,
                confidence: 0.3
            };
        }
    }

    async predictPatterns(userId, sequentialFeatures) {
        try {
            const model = this.models.get('patternRecognition');
            if (!model) {
                throw new Error('Pattern recognition model not available');
            }

            const inputTensor = tf.tensor3d([sequentialFeatures]);
            const prediction = model.predict(inputTensor);
            const patterns = await prediction.data();
            
            inputTensor.dispose();
            prediction.dispose();

            return {
                crisisRisk: patterns[0],
                interventionNeed: patterns[1],
                stabilityScore: patterns[2]
            };

        } catch (error) {
            logger.error('Error predicting patterns:', error);
            return {
                crisisRisk: 0.5,
                interventionNeed: 0.5,
                stabilityScore: 0.5
            };
        }
    }

    async recommendInterventions(features) {
        try {
            const model = this.models.get('interventionRecommendation');
            if (!model) {
                throw new Error('Intervention recommendation model not available');
            }

            const inputTensor = tf.tensor2d([features]);
            const prediction = model.predict(inputTensor);
            const scores = await prediction.data();
            
            inputTensor.dispose();
            prediction.dispose();

            // Convert scores to recommendations
            const recommendations = [];
            for (let i = 0; i < scores.length; i++) {
                if (scores[i] > 0.3) { // Threshold for recommendation
                    recommendations.push({
                        type: this.interventionTypes[i],
                        score: scores[i],
                        priority: this.categorizePriority(scores[i]),
                        description: this.getInterventionDescription(this.interventionTypes[i])
                    });
                }
            }

            // Sort by score
            recommendations.sort((a, b) => b.score - a.score);

            return {
                recommendations: recommendations.slice(0, 3), // Top 3 recommendations
                totalScore: scores.reduce((sum, score) => sum + score, 0)
            };

        } catch (error) {
            logger.error('Error recommending interventions:', error);
            return {
                recommendations: [{
                    type: 'immediate_crisis_support',
                    score: 0.8,
                    priority: 'high',
                    description: 'Immediate crisis support and safety assessment'
                }],
                totalScore: 0.8
            };
        }
    }

    // Utility methods

    normalize(value, params) {
        return (value - params.mean) / params.std;
    }

    calculateVariability(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        let trend = 0;
        for (let i = 1; i < values.length; i++) {
            trend += values[i] - values[i-1];
        }
        return trend / (values.length - 1);
    }

    categorizeRisk(score) {
        if (score >= 0.8) return 'critical';
        if (score >= 0.6) return 'high';
        if (score >= 0.4) return 'moderate';
        if (score >= 0.2) return 'low';
        return 'minimal';
    }

    categorizePriority(score) {
        if (score >= 0.7) return 'urgent';
        if (score >= 0.5) return 'high';
        if (score >= 0.3) return 'medium';
        return 'low';
    }

    getInterventionDescription(type) {
        const descriptions = {
            immediate_crisis_support: 'Immediate crisis support and safety assessment',
            counseling_referral: 'Professional counseling or therapy referral',
            medication_review: 'Review current medications with healthcare provider',
            peer_support_connection: 'Connect with peer support groups or mentors',
            safety_plan_update: 'Update and review personal safety plan',
            activity_engagement: 'Engage in therapeutic activities and hobbies',
            family_notification: 'Notify family members or close friends',
            professional_followup: 'Schedule follow-up with mental health professional'
        };
        
        return descriptions[type] || 'Intervention recommendation';
    }

    async storePrediction(prediction) {
        try {
            // Store in database
            await this.db.query(`
                INSERT INTO user_risk_profiles (
                    user_id, risk_score, risk_factors, last_crisis_date,
                    high_risk_flag, updated_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    risk_score = EXCLUDED.risk_score,
                    risk_factors = EXCLUDED.risk_factors,
                    high_risk_flag = EXCLUDED.high_risk_flag,
                    updated_at = NOW()
            `, [
                prediction.userId,
                prediction.riskScore,
                JSON.stringify({
                    patterns: prediction.patterns,
                    interventions: prediction.interventions.map(i => i.type),
                    features: prediction.features
                }),
                prediction.riskLevel === 'critical' ? new Date() : null,
                prediction.riskLevel === 'critical' || prediction.riskLevel === 'high'
            ]);

            // Cache prediction in Redis
            await this.redis.recordPerformanceMetric('prediction', prediction.riskScore, {
                userId: prediction.userId,
                riskLevel: prediction.riskLevel,
                confidence: prediction.confidence
            });

        } catch (error) {
            logger.error('Error storing prediction:', error);
        }
    }

    async retrainModels() {
        try {
            logger.info('Starting model retraining...');
            
            // This would involve collecting new training data
            // and retraining the models with updated patterns
            
            // For now, just log that retraining would occur
            logger.info('Model retraining scheduled - implementation pending');
            
        } catch (error) {
            logger.error('Error during model retraining:', error);
        }
    }

    // Performance tracking
    updateAccuracy(predicted, actual) {
        if (predicted >= 0.5 && actual >= 0.5) {
            this.accuracyTracking.truePositives++;
        } else if (predicted >= 0.5 && actual < 0.5) {
            this.accuracyTracking.falsePositives++;
        } else if (predicted < 0.5 && actual < 0.5) {
            this.accuracyTracking.trueNegatives++;
        } else {
            this.accuracyTracking.falseNegatives++;
        }
    }

    getPerformanceMetrics() {
        const total = Object.values(this.accuracyTracking).reduce((sum, val) => sum + val, 0);
        
        if (total === 0) {
            return {
                accuracy: 0,
                precision: 0,
                recall: 0,
                f1Score: 0
            };
        }

        const accuracy = (this.accuracyTracking.truePositives + this.accuracyTracking.trueNegatives) / total;
        const precision = this.accuracyTracking.truePositives / 
            (this.accuracyTracking.truePositives + this.accuracyTracking.falsePositives);
        const recall = this.accuracyTracking.truePositives / 
            (this.accuracyTracking.truePositives + this.accuracyTracking.falseNegatives);
        const f1Score = 2 * (precision * recall) / (precision + recall);

        return {
            accuracy: accuracy || 0,
            precision: precision || 0,
            recall: recall || 0,
            f1Score: f1Score || 0,
            totalPredictions: this.predictionCount
        };
    }

    async close() {
        logger.info('Closing ML Prediction Service...');
        
        // Dispose of TensorFlow models
        for (const [name, model] of this.models.entries()) {
            if (model && model.dispose) {
                model.dispose();
            }
        }
        
        this.models.clear();
        this.userBaselines.clear();
        
        logger.info('ML Prediction Service closed');
    }
}

module.exports = PredictionService;
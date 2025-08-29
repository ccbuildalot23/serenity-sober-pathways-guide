/**
 * Real-Time Crisis Detection Engine
 * Advanced multi-modal crisis detection with sub-500ms response time
 */

const EventEmitter = require('events');
// Make TensorFlow optional for development
let tf;
try {
    tf = require('@tensorflow/tfjs-node');
} catch (err) {
    console.warn('TensorFlow not available - ML detection features disabled');
    tf = null;
}
const Sentiment = require('sentiment');
const logger = require('../utils/logger');
const config = require('../config/config');
const { getRedisClient } = require('../cache/redis');

class CrisisDetectionEngine extends EventEmitter {
    constructor() {
        super();
        this.initialized = false;
        this.models = new Map();
        this.sentiment = new Sentiment();
        this.redis = null;
        this.voiceAnalyzer = null;
        this.biometricThresholds = config.biometric;
        this.confidenceThreshold = config.ml.confidenceThreshold;
        
        // Detection history for pattern analysis
        this.detectionHistory = new Map(); // userId -> detection events
        this.behaviorBaselines = new Map(); // userId -> baseline patterns
        
        // Performance metrics
        this.metrics = {
            totalDetections: 0,
            averageResponseTime: 0,
            falsePositives: 0,
            missedCrises: 0
        };
    }

    async initialize() {
        try {
            logger.info('Initializing Crisis Detection Engine...');
            
            // Connect to Redis for caching and pub/sub
            this.redis = getRedisClient();
            
            // Initialize ML models
            await this.loadModels();
            
            // Initialize voice analysis
            await this.initializeVoiceAnalysis();
            
            // Load user baselines
            await this.loadUserBaselines();
            
            // Start background monitoring
            this.startBackgroundMonitoring();
            
            this.initialized = true;
            logger.info('Crisis Detection Engine initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Crisis Detection Engine:', error);
            throw error;
        }
    }

    async loadModels() {
        try {
            // Load sentiment analysis model (enhanced)
            this.models.set('sentiment', this.sentiment);
            
            // Load behavioral pattern detection model
            try {
                const behaviorModel = await tf.loadLayersModel(`file://${config.ml.modelPath}/behavior-model/model.json`);
                this.models.set('behavior', behaviorModel);
                logger.info('Behavioral pattern model loaded');
            } catch (error) {
                logger.warn('Behavioral pattern model not found, using rule-based detection');
                this.models.set('behavior', null);
            }
            
            // Load voice stress detection model
            try {
                const voiceModel = await tf.loadLayersModel(`file://${config.ml.modelPath}/voice-stress/model.json`);
                this.models.set('voice', voiceModel);
                logger.info('Voice stress detection model loaded');
            } catch (error) {
                logger.warn('Voice stress model not found, using keyword-based detection');
                this.models.set('voice', null);
            }
            
            // Load biometric anomaly detection model
            try {
                const biometricModel = await tf.loadLayersModel(`file://${config.ml.modelPath}/biometric-anomaly/model.json`);
                this.models.set('biometric', biometricModel);
                logger.info('Biometric anomaly model loaded');
            } catch (error) {
                logger.warn('Biometric model not found, using threshold-based detection');
                this.models.set('biometric', null);
            }
            
        } catch (error) {
            logger.error('Error loading ML models:', error);
            throw error;
        }
    }

    async initializeVoiceAnalysis() {
        // Initialize voice analysis capabilities
        this.voiceKeywords = {
            crisis: [
                'help me', 'i want to die', 'kill myself', 'end it all', 'can\'t go on',
                'no point', 'better off dead', 'hurt myself', 'suicidal', 'suicide',
                'hopeless', 'worthless', 'trapped', 'pain', 'suffering', 'desperate'
            ],
            stress: [
                'anxious', 'panic', 'overwhelmed', 'scared', 'terrified', 'stressed',
                'can\'t breathe', 'heart racing', 'shaking', 'dizzy', 'nauseous'
            ],
            substance: [
                'relapse', 'using again', 'drank', 'high', 'pills', 'drugs',
                'couldn\'t resist', 'gave in', 'messed up', 'failed'
            ]
        };
        
        logger.info('Voice analysis keywords initialized');
    }

    async loadUserBaselines() {
        try {
            // Load user behavioral baselines from Redis
            const baselineKeys = await this.redis.keys('baseline:*');
            
            for (const key of baselineKeys) {
                const userId = key.replace('baseline:', '');
                const baseline = await this.redis.hgetall(key);
                
                if (baseline && Object.keys(baseline).length > 0) {
                    this.behaviorBaselines.set(userId, {
                        avgCheckinTime: parseInt(baseline.avgCheckinTime) || null,
                        avgSleepHours: parseFloat(baseline.avgSleepHours) || null,
                        avgHeartRate: parseFloat(baseline.avgHeartRate) || null,
                        avgMoodScore: parseFloat(baseline.avgMoodScore) || null,
                        avgActivityLevel: parseFloat(baseline.avgActivityLevel) || null,
                        lastUpdated: new Date(baseline.lastUpdated || Date.now())
                    });
                }
            }
            
            logger.info(`Loaded baselines for ${this.behaviorBaselines.size} users`);
        } catch (error) {
            logger.error('Error loading user baselines:', error);
        }
    }

    startBackgroundMonitoring() {
        // Monitor for missed check-ins
        setInterval(() => {
            this.checkMissedCheckins();
        }, 60000); // Check every minute
        
        // Update performance metrics
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 300000); // Every 5 minutes
        
        logger.info('Background monitoring started');
    }

    /**
     * Main detection method - analyzes multiple inputs for crisis indicators
     */
    async detectCrisis(input) {
        const startTime = Date.now();
        
        try {
            const {
                userId,
                type, // 'voice', 'text', 'behavioral', 'biometric', 'mixed'
                data,
                metadata = {}
            } = input;
            
            logger.debug(`Starting crisis detection for user ${userId}, type: ${type}`);
            
            const detectionResults = {
                userId,
                timestamp: new Date(),
                type,
                severity: 0, // 0-10 scale
                confidence: 0, // 0-1 scale
                indicators: [],
                riskFactors: [],
                recommendations: [],
                responseTime: 0
            };
            
            // Run parallel detection based on input type
            const detectionPromises = [];
            
            if (type === 'voice' || type === 'mixed') {
                detectionPromises.push(this.analyzeVoice(data.voice, userId));
            }
            
            if (type === 'text' || type === 'mixed') {
                detectionPromises.push(this.analyzeText(data.text, userId));
            }
            
            if (type === 'behavioral' || type === 'mixed') {
                detectionPromises.push(this.analyzeBehavior(data.behavioral, userId));
            }
            
            if (type === 'biometric' || type === 'mixed') {
                detectionPromises.push(this.analyzeBiometric(data.biometric, userId));
            }
            
            // Wait for all analyses to complete
            const analyses = await Promise.all(detectionPromises);
            
            // Combine results
            for (const analysis of analyses) {
                if (analysis) {
                    detectionResults.severity = Math.max(detectionResults.severity, analysis.severity);
                    detectionResults.confidence = Math.max(detectionResults.confidence, analysis.confidence);
                    detectionResults.indicators.push(...analysis.indicators);
                    detectionResults.riskFactors.push(...analysis.riskFactors);
                    detectionResults.recommendations.push(...analysis.recommendations);
                }
            }
            
            // Apply user-specific context
            await this.applyUserContext(detectionResults, userId);
            
            // Calculate final response time
            detectionResults.responseTime = Date.now() - startTime;
            
            // Store detection result
            await this.storeDetectionResult(detectionResults);
            
            // Check if crisis threshold is met
            if (this.isCrisisDetected(detectionResults)) {
                logger.crisis('Crisis detected', detectionResults.severity, {
                    userId: detectionResults.userId,
                    confidence: detectionResults.confidence,
                    responseTime: detectionResults.responseTime,
                    indicators: detectionResults.indicators
                });
                
                // Emit crisis event
                this.emit('crisis-detected', detectionResults);
            }
            
            // Update metrics
            this.metrics.totalDetections++;
            this.updateAverageResponseTime(detectionResults.responseTime);
            
            logger.performance('Crisis detection', detectionResults.responseTime, {
                userId,
                type,
                severity: detectionResults.severity,
                confidence: detectionResults.confidence
            });
            
            return detectionResults;
            
        } catch (error) {
            logger.error('Error in crisis detection:', error);
            throw error;
        }
    }

    async analyzeVoice(voiceData, userId) {
        if (!voiceData) return null;
        
        const analysis = {
            severity: 0,
            confidence: 0,
            indicators: [],
            riskFactors: [],
            recommendations: []
        };
        
        try {
            // Transcription analysis (keyword-based)
            if (voiceData.transcription) {
                const text = voiceData.transcription.toLowerCase();
                
                // Check for crisis keywords
                for (const [category, keywords] of Object.entries(this.voiceKeywords)) {
                    const matches = keywords.filter(keyword => text.includes(keyword));
                    if (matches.length > 0) {
                        const severityBoost = category === 'crisis' ? 8 : category === 'stress' ? 5 : 3;
                        analysis.severity = Math.max(analysis.severity, severityBoost);
                        analysis.confidence = Math.min(1, analysis.confidence + 0.3 * matches.length);
                        
                        analysis.indicators.push({
                            type: 'voice-keyword',
                            category,
                            matches,
                            severity: severityBoost
                        });
                    }
                }
            }
            
            // Audio feature analysis (if model available)
            const voiceModel = this.models.get('voice');
            if (voiceModel && voiceData.features) {
                const features = tf.tensor2d([voiceData.features]);
                const prediction = voiceModel.predict(features);
                const stressLevel = await prediction.data();
                features.dispose();
                prediction.dispose();
                
                if (stressLevel[0] > 0.7) {
                    analysis.severity = Math.max(analysis.severity, 6);
                    analysis.confidence = Math.max(analysis.confidence, stressLevel[0]);
                    analysis.indicators.push({
                        type: 'voice-stress',
                        level: stressLevel[0],
                        severity: 6
                    });
                }
            }
            
            // Voice pattern analysis
            if (voiceData.patterns) {
                const { pitch, tempo, volume } = voiceData.patterns;
                
                // Abnormal pitch patterns
                if (pitch && (pitch.variance > 100 || pitch.average < 80 || pitch.average > 300)) {
                    analysis.severity = Math.max(analysis.severity, 4);
                    analysis.confidence += 0.2;
                    analysis.indicators.push({
                        type: 'voice-pitch-anomaly',
                        pitch,
                        severity: 4
                    });
                }
                
                // Rapid or slow speech
                if (tempo && (tempo < 120 || tempo > 200)) {
                    analysis.severity = Math.max(analysis.severity, 3);
                    analysis.confidence += 0.1;
                    analysis.indicators.push({
                        type: 'voice-tempo-anomaly',
                        tempo,
                        severity: 3
                    });
                }
            }
            
            // Add recommendations
            if (analysis.severity > 5) {
                analysis.recommendations.push({
                    type: 'immediate-support',
                    message: 'Consider immediate crisis intervention'
                });
            }
            
        } catch (error) {
            logger.error('Error in voice analysis:', error);
        }
        
        return analysis;
    }

    async analyzeText(textData, userId) {
        if (!textData) return null;
        
        const analysis = {
            severity: 0,
            confidence: 0,
            indicators: [],
            riskFactors: [],
            recommendations: []
        };
        
        try {
            const text = textData.toLowerCase();
            
            // Sentiment analysis
            const sentimentResult = this.sentiment.analyze(text);
            
            if (sentimentResult.score < -5) {
                analysis.severity = Math.max(analysis.severity, 7);
                analysis.confidence += 0.4;
                analysis.indicators.push({
                    type: 'negative-sentiment',
                    score: sentimentResult.score,
                    severity: 7
                });
            } else if (sentimentResult.score < -2) {
                analysis.severity = Math.max(analysis.severity, 4);
                analysis.confidence += 0.2;
                analysis.indicators.push({
                    type: 'negative-sentiment',
                    score: sentimentResult.score,
                    severity: 4
                });
            }
            
            // Crisis keyword detection
            for (const [category, keywords] of Object.entries(this.voiceKeywords)) {
                const matches = keywords.filter(keyword => text.includes(keyword));
                if (matches.length > 0) {
                    const severityBoost = category === 'crisis' ? 9 : category === 'stress' ? 6 : 4;
                    analysis.severity = Math.max(analysis.severity, severityBoost);
                    analysis.confidence = Math.min(1, analysis.confidence + 0.4 * matches.length);
                    
                    analysis.indicators.push({
                        type: 'text-keyword',
                        category,
                        matches,
                        severity: severityBoost
                    });
                }
            }
            
            // Text pattern analysis
            const urgencyWords = ['urgent', 'emergency', 'now', 'immediately', 'asap', 'help'];
            const urgencyMatches = urgencyWords.filter(word => text.includes(word));
            
            if (urgencyMatches.length > 0) {
                analysis.severity = Math.max(analysis.severity, 5);
                analysis.confidence += 0.2;
                analysis.indicators.push({
                    type: 'urgency-words',
                    matches: urgencyMatches,
                    severity: 5
                });
            }
            
        } catch (error) {
            logger.error('Error in text analysis:', error);
        }
        
        return analysis;
    }

    async analyzeBehavior(behaviorData, userId) {
        if (!behaviorData) return null;
        
        const analysis = {
            severity: 0,
            confidence: 0,
            indicators: [],
            riskFactors: [],
            recommendations: []
        };
        
        try {
            const baseline = this.behaviorBaselines.get(userId);
            
            // Check missed check-ins
            if (behaviorData.missedCheckins > 0) {
                const severity = Math.min(8, 3 + behaviorData.missedCheckins * 2);
                analysis.severity = Math.max(analysis.severity, severity);
                analysis.confidence += 0.3;
                analysis.indicators.push({
                    type: 'missed-checkins',
                    count: behaviorData.missedCheckins,
                    severity
                });
            }
            
            // Activity level changes
            if (baseline && behaviorData.activityLevel !== undefined) {
                const activityChange = Math.abs(behaviorData.activityLevel - baseline.avgActivityLevel) / baseline.avgActivityLevel;
                
                if (activityChange > 0.5) { // 50% change
                    const severity = activityChange > 0.8 ? 6 : 4;
                    analysis.severity = Math.max(analysis.severity, severity);
                    analysis.confidence += 0.2;
                    analysis.indicators.push({
                        type: 'activity-change',
                        change: activityChange,
                        current: behaviorData.activityLevel,
                        baseline: baseline.avgActivityLevel,
                        severity
                    });
                }
            }
            
            // Sleep pattern disruption
            if (baseline && behaviorData.sleepHours !== undefined) {
                const sleepChange = Math.abs(behaviorData.sleepHours - baseline.avgSleepHours);
                
                if (sleepChange > 3 || behaviorData.sleepHours < this.biometricThresholds.sleepHoursMin) {
                    const severity = behaviorData.sleepHours < 3 ? 7 : 5;
                    analysis.severity = Math.max(analysis.severity, severity);
                    analysis.confidence += 0.25;
                    analysis.indicators.push({
                        type: 'sleep-disruption',
                        hours: behaviorData.sleepHours,
                        baseline: baseline.avgSleepHours,
                        severity
                    });
                }
            }
            
            // Mood deterioration
            if (baseline && behaviorData.moodScore !== undefined) {
                const moodDrop = baseline.avgMoodScore - behaviorData.moodScore;
                
                if (moodDrop > 3) {
                    const severity = moodDrop > 5 ? 8 : 6;
                    analysis.severity = Math.max(analysis.severity, severity);
                    analysis.confidence += 0.3;
                    analysis.indicators.push({
                        type: 'mood-deterioration',
                        current: behaviorData.moodScore,
                        baseline: baseline.avgMoodScore,
                        drop: moodDrop,
                        severity
                    });
                }
            }
            
            // Social isolation indicators
            if (behaviorData.socialInteractions !== undefined && behaviorData.socialInteractions < 2) {
                analysis.severity = Math.max(analysis.severity, 4);
                analysis.confidence += 0.15;
                analysis.indicators.push({
                    type: 'social-isolation',
                    interactions: behaviorData.socialInteractions,
                    severity: 4
                });
            }
            
        } catch (error) {
            logger.error('Error in behavior analysis:', error);
        }
        
        return analysis;
    }

    async analyzeBiometric(biometricData, userId) {
        if (!biometricData) return null;
        
        const analysis = {
            severity: 0,
            confidence: 0,
            indicators: [],
            riskFactors: [],
            recommendations: []
        };
        
        try {
            // Heart rate analysis
            if (biometricData.heartRate) {
                const { average, variability, resting } = biometricData.heartRate;
                
                // Abnormal heart rate
                if (average > this.biometricThresholds.heartRate.high || 
                    average < this.biometricThresholds.heartRate.low) {
                    const severity = average > 150 || average < 40 ? 8 : 5;
                    analysis.severity = Math.max(analysis.severity, severity);
                    analysis.confidence += 0.3;
                    analysis.indicators.push({
                        type: 'abnormal-heart-rate',
                        rate: average,
                        severity
                    });
                }
                
                // Low heart rate variability (stress indicator)
                if (variability < 20) {
                    analysis.severity = Math.max(analysis.severity, 4);
                    analysis.confidence += 0.2;
                    analysis.indicators.push({
                        type: 'low-hrv',
                        hrv: variability,
                        severity: 4
                    });
                }
            }
            
            // Sleep quality
            if (biometricData.sleep) {
                const { quality, duration, interruptions } = biometricData.sleep;
                
                if (quality < 0.6 || duration < this.biometricThresholds.sleepHoursMin) {
                    const severity = quality < 0.4 ? 6 : 4;
                    analysis.severity = Math.max(analysis.severity, severity);
                    analysis.confidence += 0.25;
                    analysis.indicators.push({
                        type: 'poor-sleep',
                        quality,
                        duration,
                        severity
                    });
                }
                
                if (interruptions > 10) {
                    analysis.severity = Math.max(analysis.severity, 3);
                    analysis.confidence += 0.15;
                    analysis.indicators.push({
                        type: 'sleep-interruptions',
                        count: interruptions,
                        severity: 3
                    });
                }
            }
            
            // Stress indicators
            if (biometricData.stressLevel > 0.8) {
                analysis.severity = Math.max(analysis.severity, 7);
                analysis.confidence += 0.4;
                analysis.indicators.push({
                    type: 'high-stress',
                    level: biometricData.stressLevel,
                    severity: 7
                });
            }
            
        } catch (error) {
            logger.error('Error in biometric analysis:', error);
        }
        
        return analysis;
    }

    async applyUserContext(detectionResults, userId) {
        try {
            // Get user history and risk factors from Redis
            const userHistory = await this.redis.hgetall(`user:${userId}:history`);
            const riskProfile = await this.redis.hgetall(`user:${userId}:risk`);
            
            // Apply historical context
            if (userHistory.previousCrises) {
                const crisisCount = parseInt(userHistory.previousCrises);
                if (crisisCount > 0) {
                    detectionResults.confidence *= (1 + crisisCount * 0.1); // Increase confidence
                    detectionResults.riskFactors.push({
                        type: 'crisis-history',
                        count: crisisCount
                    });
                }
            }
            
            // Apply risk profile
            if (riskProfile.highRisk === 'true') {
                detectionResults.severity = Math.min(10, detectionResults.severity + 1);
                detectionResults.confidence *= 1.2;
                detectionResults.riskFactors.push({
                    type: 'high-risk-profile'
                });
            }
            
            // Recent pattern analysis
            const recentDetections = this.detectionHistory.get(userId) || [];
            const recentCrisisCount = recentDetections.filter(d => 
                d.timestamp > Date.now() - 24 * 60 * 60 * 1000 && d.severity > 6
            ).length;
            
            if (recentCrisisCount > 1) {
                detectionResults.severity = Math.min(10, detectionResults.severity + 2);
                detectionResults.riskFactors.push({
                    type: 'recent-crisis-pattern',
                    count: recentCrisisCount
                });
            }
            
        } catch (error) {
            logger.error('Error applying user context:', error);
        }
    }

    isCrisisDetected(detectionResults) {
        // Crisis thresholds
        const severityThreshold = 7;
        const confidenceThreshold = this.confidenceThreshold;
        
        return detectionResults.severity >= severityThreshold && 
               detectionResults.confidence >= confidenceThreshold;
    }

    async storeDetectionResult(result) {
        try {
            // Store in Redis for quick access
            const key = `detection:${result.userId}:${result.timestamp.getTime()}`;
            await this.redis.hset(key, {
                severity: result.severity,
                confidence: result.confidence,
                type: result.type,
                indicators: JSON.stringify(result.indicators),
                responseTime: result.responseTime
            });
            
            // Set expiry (7 days)
            await this.redis.expire(key, 7 * 24 * 60 * 60);
            
            // Update user detection history
            const userHistory = this.detectionHistory.get(result.userId) || [];
            userHistory.push({
                timestamp: result.timestamp.getTime(),
                severity: result.severity,
                confidence: result.confidence,
                type: result.type
            });
            
            // Keep only last 100 detections per user
            if (userHistory.length > 100) {
                userHistory.splice(0, userHistory.length - 100);
            }
            
            this.detectionHistory.set(result.userId, userHistory);
            
        } catch (error) {
            logger.error('Error storing detection result:', error);
        }
    }

    async checkMissedCheckins() {
        try {
            // Get users who should have checked in
            const userKeys = await this.redis.keys('user:*:lastCheckin');
            const now = Date.now();
            const checkinThreshold = 24 * 60 * 60 * 1000; // 24 hours
            
            for (const key of userKeys) {
                const userId = key.split(':')[1];
                const lastCheckin = parseInt(await this.redis.get(key)) || 0;
                
                if (now - lastCheckin > checkinThreshold) {
                    const missedHours = Math.floor((now - lastCheckin) / (60 * 60 * 1000));
                    
                    // Trigger behavioral analysis for missed check-in
                    await this.detectCrisis({
                        userId,
                        type: 'behavioral',
                        data: {
                            behavioral: {
                                missedCheckins: Math.floor(missedHours / 24) + 1
                            }
                        }
                    });
                }
            }
            
        } catch (error) {
            logger.error('Error checking missed check-ins:', error);
        }
    }

    updateAverageResponseTime(responseTime) {
        const totalResponses = this.metrics.totalDetections;
        this.metrics.averageResponseTime = 
            ((this.metrics.averageResponseTime * (totalResponses - 1)) + responseTime) / totalResponses;
    }

    updatePerformanceMetrics() {
        logger.info('Crisis Detection Engine Performance Metrics', {
            totalDetections: this.metrics.totalDetections,
            averageResponseTime: Math.round(this.metrics.averageResponseTime),
            activeUsers: this.detectionHistory.size,
            modelsLoaded: this.models.size
        });
    }

    async close() {
        logger.info('Closing Crisis Detection Engine...');
        
        // Dispose of TensorFlow models
        for (const [name, model] of this.models.entries()) {
            if (model && model.dispose) {
                model.dispose();
            }
        }
        
        // Clear data structures
        this.detectionHistory.clear();
        this.behaviorBaselines.clear();
        
        logger.info('Crisis Detection Engine closed');
    }
}

module.exports = CrisisDetectionEngine;
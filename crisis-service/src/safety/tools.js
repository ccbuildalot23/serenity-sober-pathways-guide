/**
 * Safety Features and Coping Tools Service
 * Comprehensive safety planning, coping resources, and intervention tools
 */

const EventEmitter = require('events');
const cron = require('node-cron');
const logger = require('../utils/logger');
const config = require('../config/config');
const { getDatabaseConnection } = require('../database/connection');
const { getRedisManager } = require('../cache/redis');

class SafetyToolsService extends EventEmitter {
    constructor() {
        super();
        this.db = null;
        this.redis = null;
        this.isInitialized = false;
        
        // Coping resource categories
        this.copingCategories = {
            breathing: 'Breathing Exercises',
            grounding: 'Grounding Techniques',
            distraction: 'Distraction Activities',
            mindfulness: 'Mindfulness & Meditation',
            physical: 'Physical Activities',
            creative: 'Creative Expression',
            social: 'Social Connection',
            professional: 'Professional Resources'
        };
        
        // Default coping resources
        this.defaultCopingResources = [
            {
                category: 'breathing',
                title: '4-7-8 Breathing Technique',
                description: 'A calming breathing pattern to reduce anxiety and promote relaxation',
                content: {
                    instructions: [
                        'Sit comfortably with your back straight',
                        'Exhale completely through your mouth',
                        'Close your mouth and inhale through your nose for 4 counts',
                        'Hold your breath for 7 counts',
                        'Exhale through your mouth for 8 counts',
                        'Repeat 3-4 cycles'
                    ],
                    duration: 4,
                    audio_guide: '/audio/478-breathing.mp3'
                },
                duration_minutes: 5,
                difficulty_level: 1
            },
            {
                category: 'grounding',
                title: '5-4-3-2-1 Grounding Exercise',
                description: 'Use your senses to ground yourself in the present moment',
                content: {
                    instructions: [
                        'Name 5 things you can see around you',
                        'Name 4 things you can touch',
                        'Name 3 things you can hear',
                        'Name 2 things you can smell',
                        'Name 1 thing you can taste'
                    ],
                    tips: 'Take your time with each step and really focus on the sensations'
                },
                duration_minutes: 10,
                difficulty_level: 1
            },
            {
                category: 'mindfulness',
                title: 'Body Scan Meditation',
                description: 'Progressive relaxation focusing on different parts of your body',
                content: {
                    instructions: [
                        'Lie down or sit comfortably',
                        'Close your eyes and take deep breaths',
                        'Start at the top of your head',
                        'Slowly move attention down through your body',
                        'Notice any tension and consciously relax each area',
                        'End at your toes'
                    ],
                    audio_guide: '/audio/body-scan-meditation.mp3'
                },
                duration_minutes: 15,
                difficulty_level: 2
            },
            {
                category: 'distraction',
                title: 'Progressive Counting',
                description: 'Mathematical distraction to redirect anxious thoughts',
                content: {
                    instructions: [
                        'Count backwards from 100 by 7s',
                        'Or count by 3s starting from 0',
                        'Focus entirely on the numbers',
                        'If you lose track, start over',
                        'Continue until you feel calmer'
                    ]
                },
                duration_minutes: 10,
                difficulty_level: 1
            }
        ];
        
        // Safety plan templates
        this.safetyPlanTemplate = {
            warning_signs: [
                'Feeling hopeless or trapped',
                'Increased anxiety or panic',
                'Thoughts of self-harm',
                'Social isolation',
                'Sleep disturbances',
                'Substance use urges'
            ],
            coping_strategies: [
                'Call a trusted friend or family member',
                'Use breathing exercises',
                'Go for a walk outside',
                'Listen to calming music',
                'Practice grounding techniques',
                'Write in a journal'
            ],
            environmental_safety: [
                'Remove or secure potentially harmful items',
                'Stay in public or safe spaces when distressed',
                'Avoid trigger locations',
                'Have emergency numbers easily accessible'
            ]
        };
        
        // Performance metrics
        this.toolUsageStats = {
            totalSessions: 0,
            averageEffectiveness: 0,
            mostUsedTools: new Map(),
            crisisPreventions: 0
        };
    }

    async initialize() {
        try {
            logger.info('Initializing Safety Tools Service...');
            
            this.db = getDatabaseConnection();
            this.redis = getRedisManager();
            
            // Initialize default coping resources
            await this.initializeDefaultResources();
            
            // Load user safety plans
            await this.loadUserSafetyPlans();
            
            // Setup safety check-in reminders
            this.setupSafetyCheckins();
            
            // Start background monitoring
            this.startBackgroundMonitoring();
            
            this.isInitialized = true;
            logger.info('Safety Tools Service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Safety Tools Service:', error);
            throw error;
        }
    }

    async initializeDefaultResources() {
        try {
            // Check if default resources are already installed
            const existingResources = await this.db.query(`
                SELECT COUNT(*) as count FROM coping_resources WHERE is_active = true
            `);

            if (existingResources.rows[0].count > 0) {
                logger.info('Coping resources already exist, skipping initialization');
                return;
            }

            // Install default coping resources
            for (const resource of this.defaultCopingResources) {
                await this.db.query(`
                    INSERT INTO coping_resources (
                        category, title, description, content, 
                        duration_minutes, difficulty_level
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    resource.category,
                    resource.title,
                    resource.description,
                    JSON.stringify(resource.content),
                    resource.duration_minutes,
                    resource.difficulty_level
                ]);
            }

            logger.info(`Initialized ${this.defaultCopingResources.length} default coping resources`);
        } catch (error) {
            logger.error('Error initializing default resources:', error);
        }
    }

    async loadUserSafetyPlans() {
        try {
            const result = await this.db.query(`
                SELECT user_id, plan_name, warning_signs, coping_strategies,
                       support_contacts, professional_contacts, environmental_safety
                FROM safety_plans
                WHERE is_active = true
            `);

            this.userSafetyPlans = new Map();
            for (const plan of result.rows) {
                this.userSafetyPlans.set(plan.user_id, {
                    planName: plan.plan_name,
                    warningSigns: plan.warning_signs || [],
                    copingStrategies: plan.coping_strategies || [],
                    supportContacts: plan.support_contacts || {},
                    professionalContacts: plan.professional_contacts || {},
                    environmentalSafety: plan.environmental_safety || {}
                });
            }

            logger.info(`Loaded safety plans for ${this.userSafetyPlans.size} users`);
        } catch (error) {
            logger.error('Error loading user safety plans:', error);
            this.userSafetyPlans = new Map();
        }
    }

    setupSafetyCheckins() {
        // Schedule daily safety check-in reminders
        cron.schedule('0 9 * * *', () => { // 9 AM daily
            this.sendSafetyCheckinReminders();
        });

        // Schedule evening check-ins for high-risk users
        cron.schedule('0 20 * * *', () => { // 8 PM daily
            this.sendEveningCheckins();
        });

        logger.info('Safety check-in reminders scheduled');
    }

    startBackgroundMonitoring() {
        // Monitor for missed check-ins
        setInterval(() => {
            this.checkMissedSafetyCheckins();
        }, 30 * 60 * 1000); // Every 30 minutes

        // Update performance metrics
        setInterval(() => {
            this.updatePerformanceMetrics();
        }, 5 * 60 * 1000); // Every 5 minutes

        logger.info('Safety tools background monitoring started');
    }

    /**
     * Create or update user safety plan
     */
    async createSafetyPlan(userId, planData) {
        try {
            const {
                planName = 'My Safety Plan',
                warningSigns = [],
                copingStrategies = [],
                supportContacts = {},
                professionalContacts = {},
                environmentalSafety = {}
            } = planData;

            // Merge with template defaults if needed
            const mergedWarningSigns = [...new Set([...this.safetyPlanTemplate.warning_signs, ...warningSigns])];
            const mergedCopingStrategies = [...new Set([...this.safetyPlanTemplate.coping_strategies, ...copingStrategies])];
            const mergedEnvironmentalSafety = { ...this.safetyPlanTemplate.environmental_safety, ...environmentalSafety };

            const result = await this.db.query(`
                INSERT INTO safety_plans (
                    user_id, plan_name, warning_signs, coping_strategies,
                    support_contacts, professional_contacts, environmental_safety
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    plan_name = EXCLUDED.plan_name,
                    warning_signs = EXCLUDED.warning_signs,
                    coping_strategies = EXCLUDED.coping_strategies,
                    support_contacts = EXCLUDED.support_contacts,
                    professional_contacts = EXCLUDED.professional_contacts,
                    environmental_safety = EXCLUDED.environmental_safety,
                    updated_at = NOW()
                RETURNING id
            `, [
                userId,
                planName,
                mergedWarningSigns,
                mergedCopingStrategies,
                JSON.stringify(supportContacts),
                JSON.stringify(professionalContacts),
                JSON.stringify(mergedEnvironmentalSafety)
            ]);

            const safetyPlan = {
                id: result.rows[0].id,
                planName,
                warningSigns: mergedWarningSigns,
                copingStrategies: mergedCopingStrategies,
                supportContacts,
                professionalContacts,
                environmentalSafety: mergedEnvironmentalSafety
            };

            // Update in-memory cache
            this.userSafetyPlans.set(userId, safetyPlan);

            // Cache in Redis
            await this.redis.getClient().set(
                `safety_plan:${userId}`,
                JSON.stringify(safetyPlan),
                'EX',
                24 * 60 * 60 // 24 hours
            );

            logger.info(`Safety plan created/updated for user ${userId}`, {
                planName,
                warningSignsCount: mergedWarningSigns.length,
                copingStrategiesCount: mergedCopingStrategies.length
            });

            this.emit('safety-plan-updated', { userId, safetyPlan });

            return {
                success: true,
                safetyPlan,
                message: 'Safety plan created successfully'
            };

        } catch (error) {
            logger.error(`Error creating safety plan for user ${userId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user's safety plan
     */
    async getSafetyPlan(userId) {
        try {
            // Check in-memory cache first
            if (this.userSafetyPlans.has(userId)) {
                return {
                    success: true,
                    safetyPlan: this.userSafetyPlans.get(userId)
                };
            }

            // Check Redis cache
            const cachedPlan = await this.redis.getClient().get(`safety_plan:${userId}`);
            if (cachedPlan) {
                const safetyPlan = JSON.parse(cachedPlan);
                this.userSafetyPlans.set(userId, safetyPlan);
                return { success: true, safetyPlan };
            }

            // Load from database
            const result = await this.db.query(`
                SELECT id, plan_name, warning_signs, coping_strategies,
                       support_contacts, professional_contacts, environmental_safety
                FROM safety_plans
                WHERE user_id = $1 AND is_active = true
            `, [userId]);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    error: 'No safety plan found',
                    suggestion: 'Create a safety plan to enhance your crisis preparedness'
                };
            }

            const row = result.rows[0];
            const safetyPlan = {
                id: row.id,
                planName: row.plan_name,
                warningSigns: row.warning_signs || [],
                copingStrategies: row.coping_strategies || [],
                supportContacts: row.support_contacts || {},
                professionalContacts: row.professional_contacts || {},
                environmentalSafety: row.environmental_safety || {}
            };

            // Cache the result
            this.userSafetyPlans.set(userId, safetyPlan);
            await this.redis.getClient().set(
                `safety_plan:${userId}`,
                JSON.stringify(safetyPlan),
                'EX',
                24 * 60 * 60
            );

            return { success: true, safetyPlan };

        } catch (error) {
            logger.error(`Error getting safety plan for user ${userId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Record safety check-in
     */
    async recordSafetyCheckin(userId, checkinData) {
        try {
            const {
                status, // 'safe', 'concerned', 'crisis'
                moodScore = null,
                anxietyLevel = null,
                notes = '',
                location = null,
                usedCopingTools = [],
                triggersEncountered = []
            } = checkinData;

            // Validate status
            const validStatuses = ['safe', 'concerned', 'crisis'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid check-in status');
            }

            // Record in database
            const result = await this.db.query(`
                INSERT INTO safety_checkins (
                    user_id, status, mood_score, anxiety_level, notes,
                    location_lat, location_lng
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, created_at
            `, [
                userId, status, moodScore, anxietyLevel, notes,
                location?.latitude || null, location?.longitude || null
            ]);

            const checkinId = result.rows[0].id;
            const timestamp = result.rows[0].created_at;

            // Record coping tool usage if any
            for (const toolId of usedCopingTools) {
                await this.recordCopingToolUsage(userId, toolId, {
                    duringCheckin: true,
                    checkinId
                });
            }

            // Update user's last check-in timestamp in Redis
            await this.redis.getClient().set(
                `user:${userId}:lastCheckin`,
                Date.now(),
                'EX',
                7 * 24 * 60 * 60 // 7 days
            );

            // Publish safety check-in event
            await this.redis.publishSafetyCheckin(userId, {
                checkinId,
                status,
                moodScore,
                anxietyLevel,
                timestamp: timestamp.toISOString(),
                usedCopingTools,
                triggersEncountered
            });

            // Determine follow-up actions based on status
            let followUpActions = [];
            
            if (status === 'crisis') {
                followUpActions = await this.handleCrisisCheckin(userId, checkinId, checkinData);
            } else if (status === 'concerned') {
                followUpActions = await this.handleConcernedCheckin(userId, checkinId, checkinData);
            } else {
                followUpActions = await this.handleSafeCheckin(userId, checkinId, checkinData);
            }

            logger.info(`Safety check-in recorded for user ${userId}`, {
                checkinId,
                status,
                moodScore,
                anxietyLevel,
                followUpActions: followUpActions.length
            });

            return {
                success: true,
                checkinId,
                timestamp,
                status,
                followUpActions,
                message: this.getCheckinResponseMessage(status)
            };

        } catch (error) {
            logger.error(`Error recording safety check-in for user ${userId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get available coping resources
     */
    async getCopingResources(userId, filters = {}) {
        try {
            const {
                category = null,
                difficulty = null,
                maxDuration = null,
                searchQuery = null
            } = filters;

            let query = `
                SELECT id, category, title, description, content,
                       duration_minutes, difficulty_level, is_active
                FROM coping_resources
                WHERE is_active = true
            `;
            const params = [];
            let paramIndex = 1;

            if (category) {
                query += ` AND category = $${paramIndex}`;
                params.push(category);
                paramIndex++;
            }

            if (difficulty) {
                query += ` AND difficulty_level <= $${paramIndex}`;
                params.push(difficulty);
                paramIndex++;
            }

            if (maxDuration) {
                query += ` AND duration_minutes <= $${paramIndex}`;
                params.push(maxDuration);
                paramIndex++;
            }

            if (searchQuery) {
                query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
                params.push(`%${searchQuery}%`);
                paramIndex++;
            }

            query += ` ORDER BY difficulty_level, duration_minutes`;

            const result = await this.db.query(query, params);

            const resources = result.rows.map(row => ({
                id: row.id,
                category: row.category,
                categoryName: this.copingCategories[row.category] || row.category,
                title: row.title,
                description: row.description,
                content: row.content,
                durationMinutes: row.duration_minutes,
                difficultyLevel: row.difficulty_level,
                difficultyText: this.getDifficultyText(row.difficulty_level)
            }));

            // Get user's usage history for personalized recommendations
            const usageResult = await this.db.query(`
                SELECT resource_id, AVG(effectiveness_rating) as avg_rating,
                       COUNT(*) as usage_count
                FROM user_coping_usage
                WHERE user_id = $1 AND effectiveness_rating IS NOT NULL
                GROUP BY resource_id
            `, [userId]);

            // Add usage statistics to resources
            const usageMap = new Map();
            for (const usage of usageResult.rows) {
                usageMap.set(usage.resource_id, {
                    avgRating: parseFloat(usage.avg_rating),
                    usageCount: parseInt(usage.usage_count)
                });
            }

            resources.forEach(resource => {
                const usage = usageMap.get(resource.id);
                if (usage) {
                    resource.personalRating = usage.avgRating;
                    resource.personalUsageCount = usage.usageCount;
                    resource.isRecommended = usage.avgRating >= 7; // 7+ out of 10
                }
            });

            // Sort by personal effectiveness if available
            resources.sort((a, b) => {
                if (a.personalRating && b.personalRating) {
                    return b.personalRating - a.personalRating;
                }
                if (a.personalRating) return -1;
                if (b.personalRating) return 1;
                return a.difficultyLevel - b.difficultyLevel;
            });

            return {
                success: true,
                resources,
                totalCount: resources.length,
                categories: Object.entries(this.copingCategories).map(([key, name]) => ({
                    key, name
                }))
            };

        } catch (error) {
            logger.error(`Error getting coping resources for user ${userId}:`, error);
            return {
                success: false,
                error: error.message,
                resources: []
            };
        }
    }

    /**
     * Record usage of a coping tool
     */
    async recordCopingToolUsage(userId, resourceId, usageData = {}) {
        try {
            const {
                sessionDurationSeconds = null,
                effectivenessRating = null,
                notes = '',
                usedDuringCrisis = false,
                duringCheckin = false,
                checkinId = null
            } = usageData;

            // Validate effectiveness rating if provided
            if (effectivenessRating !== null && (effectivenessRating < 1 || effectivenessRating > 10)) {
                throw new Error('Effectiveness rating must be between 1 and 10');
            }

            const result = await this.db.query(`
                INSERT INTO user_coping_usage (
                    user_id, resource_id, session_duration_seconds,
                    effectiveness_rating, notes, used_during_crisis
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, created_at
            `, [
                userId, resourceId, sessionDurationSeconds,
                effectivenessRating, notes, usedDuringCrisis
            ]);

            const usageId = result.rows[0].id;
            const timestamp = result.rows[0].created_at;

            // Update usage statistics
            this.toolUsageStats.totalSessions++;
            
            if (effectivenessRating !== null) {
                const totalRated = this.toolUsageStats.totalSessions;
                this.toolUsageStats.averageEffectiveness = 
                    ((this.toolUsageStats.averageEffectiveness * (totalRated - 1)) + effectivenessRating) / totalRated;
            }

            // Track most used tools
            const toolCount = this.toolUsageStats.mostUsedTools.get(resourceId) || 0;
            this.toolUsageStats.mostUsedTools.set(resourceId, toolCount + 1);

            // If used during crisis and rated highly, count as crisis prevention
            if (usedDuringCrisis && effectivenessRating >= 7) {
                this.toolUsageStats.crisisPreventions++;
            }

            logger.info(`Coping tool usage recorded for user ${userId}`, {
                usageId,
                resourceId,
                sessionDurationSeconds,
                effectivenessRating,
                usedDuringCrisis
            });

            return {
                success: true,
                usageId,
                timestamp,
                message: 'Thank you for tracking your coping tool usage'
            };

        } catch (error) {
            logger.error(`Error recording coping tool usage for user ${userId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get personalized coping recommendations
     */
    async getPersonalizedRecommendations(userId, context = {}) {
        try {
            const {
                currentMood = null,
                currentAnxiety = null,
                availableTime = null, // minutes
                location = 'home' // 'home', 'work', 'public'
            } = context;

            // Get user's historical effectiveness data
            const effectivenessResult = await this.db.query(`
                SELECT cr.id, cr.category, cr.title, cr.description, 
                       cr.duration_minutes, cr.difficulty_level,
                       AVG(ucu.effectiveness_rating) as avg_effectiveness,
                       COUNT(ucu.id) as usage_count
                FROM coping_resources cr
                LEFT JOIN user_coping_usage ucu ON cr.id = ucu.resource_id AND ucu.user_id = $1
                WHERE cr.is_active = true
                GROUP BY cr.id, cr.category, cr.title, cr.description, 
                         cr.duration_minutes, cr.difficulty_level
                ORDER BY avg_effectiveness DESC NULLS LAST, usage_count DESC
            `, [userId]);

            let recommendations = effectivenessResult.rows.map(row => ({
                id: row.id,
                category: row.category,
                title: row.title,
                description: row.description,
                durationMinutes: row.duration_minutes,
                difficultyLevel: row.difficulty_level,
                avgEffectiveness: row.avg_effectiveness ? parseFloat(row.avg_effectiveness) : null,
                usageCount: parseInt(row.usage_count),
                recommendationScore: 0
            }));

            // Apply contextual scoring
            recommendations.forEach(resource => {
                let score = 5; // Base score

                // Boost score for previously effective tools
                if (resource.avgEffectiveness) {
                    score += (resource.avgEffectiveness - 5) * 2; // Scale 1-10 to effect on score
                }

                // Boost frequently used tools slightly
                score += Math.min(resource.usageCount * 0.5, 3);

                // Time constraints
                if (availableTime) {
                    if (resource.durationMinutes <= availableTime) {
                        score += 2;
                    } else {
                        score -= 5; // Significantly reduce if too long
                    }
                }

                // Mood-based recommendations
                if (currentMood !== null && currentMood < 4) { // Low mood
                    if (['physical', 'creative', 'social'].includes(resource.category)) {
                        score += 3;
                    }
                } else if (currentMood !== null && currentMood > 7) { // Good mood
                    if (['mindfulness', 'creative'].includes(resource.category)) {
                        score += 2;
                    }
                }

                // Anxiety-based recommendations
                if (currentAnxiety !== null && currentAnxiety > 6) { // High anxiety
                    if (['breathing', 'grounding', 'mindfulness'].includes(resource.category)) {
                        score += 4;
                    }
                    if (resource.difficultyLevel > 2) {
                        score -= 2; // Prefer simpler tools when highly anxious
                    }
                }

                // Location-based filtering
                if (location === 'work' || location === 'public') {
                    if (['breathing', 'grounding', 'distraction'].includes(resource.category)) {
                        score += 2;
                    }
                    if (resource.category === 'physical' && resource.title.toLowerCase().includes('exercise')) {
                        score -= 3; // Reduce physical exercise in work/public
                    }
                }

                resource.recommendationScore = Math.max(0, score);
            });

            // Sort by recommendation score and take top recommendations
            recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
            const topRecommendations = recommendations.slice(0, 5);

            // Add category diversity - ensure we have different types
            const diverseRecommendations = this.ensureCategoryDiversity(topRecommendations, recommendations);

            return {
                success: true,
                recommendations: diverseRecommendations.map(r => ({
                    id: r.id,
                    category: r.category,
                    categoryName: this.copingCategories[r.category],
                    title: r.title,
                    description: r.description,
                    durationMinutes: r.durationMinutes,
                    difficultyLevel: r.difficultyLevel,
                    personalEffectiveness: r.avgEffectiveness,
                    recommendationReason: this.getRecommendationReason(r, context)
                })),
                context: {
                    currentMood,
                    currentAnxiety,
                    availableTime,
                    location
                }
            };

        } catch (error) {
            logger.error(`Error getting personalized recommendations for user ${userId}:`, error);
            return {
                success: false,
                error: error.message,
                recommendations: []
            };
        }
    }

    /**
     * Handle crisis-level check-in
     */
    async handleCrisisCheckin(userId, checkinId, checkinData) {
        const actions = [];

        try {
            // Immediate crisis response
            await this.redis.publishCrisisAlert(userId, {
                type: 'safety_checkin',
                severity: 9,
                confidence: 0.9,
                checkinId,
                status: 'crisis',
                metadata: {
                    source: 'safety_checkin',
                    moodScore: checkinData.moodScore,
                    anxietyLevel: checkinData.anxietyLevel,
                    notes: checkinData.notes
                }
            });

            actions.push({
                type: 'crisis_alert_sent',
                description: 'Emergency response system activated'
            });

            // Get safety plan
            const safetyPlanResult = await this.getSafetyPlan(userId);
            if (safetyPlanResult.success) {
                actions.push({
                    type: 'safety_plan_available',
                    description: 'Your safety plan is ready to help guide you',
                    safetyPlan: safetyPlanResult.safetyPlan
                });
            }

            // Recommend immediate coping tools
            const recommendations = await this.getPersonalizedRecommendations(userId, {
                currentMood: checkinData.moodScore,
                currentAnxiety: checkinData.anxietyLevel,
                availableTime: 10 // Quick tools for crisis
            });

            if (recommendations.success && recommendations.recommendations.length > 0) {
                actions.push({
                    type: 'immediate_coping_tools',
                    description: 'Try these coping tools right now',
                    tools: recommendations.recommendations.slice(0, 3)
                });
            }

            // Schedule follow-up
            actions.push({
                type: 'followup_scheduled',
                description: 'Follow-up check scheduled in 1 hour',
                scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            });

        } catch (error) {
            logger.error('Error handling crisis check-in:', error);
            actions.push({
                type: 'error',
                description: 'Some automated responses may be delayed'
            });
        }

        return actions;
    }

    /**
     * Handle concerned-level check-in
     */
    async handleConcernedCheckin(userId, checkinId, checkinData) {
        const actions = [];

        try {
            // Moderate response - no immediate crisis alert
            const recommendations = await this.getPersonalizedRecommendations(userId, {
                currentMood: checkinData.moodScore,
                currentAnxiety: checkinData.anxietyLevel,
                availableTime: 20
            });

            if (recommendations.success && recommendations.recommendations.length > 0) {
                actions.push({
                    type: 'coping_recommendations',
                    description: 'Here are some tools that might help',
                    tools: recommendations.recommendations
                });
            }

            // Suggest reviewing safety plan
            actions.push({
                type: 'review_safety_plan',
                description: 'Consider reviewing your safety plan and coping strategies'
            });

            // Schedule check-in reminder
            actions.push({
                type: 'checkin_reminder',
                description: 'Reminder set to check in again later today',
                scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 hours
            });

        } catch (error) {
            logger.error('Error handling concerned check-in:', error);
        }

        return actions;
    }

    /**
     * Handle safe-level check-in
     */
    async handleSafeCheckin(userId, checkinId, checkinData) {
        const actions = [];

        try {
            // Positive reinforcement
            actions.push({
                type: 'positive_feedback',
                description: 'Great job checking in! Your consistency helps build resilience.'
            });

            // Suggest wellness activities if mood/anxiety could improve
            if (checkinData.moodScore && checkinData.moodScore < 7) {
                const recommendations = await this.getPersonalizedRecommendations(userId, {
                    currentMood: checkinData.moodScore,
                    currentAnxiety: checkinData.anxietyLevel,
                    availableTime: 15
                });

                if (recommendations.success && recommendations.recommendations.length > 0) {
                    actions.push({
                        type: 'wellness_suggestions',
                        description: 'Some activities to boost your mood even more',
                        tools: recommendations.recommendations.slice(0, 2)
                    });
                }
            }

            // Update streak information
            actions.push({
                type: 'streak_update',
                description: 'Keep up your check-in streak for better mental health tracking'
            });

        } catch (error) {
            logger.error('Error handling safe check-in:', error);
        }

        return actions;
    }

    // Background monitoring methods

    async sendSafetyCheckinReminders() {
        try {
            // Get users who haven't checked in recently
            const cutoffTime = new Date(Date.now() - config.safety.checkinIntervalHours * 60 * 60 * 1000);
            
            const result = await this.db.query(`
                SELECT DISTINCT u.user_id
                FROM user_baselines u
                LEFT JOIN safety_checkins sc ON u.user_id = sc.user_id 
                    AND sc.created_at > $1
                WHERE sc.id IS NULL
                  AND u.risk_level IN ('medium', 'high')
            `, [cutoffTime]);

            for (const user of result.rows) {
                await this.sendCheckinReminder(user.user_id, 'daily');
            }

            logger.info(`Sent daily check-in reminders to ${result.rows.length} users`);
        } catch (error) {
            logger.error('Error sending safety check-in reminders:', error);
        }
    }

    async sendEveningCheckins() {
        try {
            // Send evening check-ins to high-risk users
            const result = await this.db.query(`
                SELECT user_id
                FROM user_baselines
                WHERE risk_level = 'high'
                   OR high_risk_flag = true
            `);

            for (const user of result.rows) {
                await this.sendCheckinReminder(user.user_id, 'evening');
            }

            logger.info(`Sent evening check-in reminders to ${result.rows.length} high-risk users`);
        } catch (error) {
            logger.error('Error sending evening check-ins:', error);
        }
    }

    async checkMissedSafetyCheckins() {
        try {
            // Check for users who haven't checked in within the expected timeframe
            const cutoffTime = new Date(Date.now() - (config.safety.checkinIntervalHours + config.safety.reminderHours) * 60 * 60 * 1000);
            
            const result = await this.db.query(`
                SELECT u.user_id, u.risk_level
                FROM user_baselines u
                LEFT JOIN safety_checkins sc ON u.user_id = sc.user_id
                    AND sc.created_at > $1
                WHERE sc.id IS NULL
                  AND u.risk_level IN ('medium', 'high')
            `, [cutoffTime]);

            for (const user of result.rows) {
                // Trigger missed check-in alert
                if (user.risk_level === 'high') {
                    await this.handleMissedCheckin(user.user_id, 'high_risk');
                } else {
                    await this.handleMissedCheckin(user.user_id, 'medium_risk');
                }
            }

            if (result.rows.length > 0) {
                logger.warn(`Found ${result.rows.length} missed safety check-ins`);
            }
        } catch (error) {
            logger.error('Error checking missed safety check-ins:', error);
        }
    }

    async handleMissedCheckin(userId, riskLevel) {
        try {
            if (riskLevel === 'high_risk') {
                // For high-risk users, trigger a moderate crisis alert
                await this.redis.publishCrisisAlert(userId, {
                    type: 'missed_checkin',
                    severity: 6,
                    confidence: 0.7,
                    metadata: {
                        source: 'missed_safety_checkin',
                        riskLevel,
                        lastCheckin: await this.getLastCheckinTime(userId)
                    }
                });
            }

            // Send notification through notification service
            this.emit('missed-checkin', {
                userId,
                riskLevel,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error(`Error handling missed check-in for user ${userId}:`, error);
        }
    }

    // Utility methods

    getDifficultyText(level) {
        const difficulties = {
            1: 'Beginner',
            2: 'Intermediate', 
            3: 'Advanced',
            4: 'Expert',
            5: 'Master'
        };
        return difficulties[level] || 'Unknown';
    }

    getCheckinResponseMessage(status) {
        const messages = {
            safe: "Thank you for checking in! It's great to hear you're feeling safe.",
            concerned: "Thank you for being honest about how you're feeling. Let's work through this together.",
            crisis: "Thank you for reaching out. Help is on the way. You're not alone in this."
        };
        return messages[status] || "Thank you for checking in.";
    }

    ensureCategoryDiversity(topRecommendations, allRecommendations) {
        const categoriesIncluded = new Set(topRecommendations.map(r => r.category));
        const missingCategories = ['breathing', 'grounding', 'distraction'].filter(c => !categoriesIncluded.has(c));
        
        // Add one from each missing essential category if available
        for (const category of missingCategories) {
            const categoryResource = allRecommendations.find(r => 
                r.category === category && !topRecommendations.includes(r)
            );
            if (categoryResource && topRecommendations.length < 5) {
                topRecommendations.push(categoryResource);
            }
        }
        
        return topRecommendations.slice(0, 5);
    }

    getRecommendationReason(resource, context) {
        const reasons = [];
        
        if (resource.avgEffectiveness && resource.avgEffectiveness >= 7) {
            reasons.push('Previously effective for you');
        }
        
        if (context.currentAnxiety > 6 && ['breathing', 'grounding'].includes(resource.category)) {
            reasons.push('Good for managing anxiety');
        }
        
        if (context.currentMood < 4 && ['physical', 'creative'].includes(resource.category)) {
            reasons.push('Can help improve mood');
        }
        
        if (context.availableTime && resource.durationMinutes <= context.availableTime) {
            reasons.push(`Quick option (${resource.durationMinutes} min)`);
        }
        
        return reasons.length > 0 ? reasons.join(', ') : 'Recommended based on your profile';
    }

    async sendCheckinReminder(userId, type) {
        // This would integrate with the notification service
        this.emit('checkin-reminder', {
            userId,
            type,
            timestamp: new Date().toISOString()
        });
    }

    async getLastCheckinTime(userId) {
        try {
            const result = await this.db.query(`
                SELECT created_at FROM safety_checkins
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 1
            `, [userId]);
            
            return result.rows.length > 0 ? result.rows[0].created_at : null;
        } catch (error) {
            logger.error('Error getting last check-in time:', error);
            return null;
        }
    }

    updatePerformanceMetrics() {
        logger.info('Safety Tools Performance Metrics', {
            totalSessions: this.toolUsageStats.totalSessions,
            averageEffectiveness: Math.round(this.toolUsageStats.averageEffectiveness * 10) / 10,
            crisisPreventions: this.toolUsageStats.crisisPreventions,
            activeSafetyPlans: this.userSafetyPlans.size,
            mostUsedTools: Array.from(this.toolUsageStats.mostUsedTools.entries())
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([toolId, count]) => ({ toolId, count }))
        });
    }

    async close() {
        logger.info('Closing Safety Tools Service...');
        
        this.userSafetyPlans.clear();
        this.toolUsageStats.mostUsedTools.clear();
        
        logger.info('Safety Tools Service closed');
    }
}

module.exports = SafetyToolsService;
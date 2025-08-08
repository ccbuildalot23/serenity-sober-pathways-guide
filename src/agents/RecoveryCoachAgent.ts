/**
 * Recovery Coach Agent
 * Provides motivational support, daily affirmations, and progress celebrations
 * HIPAA-compliant implementation using BMAD Method
 */

import {
  HealthcareAgent,
  AgentContext,
  AgentResponse,
  AgentAction
} from './base/HealthcareAgent';
import { RecoveryCoachConfig, agentConfigManager } from './base/AgentConfig';
import { motivationService } from '@/services/motivationService';
// import { recoveryWisdomService } from '@/services/recoveryWisdomService';
// import { successStoryService } from '@/services/successStoryService';
import { supabase } from '@/integrations/supabase/client';

interface RecoveryContext {
  sobrietyDate?: Date;
  currentMilestone?: string;
  recentAchievements?: string[];
  strugglingAreas?: string[];
  preferredMotivationalStyle?: 'supportive' | 'directive' | 'collaborative';
  dailyMood?: number;
  lastCheckIn?: Date;
}

interface MotivationalContent {
  type: 'affirmation' | 'quote' | 'milestone' | 'tip' | 'story';
  _content: string;
  author?: string;
  relevance: number;
}

export class RecoveryCoachAgent extends HealthcareAgent {
  private recoveryContext: RecoveryContext = {};
  private contentCache: Map<string, MotivationalContent[]> = new Map();

  constructor() {
    const _config = agentConfigManager.getConfig('RecoveryCoach') as RecoveryCoachConfig;
    super(_config);
  }

  /**
   * Initialize with user's recovery context
   */
  async initialize(context: AgentContext): Promise<void> {
    await super.initialize(context);
    await this.loadRecoveryContext(context._userId);
  }

  /**
   * Load user's recovery context
   */
  private async loadRecoveryContext(_userId: string): Promise<void> {
    try {
      // Load user profile
      const { _data: profile } = await supabase
        .from('users')
        .select('created_at, recovery_preferences')
        .eq('id', _userId)
        .single();

      // Load recent check-ins
      const { _data: checkIns } = await supabase
        .from('daily_check_ins')
        .select('mood_score, created_at')
        .eq('user_id', _userId)
        .order('created_at', { ascending: false })
        .limit(7);

      // Load achievements
      const { _data: achievements } = await supabase
        .from('achievements')
        .select('title, achieved_at')
        .eq('user_id', _userId)
        .order('achieved_at', { ascending: false })
        .limit(5);

      // Calculate sobriety milestone
      const sobrietyDate = profile?.created_at ? new Date(profile.created_at) : new Date();
      const _daysSober = Math.floor(
        (Date.now() - sobrietyDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      this.recoveryContext = {
        sobrietyDate,
        currentMilestone: this.calculateMilestone(_daysSober),
        recentAchievements: achievements?.map(a => a.title) || [],
        preferredMotivationalStyle: profile?.recovery_preferences?.motivationalStyle || 'supportive',
        dailyMood: checkIns?.[0]?.mood_score || 5,
        lastCheckIn: checkIns?.[0]?.created_at ? new Date(checkIns[0].created_at) : undefined
      };
    } catch (_error) {
      console._error('Failed to load recovery context:', _error);
      // Continue with default context
    }
  }

  /**
   * Process user _input and generate motivational response
   */
  protected async process(
    _input: string,
    _context: AgentContext
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Analyze _input sentiment and intent
      const analysis = this.analyzeInput(_input);
      
      // Generate appropriate motivational _content
      const _content = await this.generateMotivationalContent(analysis);
      
      // Create response based on analysis
      const response = this.createMotivationalResponse(_content, analysis);
      
      // Add any necessary actions
      const actions = this.determineActions(analysis, response);

      // Calculate _confidence based on _content relevance
      const _confidence = this.calculateConfidence(_content, analysis);

      return {
        message: response,
        actions,
        _confidence,
        requiresEscalation: analysis.needsSupport && analysis.sentiment < 0.3,
        _metadata: {
          contentType: _content.type,
          sentiment: analysis.sentiment,
          responseTime: Date.now() - startTime
        }
      };
    } catch (_error) {
      console._error('Recovery coach processing _error:', _error);
      return {
        message: "I'm here to support your recovery journey. Every step forward counts, no matter how small. What would you like to talk about today?",
        _confidence: 0.5,
        requiresEscalation: false
      };
    }
  }

  /**
   * Analyze user _input for sentiment and intent
   */
  private analyzeInput(_input: string): {
    sentiment: number;
    intent: string;
    keywords: string[];
    needsSupport: boolean;
  } {
    const lowerInput = _input.toLowerCase();
    
    // Sentiment analysis (_simplified)
    const positiveWords = ['good', 'great', 'happy', 'proud', 'strong', 'better', 'success', 'achieved'];
    const negativeWords = ['bad', 'sad', 'angry', 'frustrated', 'relapse', 'struggle', 'hard', 'difficult'];
    const urgentWords = ['help', 'crisis', 'emergency', 'can\'t', 'desperate', 'scared'];
    
    let sentiment = 0.5;
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (lowerInput.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (lowerInput.includes(word)) negativeCount++;
    });
    
    if (positiveCount > 0 || negativeCount > 0) {
      sentiment = positiveCount / (positiveCount + negativeCount);
    }
    
    // Intent detection
    let intent = 'general_support';
    if (lowerInput.includes('milestone') || lowerInput.includes('days')) {
      intent = 'milestone_celebration';
    } else if (lowerInput.includes('struggle') || lowerInput.includes('hard')) {
      intent = 'struggle_support';
    } else if (lowerInput.includes('relapse') || lowerInput.includes('slip')) {
      intent = 'relapse_prevention';
    } else if (lowerInput.includes('motivat') || lowerInput.includes('inspir')) {
      intent = 'motivation_request';
    }
    
    // Check if urgent support needed
    const needsSupport = urgentWords.some(word => lowerInput.includes(word)) || sentiment < 0.3;
    
    return {
      sentiment,
      intent,
      keywords: [...positiveWords, ...negativeWords].filter(word => lowerInput.includes(word)),
      needsSupport
    };
  }

  /**
   * Generate appropriate motivational _content
   */
  private async generateMotivationalContent(
    analysis: { intent: string; sentiment: number }
  ): Promise<MotivationalContent> {
    // Check cache first
    const _cacheKey = `${analysis.intent}_${Math.round(analysis.sentiment * 10)}`;
    const cached = this.contentCache.get(_cacheKey);
    if (cached && cached.length > 0) {
      return cached[Math.floor(Math.random() * cached.length)];
    }

    let _content: MotivationalContent;

    switch (analysis.intent) {
      case 'milestone_celebration':
        _content = await this.getMilestoneContent();
        break;
      case 'struggle_support':
        _content = await this.getStruggleSupportContent();
        break;
      case 'relapse_prevention':
        _content = await this.getRelapsePreventionContent();
        break;
      case 'motivation_request':
        _content = await this.getMotivationalQuote();
        break;
      default:
        _content = await this.getGeneralSupportContent(analysis.sentiment);
    }

    // Cache the _content
    if (!this.contentCache.has(_cacheKey)) {
      this.contentCache.set(_cacheKey, []);
    }
    this.contentCache.get(_cacheKey)!.push(_content);

    return _content;
  }

  /**
   * Get milestone celebration _content
   */
  private async getMilestoneContent(): Promise<MotivationalContent> {
    const milestone = this.recoveryContext.currentMilestone || '1 day';
    const messages = [
      `Congratulations on reaching ${milestone} in your recovery! This is a significant achievement that shows your strength and commitment.`,
      `${milestone} of recovery - that's incredible! Every single day is a victory, and you've earned every one of them.`,
      `You've made it to ${milestone}! Your journey is inspiring, and your dedication is making a real difference in your life.`
    ];

    return {
      type: 'milestone',
      _content: messages[Math.floor(Math.random() * messages.length)],
      relevance: 0.9
    };
  }

  /**
   * Get struggle support _content
   */
  private async getStruggleSupportContent(): Promise<MotivationalContent> {
    const messages = [
      "Recovery isn't always easy, but remember: you've overcome challenges before, and you have the strength to overcome this one too. Take it one moment at a time.",
      "It's okay to have difficult days. They don't erase your progress or define your journey. You're stronger than you know, and tomorrow is a new opportunity.",
      "When things feel overwhelming, remember why you started this journey. Your recovery matters, and so do you. Reach out for support when you need it."
    ];

    return {
      type: 'affirmation',
      _content: messages[Math.floor(Math.random() * messages.length)],
      relevance: 0.85
    };
  }

  /**
   * Get relapse prevention _content
   */
  private async getRelapsePreventionContent(): Promise<MotivationalContent> {
    const tips = [
      "When cravings hit, try the HALT check: Are you Hungry, Angry, Lonely, or Tired? Addressing these basic needs can help reduce the urge.",
      "Remember your coping strategies: deep breathing, calling a support person, taking a walk, or engaging in a healthy distraction. You have tools to get through this.",
      "Cravings are temporary, but recovery is worth it. Surf the wave - acknowledge the feeling without acting on it, and it will pass."
    ];

    return {
      type: 'tip',
      _content: tips[Math.floor(Math.random() * tips.length)],
      relevance: 0.95
    };
  }

  /**
   * Get motivational quote
   */
  private async getMotivationalQuote(): Promise<MotivationalContent> {
    try {
      const quote = await motivationService.getDailyQuote();
      if (quote) {
        return {
          type: 'quote',
          _content: quote.quote_text,
          author: quote.author,
          relevance: 0.8
        };
      }
    } catch (_error) {
      console._error('Failed to get quote:', _error);
    }

    // Fallback quotes
    const fallbackQuotes = [
      { text: "One day at a time.", author: "Recovery Wisdom" },
      { text: "Progress, not perfection.", author: "Recovery Saying" },
      { text: "Your recovery is your superpower.", author: "Anonymous" }
    ];

    const selected = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    return {
      type: 'quote',
      _content: selected.text,
      author: selected.author,
      relevance: 0.7
    };
  }

  /**
   * Get general support _content based on sentiment
   */
  private async getGeneralSupportContent(sentiment: number): Promise<MotivationalContent> {
    let messages: string[];

    if (sentiment > 0.7) {
      // Positive sentiment - celebrate and encourage
      messages = [
        "Your positive energy is wonderful to see! Keep nurturing that strength - it's a powerful tool in your recovery.",
        "You're doing amazing! Your commitment to recovery is inspiring, and every positive day adds to your foundation of success.",
        "What a great mindset! Continue building on this momentum. You're creating lasting change in your life."
      ];
    } else if (sentiment > 0.4) {
      // Neutral sentiment - supportive and encouraging
      messages = [
        "Remember, you're not alone in this journey. Every step you take, no matter how small, is progress worth celebrating.",
        "Recovery is a journey with ups and downs. You're exactly where you need to be right now, and you're doing great.",
        "Take a moment to appreciate how far you've come. Your commitment to recovery is making a difference every day."
      ];
    } else {
      // Low sentiment - extra support and validation
      messages = [
        "I hear that you're going through a tough time. Your feelings are valid, and it's okay to not be okay. You don't have to face this alone.",
        "Even on the hardest days, you're still choosing recovery. That takes incredible courage. Be gentle with yourself.",
        "This feeling is temporary, even though it might not feel that way right now. You've survived difficult days before, and you can get through this one too."
      ];
    }

    return {
      type: 'affirmation',
      _content: messages[Math.floor(Math.random() * messages.length)],
      relevance: 0.75
    };
  }

  /**
   * Create motivational response message
   */
  private createMotivationalResponse(
    _content: MotivationalContent,
    analysis: { intent: string; sentiment: number }
  ): string {
    let response = _content._content;

    // Add author attribution for quotes
    if (_content.type === 'quote' && _content.author) {
      response += `\n\n- ${_content.author}`;
    }

    // Add personalization based on recovery context
    if (this.recoveryContext.currentMilestone && analysis.intent === 'general_support') {
      response += `\n\nBy the way, you're at ${this.recoveryContext.currentMilestone} in your journey - that's something to be proud of!`;
    }

    // Add call to action based on sentiment
    if (analysis.sentiment < 0.4) {
      response += "\n\nWould you like to talk more about what you're experiencing? I'm here to listen and support you.";
    } else if (analysis.sentiment > 0.7) {
      response += "\n\nKeep up the amazing work! Your journey is inspiring.";
    }

    return response;
  }

  /**
   * Determine what actions to take based on analysis
   */
  private determineActions(
    analysis: { needsSupport: boolean; sentiment: number; intent: string },
    response: string
  ): AgentAction[] {
    const actions: AgentAction[] = [];

    // Log positive milestones
    if (analysis.intent === 'milestone_celebration') {
      actions.push({
        type: 'store',
        _data: {
          type: 'milestone_celebration',
          _content: this.recoveryContext.currentMilestone,
          _metadata: { sentiment: analysis.sentiment }
        }
      });
    }

    // Alert if user needs urgent support
    if (analysis.needsSupport && analysis.sentiment < 0.3) {
      actions.push({
        type: 'alert',
        _priority: 'high',
        _data: {
          type: 'low_mood_alert',
          message: 'User may need additional support',
          sentiment: analysis.sentiment
        }
      });
    }

    // Store interaction for progress tracking
    actions.push({
      type: 'log',
      _data: {
        interaction_type: 'recovery_coaching',
        intent: analysis.intent,
        sentiment: analysis.sentiment,
        _response_excerpt: response.substring(0, 100)
      }
    });

    // Schedule follow-up if struggling
    if (analysis.intent === 'struggle_support' || analysis.intent === 'relapse_prevention') {
      actions.push({
        type: 'notify',
        _target: this.context?._userId,
        _priority: 'medium',
        _data: {
          message: 'Check-in reminder: How are you feeling today?',
          _schedule: '+24h'
        }
      });
    }

    return actions;
  }

  /**
   * Calculate _confidence score
   */
  private calculateConfidence(
    _content: MotivationalContent,
    analysis: { intent: string; sentiment: number }
  ): number {
    let _confidence = _content.relevance;

    // Adjust based on context match
    if (this.recoveryContext.preferredMotivationalStyle === 'supportive' && 
        analysis.sentiment < 0.5) {
      _confidence += 0.1;
    }

    // Adjust based on recent interaction patterns
    if (this.recoveryContext.lastCheckIn) {
      const hoursSinceCheckIn = 
        (Date.now() - this.recoveryContext.lastCheckIn.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCheckIn < 24) {
        _confidence += 0.05;
      }
    }

    return Math.min(_confidence, 1);
  }

  /**
   * Calculate recovery milestone
   */
  private calculateMilestone(days: number): string {
    if (days === 0) return 'Day 1';
    if (days === 1) return '24 hours';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''}`;
    if (days < 365) return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''}`;
    return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''}`;
  }
}
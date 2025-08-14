import OpenAI from 'openai';
import Sentiment from 'sentiment';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { EncryptionService } from './encryptionService';

/**
 * AI-Powered Therapy Service with Crisis Detection
 * 
 * This service provides:
 * - 24/7 AI therapy companion with GPT-4
 * - Real-time mood and risk assessment
 * - Crisis intervention and escalation
 * - HIPAA-compliant conversation encryption
 * - Personalized coping strategies
 * - Session context management
 */

// Crisis detection keywords and patterns
const CRISIS_KEYWORDS = {
  high: [
    'suicide', 'kill myself', 'end it all', 'not worth living', 
    'better off dead', 'no point', 'overdose', 'jump off'
  ],
  medium: [
    'hopeless', 'worthless', 'cant go on', 'give up', 'no way out',
    'relapse', 'using again', 'drinking again', 'self harm'
  ],
  low: [
    'anxious', 'stressed', 'worried', 'scared', 'lonely',
    'sad', 'depressed', 'struggling', 'hard time'
  ]
};

// Therapy prompts and safety guidelines
const SYSTEM_PROMPT = `You are Serenity AI, a compassionate and professional mental health support companion. 
You provide emotional support, coping strategies, and crisis intervention for individuals in recovery.

IMPORTANT GUIDELINES:
1. Always maintain a warm, empathetic, and non-judgmental tone
2. Never provide medical advice or diagnose conditions
3. Encourage professional help when appropriate
4. Detect crisis situations and respond with urgency
5. Focus on evidence-based therapeutic techniques (CBT, DBT, mindfulness)
6. Validate feelings while promoting healthy coping strategies
7. If someone expresses suicidal thoughts, IMMEDIATELY provide crisis resources

CRISIS RESPONSE:
- Express immediate concern and care
- Provide crisis hotline numbers (988 Suicide & Crisis Lifeline)
- Encourage immediate professional help
- Use de-escalation techniques
- Never minimize or dismiss crisis statements`;

export interface AITherapySession {
  id: string;
  userId: string;
  messages: AIMessage[];
  moodScores: number[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  startTime: Date;
  lastActivity: Date;
  encryptedContent?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sentiment?: number;
  riskAssessment?: RiskAssessment;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendedActions: string[];
  requiresEscalation: boolean;
}

export interface CopingStrategy {
  id: string;
  type: 'breathing' | 'grounding' | 'cognitive' | 'behavioral' | 'social';
  title: string;
  description: string;
  steps: string[];
  duration: number; // minutes
}

export class AITherapyService {
  private openai: OpenAI;
  private sentiment: Sentiment;
  private sessions: Map<string, AITherapySession>;
  private readonly maxTokens = 500;

  constructor() {
    // Initialize OpenAI with API key from environment
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      dangerouslyAllowBrowser: true // For development only
    });
    
    this.sentiment = new Sentiment();
    this.sessions = new Map();
  }

  /**
   * Start a new AI therapy session
   */
  async startSession(userId: string): Promise<AITherapySession> {
    const session: AITherapySession = {
      id: uuidv4(),
      userId,
      messages: [],
      moodScores: [],
      riskLevel: 'low',
      startTime: new Date(),
      lastActivity: new Date()
    };

    // Add system prompt as first message
    session.messages.push({
      id: uuidv4(),
      role: 'system',
      content: SYSTEM_PROMPT,
      timestamp: new Date()
    });

    // Welcome message
    const welcomeMessage = await this.generateResponse(
      session,
      "Hello! I'm Serenity AI, your mental health support companion. I'm here to listen and support you 24/7. How are you feeling today?"
    );
    
    session.messages.push(welcomeMessage);
    this.sessions.set(session.id, session);
    
    // Save session to database
    await this.saveSession(session);
    
    return session;
  }

  /**
   * Process user message and generate AI response
   */
  async processMessage(sessionId: string, userMessage: string): Promise<AIMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Analyze user message
    const riskAssessment = this.assessRisk(userMessage);
    const sentimentScore = this.sentiment.analyze(userMessage).score;
    
    // Create user message object
    const userMsg: AIMessage = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      sentiment: sentimentScore,
      riskAssessment
    };
    
    session.messages.push(userMsg);
    session.moodScores.push(sentimentScore);
    
    // Update session risk level
    if (riskAssessment.level === 'critical' || riskAssessment.level === 'high') {
      session.riskLevel = riskAssessment.level;
      await this.handleCrisis(session, riskAssessment);
    }
    
    // Generate AI response
    const aiResponse = await this.generateAIResponse(session, userMessage, riskAssessment);
    session.messages.push(aiResponse);
    
    // Update session
    session.lastActivity = new Date();
    await this.saveSession(session);
    
    return aiResponse;
  }

  /**
   * Generate AI response using OpenAI GPT-4
   */
  private async generateAIResponse(
    session: AITherapySession, 
    userMessage: string,
    riskAssessment: RiskAssessment
  ): Promise<AIMessage> {
    try {
      // Prepare conversation context
      const messages = session.messages.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
      
      // Add crisis context if needed
      if (riskAssessment.level === 'high' || riskAssessment.level === 'critical') {
        messages.push({
          role: 'system',
          content: `URGENT: User is showing ${riskAssessment.level} risk indicators. Respond with immediate support and crisis resources.`
        });
      }
      
      // Add user message
      messages.push({
        role: 'user',
        content: userMessage
      });
      
      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: messages,
        max_tokens: this.maxTokens,
        temperature: 0.7,
        presence_penalty: 0.3,
        frequency_penalty: 0.3
      });
      
      const aiContent = completion.choices[0]?.message?.content || 
        "I'm here to support you. Can you tell me more about what you're experiencing?";
      
      return {
        id: uuidv4(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('AI generation error:', error);
      
      // Fallback response for errors
      return {
        id: uuidv4(),
        role: 'assistant',
        content: this.getFallbackResponse(riskAssessment),
        timestamp: new Date()
      };
    }
  }

  /**
   * Assess risk level from user message
   */
  private assessRisk(message: string): RiskAssessment {
    const lowerMessage = message.toLowerCase();
    const factors: string[] = [];
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    // Check for crisis keywords
    for (const keyword of CRISIS_KEYWORDS.high) {
      if (lowerMessage.includes(keyword)) {
        factors.push(`High-risk phrase: "${keyword}"`);
        level = 'critical';
      }
    }
    
    if (level !== 'critical') {
      for (const keyword of CRISIS_KEYWORDS.medium) {
        if (lowerMessage.includes(keyword)) {
          factors.push(`Medium-risk phrase: "${keyword}"`);
          level = 'high';
        }
      }
    }
    
    if (level === 'low') {
      for (const keyword of CRISIS_KEYWORDS.low) {
        if (lowerMessage.includes(keyword)) {
          factors.push(`Distress indicator: "${keyword}"`);
          level = 'medium';
        }
      }
    }
    
    // Determine recommended actions
    const recommendedActions = this.getRecommendedActions(level);
    
    return {
      level,
      factors,
      recommendedActions,
      requiresEscalation: level === 'critical' || level === 'high'
    };
  }

  /**
   * Get recommended actions based on risk level
   */
  private getRecommendedActions(level: string): string[] {
    switch (level) {
      case 'critical':
        return [
          'Immediate crisis intervention',
          'Contact emergency services if needed',
          'Provide crisis hotline (988)',
          'Alert emergency contacts',
          'Stay with user virtually until safe'
        ];
      case 'high':
        return [
          'Express immediate concern',
          'Provide crisis resources',
          'Suggest contacting therapist',
          'Alert support network',
          'Offer coping strategies'
        ];
      case 'medium':
        return [
          'Validate feelings',
          'Suggest coping techniques',
          'Encourage self-care',
          'Consider scheduling therapy',
          'Monitor closely'
        ];
      default:
        return [
          'Continue supportive dialogue',
          'Provide coping strategies',
          'Encourage positive activities',
          'Track mood patterns'
        ];
    }
  }

  /**
   * Handle crisis situations
   */
  private async handleCrisis(session: AITherapySession, assessment: RiskAssessment): Promise<void> {
    // Log crisis event
    await supabase.from('crisis_events').insert({
      user_id: session.userId,
      session_id: session.id,
      risk_level: assessment.level,
      factors: assessment.factors,
      timestamp: new Date().toISOString()
    });
    
    // Alert support network if critical
    if (assessment.level === 'critical') {
      await this.alertEmergencyContacts(session.userId);
    }
    
    // Send crisis notification to provider
    await this.notifyProvider(session.userId, assessment);
  }

  /**
   * Alert emergency contacts
   */
  private async alertEmergencyContacts(userId: string): Promise<void> {
    // Get emergency contacts from database
    const { data: contacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('tier', 'emergency');
    
    if (contacts && contacts.length > 0) {
      // Send alerts to each contact
      for (const contact of contacts) {
        await supabase.from('crisis_alerts').insert({
          user_id: userId,
          contact_id: contact.id,
          alert_type: 'ai_crisis_detection',
          message: 'AI therapy system detected a crisis situation. Please check on your loved one immediately.',
          sent_at: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Notify provider about crisis
   */
  private async notifyProvider(userId: string, assessment: RiskAssessment): Promise<void> {
    // Get user's provider
    const { data: provider } = await supabase
      .from('user_providers')
      .select('provider_id')
      .eq('user_id', userId)
      .single();
    
    if (provider) {
      await supabase.from('provider_notifications').insert({
        provider_id: provider.provider_id,
        user_id: userId,
        type: 'ai_crisis_alert',
        severity: assessment.level,
        message: `AI detected ${assessment.level} risk level. Factors: ${assessment.factors.join(', ')}`,
        created_at: new Date().toISOString()
      });
    }
  }

  /**
   * Get personalized coping strategies
   */
  async getCopingStrategies(userId: string, type?: string): Promise<CopingStrategy[]> {
    const strategies: CopingStrategy[] = [
      {
        id: '1',
        type: 'breathing',
        title: '4-7-8 Breathing Technique',
        description: 'A calming breath pattern to reduce anxiety',
        steps: [
          'Exhale completely',
          'Inhale through nose for 4 counts',
          'Hold breath for 7 counts',
          'Exhale through mouth for 8 counts',
          'Repeat 3-4 times'
        ],
        duration: 5
      },
      {
        id: '2',
        type: 'grounding',
        title: '5-4-3-2-1 Grounding',
        description: 'Use your senses to ground yourself in the present',
        steps: [
          'Name 5 things you can see',
          'Name 4 things you can touch',
          'Name 3 things you can hear',
          'Name 2 things you can smell',
          'Name 1 thing you can taste'
        ],
        duration: 3
      },
      {
        id: '3',
        type: 'cognitive',
        title: 'Thought Challenging',
        description: 'Question and reframe negative thoughts',
        steps: [
          'Identify the negative thought',
          'Ask: Is this thought based on facts?',
          'Consider alternative explanations',
          'Think about the worst/best/most likely outcome',
          'Create a balanced thought'
        ],
        duration: 10
      }
    ];
    
    if (type) {
      return strategies.filter(s => s.type === type);
    }
    
    return strategies;
  }

  /**
   * Save session to database (encrypted)
   */
  private async saveSession(session: AITherapySession): Promise<void> {
    // Encrypt session content
    const sessionData = JSON.stringify({
      messages: session.messages,
      moodScores: session.moodScores
    });
    
    const encryptedContent = EncryptionService.encrypt(sessionData, `ai-session-${session.id}`);
    
    // Save to database
    await supabase.from('ai_therapy_sessions').upsert({
      id: session.id,
      user_id: session.userId,
      encrypted_content: encryptedContent,
      risk_level: session.riskLevel,
      start_time: session.startTime.toISOString(),
      last_activity: session.lastActivity.toISOString()
    });
  }

  /**
   * Load session from database
   */
  async loadSession(sessionId: string): Promise<AITherapySession | null> {
    const { data } = await supabase
      .from('ai_therapy_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (!data) return null;
    
    // Decrypt session content
    const decryptedContent = EncryptionService.decrypt(
      data.encrypted_content,
      `ai-session-${sessionId}`
    );
    
    const sessionData = JSON.parse(decryptedContent);
    
    const session: AITherapySession = {
      id: data.id,
      userId: data.user_id,
      messages: sessionData.messages,
      moodScores: sessionData.moodScores,
      riskLevel: data.risk_level,
      startTime: new Date(data.start_time),
      lastActivity: new Date(data.last_activity)
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get fallback response when AI is unavailable
   */
  private getFallbackResponse(assessment: RiskAssessment): string {
    if (assessment.level === 'critical') {
      return `I'm deeply concerned about what you're sharing. Your safety is the top priority right now.

Please reach out for immediate help:
• Call 988 - Suicide & Crisis Lifeline (24/7)
• Text "HELLO" to 741741 - Crisis Text Line
• Call 911 if you're in immediate danger

You don't have to go through this alone. There are people who want to help and support you. Would you like me to alert your support network?`;
    }
    
    if (assessment.level === 'high') {
      return `I can hear that you're going through a really difficult time. Thank you for reaching out - that takes courage.

Here are some immediate resources:
• Crisis Lifeline: 988 (available 24/7)
• Your therapist's emergency line
• A trusted friend or family member

Would you like to try some grounding exercises together, or would you prefer to talk about what's happening?`;
    }
    
    return "I'm here to listen and support you. Please share what's on your mind, and we'll work through it together.";
  }

  /**
   * Generate response helper
   */
  private async generateResponse(session: AITherapySession, content: string): Promise<AIMessage> {
    return {
      id: uuidv4(),
      role: 'assistant',
      content,
      timestamp: new Date()
    };
  }
}

// Export singleton instance
export const aiTherapyService = new AITherapyService();
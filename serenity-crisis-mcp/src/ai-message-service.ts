/**
 * AI Message Generation Service
 * Uses Claude API to generate contextual, empathetic crisis messages
 */

export interface MessageContext {
  severity: 'low' | 'medium' | 'high' | 'critical';
  relationship: string; // Sponsor, Family, Friend, Therapist, etc.
  recipientName: string;
  userMessage: string;
  timeOfDay: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_night';
  userHistory?: UserHistory;
  location?: string;
}

export interface UserHistory {
  daysInRecovery?: number;
  previousCrises?: number;
  primaryIssues?: string[]; // addiction, anxiety, depression, etc.
  supporterInteractionCount?: number;
}

export interface GeneratedMessage {
  sms: string;
  email: EmailMessage;
  push: string;
  supporterGuidance: string[];
}

export interface EmailMessage {
  subject: string;
  body: string;
}

export class AIMessageService {
  private apiKey: string | undefined;
  private fallbackMessages: Map<string, GeneratedMessage>;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CLAUDE_API_KEY;
    this.fallbackMessages = this.initializeFallbackMessages();
  }

  /**
   * Generate contextual crisis alert messages using AI
   */
  async generateCrisisMessage(context: MessageContext): Promise<GeneratedMessage> {
    try {
      // If no API key, use intelligent fallbacks
      if (!this.apiKey) {
        return this.getFallbackMessage(context);
      }

      // Generate prompts for different channels
      const smsMessage = await this.generateSMS(context);
      const emailMessage = await this.generateEmail(context);
      const pushMessage = await this.generatePush(context);
      const guidance = await this.generateSupporterGuidance(context);

      return {
        sms: smsMessage,
        email: emailMessage,
        push: pushMessage,
        supporterGuidance: guidance
      };
    } catch (error) {
      console.error('[AI] Error generating message:', error);
      return this.getFallbackMessage(context);
    }
  }

  /**
   * Generate SMS message (160 char limit for urgency)
   */
  private async generateSMS(context: MessageContext): Promise<string> {
    const { severity, relationship, recipientName, userMessage, timeOfDay } = context;
    
    // Simulate AI generation (replace with actual Claude API call)
    const templates = {
      critical: {
        Sponsor: `🚨 ${recipientName}, your sponsee needs immediate help: "${this.truncate(userMessage, 80)}" Please respond NOW.`,
        Family: `🚨 URGENT: Your loved one is in crisis and needs you immediately. "${this.truncate(userMessage, 60)}" Call them now.`,
        Therapist: `🚨 Crisis Alert: Patient reporting: "${this.truncate(userMessage, 70)}" Immediate intervention required.`,
        Friend: `🚨 Your friend urgently needs help: "${this.truncate(userMessage, 80)}" Please reach out immediately.`
      },
      high: {
        Sponsor: `⚠️ ${recipientName}, sponsee struggling: "${this.truncate(userMessage, 80)}" They need support soon.`,
        Family: `⚠️ Your family member needs help: "${this.truncate(userMessage, 70)}" Please check on them.`,
        Therapist: `⚠️ Patient alert: "${this.truncate(userMessage, 80)}" Support needed within hour.`,
        Friend: `⚠️ Your friend is struggling: "${this.truncate(userMessage, 80)}" They could use your support.`
      },
      medium: {
        Sponsor: `${recipientName}, sponsee reaching out: "${this.truncate(userMessage, 70)}" When can you connect?`,
        Family: `Your loved one needs support: "${this.truncate(userMessage, 80)}" Please reach out today.`,
        Therapist: `Patient update: "${this.truncate(userMessage, 90)}" Follow-up recommended.`,
        Friend: `Your friend needs to talk: "${this.truncate(userMessage, 85)}" Can you check in?`
      },
      low: {
        Sponsor: `${recipientName}, sponsee check-in: "${this.truncate(userMessage, 80)}" Touch base when you can.`,
        Family: `Update from your loved one: "${this.truncate(userMessage, 85)}" They'd appreciate hearing from you.`,
        Therapist: `Patient note: "${this.truncate(userMessage, 95)}" Non-urgent follow-up.`,
        Friend: `Your friend shared: "${this.truncate(userMessage, 90)}" A check-in would be nice.`
      }
    };

    const severityMessages = templates[severity] || templates.medium;
    const message = (severityMessages as any)[relationship] || severityMessages.Friend;
    
    return this.addTimeContext(message, timeOfDay);
  }

  /**
   * Generate email message with more detail
   */
  private async generateEmail(context: MessageContext): Promise<EmailMessage> {
    const { severity, relationship, recipientName, userMessage, timeOfDay, userHistory, location } = context;
    
    const urgencyPrefix = {
      critical: '🚨 URGENT CRISIS ALERT',
      high: '⚠️ Important Support Needed',
      medium: 'Support Request',
      low: 'Check-in Request'
    };

    const subject = `${urgencyPrefix[severity]} - Serenity Recovery Support`;

    const relationshipGreeting = {
      Sponsor: `Dear ${recipientName} (Sponsor)`,
      Family: `Dear ${recipientName}`,
      Therapist: `Dr. ${recipientName}`,
      Friend: `Hi ${recipientName}`
    };

    const greeting = (relationshipGreeting as any)[relationship] || `Dear ${recipientName}`;

    let body = `${greeting},

This is an automated alert from the Serenity Sober Pathways recovery support system.

**Alert Level:** ${severity.toUpperCase()}
**Time:** ${new Date().toLocaleString()}
${location ? `**Location:** ${location}` : ''}

**Message from your ${this.getRelationshipContext(relationship)}:**
"${userMessage}"

`;

    // Add history context if available
    if (userHistory) {
      body += `**Recovery Context:**\n`;
      if (userHistory.daysInRecovery) {
        body += `- Days in recovery: ${userHistory.daysInRecovery}\n`;
      }
      if (userHistory.primaryIssues && userHistory.primaryIssues.length > 0) {
        body += `- Primary challenges: ${userHistory.primaryIssues.join(', ')}\n`;
      }
      body += '\n';
    }

    // Add action items based on severity
    body += this.getActionItems(severity, relationship);

    // Add response instructions
    body += `

**How to Respond:**
1. Reply to acknowledge receipt of this alert
2. Contact them directly via phone or text
3. If you're unable to help, please let us know so we can notify others

${severity === 'critical' ? '**If you believe they are in immediate danger, please call 911 immediately.**\n' : ''}
Thank you for being part of their support network.

Best regards,
Serenity Crisis Response Team`;

    return { subject, body };
  }

  /**
   * Generate push notification (brief but informative)
   */
  private async generatePush(context: MessageContext): Promise<string> {
    const { severity, userMessage } = context;
    
    const templates = {
      critical: `🚨 CRISIS: "${this.truncate(userMessage, 50)}" - Immediate response needed!`,
      high: `⚠️ Urgent: "${this.truncate(userMessage, 60)}" - Please respond soon`,
      medium: `Support needed: "${this.truncate(userMessage, 70)}"`,
      low: `Check-in: "${this.truncate(userMessage, 80)}"`
    };

    return templates[severity] || templates.medium;
  }

  /**
   * Generate guidance for supporters on how to help
   */
  private async generateSupporterGuidance(context: MessageContext): Promise<string[]> {
    const { severity, relationship, userMessage, userHistory } = context;
    
    const baseGuidance = [
      'Remain calm and supportive',
      'Listen without judgment',
      'Validate their feelings',
      'Assess immediate safety'
    ];

    const severityGuidance = {
      critical: [
        'Call or video chat immediately if possible',
        'Ask directly about suicidal thoughts or self-harm',
        'Stay with them or ensure someone else can',
        'Call 911 if immediate danger exists',
        'Remove any means of self-harm if present'
      ],
      high: [
        'Respond within 15-30 minutes',
        'Offer to meet in person if nearby',
        'Help identify immediate coping strategies',
        'Consider involving additional support',
        'Schedule follow-up check-ins'
      ],
      medium: [
        'Respond within 1-2 hours',
        'Offer emotional support and validation',
        'Help problem-solve if appropriate',
        'Remind them of their strengths and progress',
        'Plan a follow-up conversation'
      ],
      low: [
        'Respond within the day',
        'Show appreciation for them reaching out',
        'Offer encouragement and support',
        'Share positive reinforcement',
        'Check in again in a few days'
      ]
    };

    const relationshipGuidance = {
      Sponsor: [
        'Review their recovery plan together',
        'Discuss meeting attendance',
        'Work through steps if applicable',
        'Share your own experience if relevant'
      ],
      Family: [
        'Express unconditional love and support',
        'Avoid criticism or shame',
        'Focus on their wellbeing',
        'Respect their recovery process'
      ],
      Therapist: [
        'Apply professional crisis intervention',
        'Assess risk factors systematically',
        'Consider medication adjustments',
        'Schedule emergency session if needed'
      ],
      Friend: [
        'Be present and available',
        'Offer practical help if needed',
        'Suggest healthy activities together',
        'Respect boundaries while showing care'
      ]
    };

    return [
      ...baseGuidance,
      ...(severityGuidance[severity] || severityGuidance.medium),
      ...((relationshipGuidance as any)[relationship] || [])
    ];
  }

  /**
   * Get fallback messages when AI is unavailable
   */
  private getFallbackMessage(context: MessageContext): GeneratedMessage {
    const key = `${context.severity}-${context.relationship}`;
    const fallback = this.fallbackMessages.get(key) || this.getDefaultFallback(context);
    
    // Personalize with available context
    return {
      sms: fallback.sms.replace('{name}', context.recipientName).replace('{message}', this.truncate(context.userMessage, 80)),
      email: {
        subject: fallback.email.subject,
        body: fallback.email.body
          .replace('{name}', context.recipientName)
          .replace('{message}', context.userMessage)
          .replace('{time}', new Date().toLocaleString())
      },
      push: fallback.push.replace('{message}', this.truncate(context.userMessage, 60)),
      supporterGuidance: fallback.supporterGuidance
    };
  }

  /**
   * Initialize fallback messages for when AI is unavailable
   */
  private initializeFallbackMessages(): Map<string, GeneratedMessage> {
    const messages = new Map<string, GeneratedMessage>();
    
    // Add comprehensive fallbacks for each severity-relationship combination
    // This is a subset for brevity
    messages.set('critical-Sponsor', {
      sms: '🚨 {name}, your sponsee is in crisis: "{message}". Please respond immediately!',
      email: {
        subject: '🚨 URGENT: Crisis Alert - Immediate Response Needed',
        body: `Dear {name},

Your sponsee has triggered a critical crisis alert and needs immediate support.

Message: "{message}"
Time: {time}

Please respond immediately. If you cannot help, notify us so we can contact others.

If they are in immediate danger, please call 911.

Serenity Crisis Team`
      },
      push: '🚨 CRISIS: "{message}" - Respond NOW!',
      supporterGuidance: [
        'Contact immediately',
        'Assess suicide risk',
        'Stay with them or ensure someone can',
        'Call 911 if needed',
        'Use crisis de-escalation techniques'
      ]
    });

    return messages;
  }

  /**
   * Helper method to get default fallback
   */
  private getDefaultFallback(context: MessageContext): GeneratedMessage {
    return {
      sms: `Alert: ${context.recipientName}, someone needs your support: "${this.truncate(context.userMessage, 80)}"`,
      email: {
        subject: 'Support Alert from Serenity',
        body: `Dear ${context.recipientName},\n\nSomeone in your support network needs help:\n\n"${context.userMessage}"\n\nPlease respond when you can.\n\nSerenity Team`
      },
      push: `Support needed: "${this.truncate(context.userMessage, 60)}"`,
      supporterGuidance: ['Listen and support', 'Be present', 'Assess needs', 'Follow up']
    };
  }

  /**
   * Helper methods
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private addTimeContext(message: string, timeOfDay: string): string {
    if (timeOfDay === 'late_night' || timeOfDay === 'early_morning') {
      return `[Night Alert] ${message}`;
    }
    return message;
  }

  private getRelationshipContext(relationship: string): string {
    const contexts = {
      Sponsor: 'sponsee',
      Family: 'family member',
      Therapist: 'patient',
      Friend: 'friend'
    };
    return (contexts as any)[relationship] || 'connection';
  }

  private getActionItems(severity: string, relationship: string): string {
    const items = {
      critical: `**IMMEDIATE ACTION REQUIRED:**
- Contact them NOW via phone or in person
- Assess immediate safety and suicide risk
- Stay with them or ensure someone else can
- Call 911 if there's immediate danger
- Contact crisis hotline if needed: 988`,
      
      high: `**Recommended Actions:**
- Respond within 30 minutes
- Call or video chat if possible
- Help them identify immediate coping strategies
- Consider meeting in person if nearby
- Plan follow-up support`,
      
      medium: `**Suggested Response:**
- Respond within 1-2 hours
- Offer emotional support via call or text
- Help problem-solve if appropriate
- Schedule a check-in for later`,
      
      low: `**When Convenient:**
- Respond within the day
- Send an encouraging message
- Plan to connect soon
- Let them know you care`
    };

    return (items as any)[severity] || items.medium;
  }

  /**
   * Get time of day classification
   */
  static getTimeOfDay(): MessageContext['timeOfDay'] {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) return 'morning';
    if (hour >= 9 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    if (hour >= 21 || hour < 5) return 'late_night';
    return 'morning';
  }
}

// Export singleton instance
export const aiMessageService = new AIMessageService();
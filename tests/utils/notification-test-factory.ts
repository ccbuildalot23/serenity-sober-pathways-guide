import { faker } from '@faker-js/faker';

export interface TestNotification {
  id?: string;
  userId: string;
  type: string;
  channels: string[];
  content?: string;
  recipient?: {
    email?: string;
    phone?: string;
    pushTokens?: string[];
    firstName?: string;
    lastName?: string;
    timezone?: string;
  };
  templateData?: Record<string, any>;
  scheduledFor?: Date | string;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  deduplicationKey?: string;
  deduplicationWindow?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential';
    initialDelay: number;
  };
  fallbackStrategy?: {
    primary: string;
    fallback: string;
    fallbackOnFailure: boolean;
  };
  userPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    timezone?: string;
  };
  metadata?: Record<string, any>;
}

export interface TestUser {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'provider' | 'supporter' | 'admin';
  timezone?: string;
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    maxSmsPerDay?: number;
    maxEmailPerDay?: number;
  };
  metadata?: Record<string, any>;
}

export interface TestSupportContact {
  id?: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  relationship: string;
  priority: number;
  crisisEnabled: boolean;
  availableHours: string;
  metadata?: Record<string, any>;
}

export interface TestCrisisAlert {
  id?: string;
  userId: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  message: string;
  riskFactors?: string[];
  location?: { lat: number; lng: number };
  supportContacts?: string[];
  escalationLevel: 'standard' | 'immediate' | 'emergency';
  triggerKeywords?: string[];
  metadata?: Record<string, any>;
}

export interface TestBatchNotification {
  batchId: string;
  type: string;
  channels: string[];
  recipients: Array<{
    userId: string;
    email?: string;
    phone?: string;
    pushTokens?: string[];
    templateData?: Record<string, any>;
  }>;
  content?: string;
  templateId?: string;
  scheduledFor?: Date;
  batchProcessingOptions?: {
    maxConcurrency: number;
    delayBetweenBatches: number;
  };
  failureHandling?: {
    continueOnFailure: boolean;
    maxFailureRate: number;
    abortOnThresholdExceeded?: boolean;
  };
}

export class NotificationTestFactory {
  // Generate realistic test data
  private static readonly NOTIFICATION_TYPES = [
    'daily_checkin_reminder',
    'appointment_reminder',
    'crisis_alert',
    'milestone_celebration',
    'motivation_message',
    'weekly_progress',
    'system_announcement',
    'emergency_alert',
    'peer_support_request',
    'therapy_session_reminder'
  ];

  private static readonly CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'end my life', 'want to die',
    'hopeless', 'can\'t go on', 'better off dead', 'no point',
    'overdose', 'pills', 'hurt myself', 'self-harm'
  ];

  private static readonly RELATIONSHIPS = [
    'spouse', 'parent', 'sibling', 'child', 'friend',
    'therapist', 'sponsor', 'case_manager', 'emergency_contact'
  ];

  // Create basic notification
  createNotification(overrides: Partial<TestNotification> = {}): TestNotification {
    const defaults: TestNotification = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      type: faker.helpers.arrayElement(NotificationTestFactory.NOTIFICATION_TYPES),
      channels: faker.helpers.arrayElements(['email', 'sms', 'push'], { min: 1, max: 3 }),
      content: faker.lorem.sentence(),
      recipient: this.createRecipient(),
      priority: faker.helpers.arrayElement(['low', 'normal', 'high']),
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'test_factory'
      }
    };

    return { ...defaults, ...overrides };
  }

  // Create notification with template data
  createTemplatedNotification(templateType: string, templateData: Record<string, any> = {}): TestNotification {
    const baseNotification = this.createNotification({
      type: templateType,
      templateData: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        ...templateData
      }
    });

    // Add template-specific content
    switch (templateType) {
      case 'daily_checkin_reminder':
        baseNotification.content = 'Time for your daily check-in!';
        baseNotification.channels = ['email', 'sms'];
        break;
      case 'crisis_alert':
        baseNotification.content = 'Crisis alert - immediate attention required';
        baseNotification.priority = 'critical';
        baseNotification.channels = ['sms', 'email', 'push'];
        break;
      case 'milestone_celebration':
        baseNotification.content = `Congratulations on ${templateData.daysClean || 30} days clean!`;
        baseNotification.channels = ['email'];
        break;
      case 'appointment_reminder':
        baseNotification.content = 'Your appointment is tomorrow at 2 PM';
        baseNotification.channels = ['sms', 'email'];
        baseNotification.scheduledFor = new Date(Date.now() + 86400000); // Tomorrow
        break;
    }

    return baseNotification;
  }

  // Create crisis-related notification
  createCrisisNotification(severity: 'low' | 'moderate' | 'high' | 'critical' = 'high'): TestNotification {
    const crisisKeywords = faker.helpers.arrayElements(NotificationTestFactory.CRISIS_KEYWORDS, { min: 1, max: 3 });
    
    return this.createNotification({
      type: 'crisis_alert',
      priority: severity === 'critical' ? 'critical' : 'urgent',
      channels: ['sms', 'email', 'push'],
      content: `Crisis alert - ${crisisKeywords.join(', ')} detected`,
      metadata: {
        severity,
        riskFactors: crisisKeywords,
        escalationRequired: severity === 'critical',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Create scheduled notification
  createScheduledNotification(scheduledFor: Date | string): TestNotification {
    return this.createNotification({
      scheduledFor: typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor,
      type: 'scheduled_reminder',
      priority: 'normal'
    });
  }

  // Create batch notification job
  createBatchNotificationJob(overrides: Partial<TestBatchNotification> = {}): TestBatchNotification {
    const defaults: TestBatchNotification = {
      batchId: `batch_${faker.string.alphanumeric(8)}`,
      type: faker.helpers.arrayElement(NotificationTestFactory.NOTIFICATION_TYPES),
      channels: ['email'],
      recipients: Array.from({ length: 50 }, () => ({
        userId: faker.string.uuid(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        templateData: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName()
        }
      })),
      content: faker.lorem.paragraph(),
      batchProcessingOptions: {
        maxConcurrency: 10,
        delayBetweenBatches: 100
      },
      failureHandling: {
        continueOnFailure: true,
        maxFailureRate: 0.1,
        abortOnThresholdExceeded: false
      }
    };

    return { ...defaults, ...overrides };
  }

  // Create notification job for queue processing
  createNotificationJob(overrides: Partial<any> = {}): any {
    const notification = this.createNotification(overrides);
    
    return {
      notificationId: notification.id,
      userId: notification.userId,
      type: notification.type,
      channels: notification.channels,
      content: notification.content,
      recipient: notification.recipient,
      templateData: notification.templateData,
      priority: notification.priority,
      scheduledFor: notification.scheduledFor,
      metadata: {
        ...notification.metadata,
        jobCreatedAt: new Date().toISOString(),
        attempts: 0
      }
    };
  }

  // Create test user
  createUser(overrides: Partial<TestUser> = {}): TestUser {
    const defaults: TestUser = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: faker.helpers.arrayElement(['patient', 'provider', 'supporter']),
      timezone: faker.location.timeZone(),
      notificationPreferences: {
        email: faker.datatype.boolean({ probability: 0.8 }),
        sms: faker.datatype.boolean({ probability: 0.6 }),
        push: faker.datatype.boolean({ probability: 0.7 }),
        whatsapp: faker.datatype.boolean({ probability: 0.3 }),
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        maxSmsPerDay: faker.number.int({ min: 5, max: 20 }),
        maxEmailPerDay: faker.number.int({ min: 10, max: 50 })
      },
      metadata: {
        createdAt: faker.date.past().toISOString(),
        lastActive: faker.date.recent().toISOString()
      }
    };

    return { ...defaults, ...overrides };
  }

  // Create support contact
  createSupportContact(overrides: Partial<TestSupportContact> = {}): TestSupportContact {
    const defaults: TestSupportContact = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      name: faker.person.fullName(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      relationship: faker.helpers.arrayElement(NotificationTestFactory.RELATIONSHIPS),
      priority: faker.number.int({ min: 1, max: 5 }),
      crisisEnabled: faker.datatype.boolean({ probability: 0.8 }),
      availableHours: faker.helpers.arrayElement(['24/7', '9:00-17:00', '8:00-22:00', 'weekdays']),
      metadata: {
        createdAt: faker.date.past().toISOString(),
        verified: faker.datatype.boolean({ probability: 0.9 })
      }
    };

    return { ...defaults, ...overrides };
  }

  // Create crisis alert
  createCrisisAlert(overrides: Partial<TestCrisisAlert> = {}): TestCrisisAlert {
    const severity = overrides.severity || faker.helpers.arrayElement(['moderate', 'high', 'critical']);
    const riskFactors = faker.helpers.arrayElements(NotificationTestFactory.CRISIS_KEYWORDS, { min: 1, max: 4 });
    
    const defaults: TestCrisisAlert = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      severity,
      message: `Crisis situation involving: ${riskFactors.join(', ')}`,
      riskFactors,
      location: {
        lat: faker.location.latitude(),
        lng: faker.location.longitude()
      },
      supportContacts: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => faker.string.uuid()),
      escalationLevel: severity === 'critical' ? 'emergency' : 
                      severity === 'high' ? 'immediate' : 'standard',
      triggerKeywords: riskFactors,
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'test_factory',
        confidence: faker.number.float({ min: 0.5, max: 1.0 }),
        detectionMethod: 'keyword_analysis'
      }
    };

    return { ...defaults, ...overrides };
  }

  // Create recipient data
  private createRecipient() {
    return {
      email: faker.internet.email(),
      phone: faker.phone.number(),
      pushTokens: [faker.string.alphanumeric(64)],
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      timezone: faker.location.timeZone()
    };
  }

  // Create realistic notification sequences
  createNotificationSequence(userId: string, sequenceType: 'onboarding' | 'crisis_escalation' | 'recovery_journey'): TestNotification[] {
    switch (sequenceType) {
      case 'onboarding':
        return [
          this.createNotification({
            userId,
            type: 'welcome_message',
            content: 'Welcome to Serenity! Your recovery journey starts here.',
            channels: ['email'],
            priority: 'normal'
          }),
          this.createNotification({
            userId,
            type: 'setup_reminder',
            content: 'Complete your profile setup to get personalized support',
            channels: ['email', 'push'],
            scheduledFor: new Date(Date.now() + 86400000), // 1 day later
            priority: 'normal'
          }),
          this.createNotification({
            userId,
            type: 'first_checkin',
            content: 'Ready for your first daily check-in?',
            channels: ['sms', 'push'],
            scheduledFor: new Date(Date.now() + 259200000), // 3 days later
            priority: 'normal'
          })
        ];

      case 'crisis_escalation':
        const now = Date.now();
        return [
          this.createNotification({
            userId,
            type: 'crisis_alert',
            content: 'Crisis alert detected - support contacts notified',
            channels: ['sms', 'email', 'push'],
            priority: 'critical',
            scheduledFor: new Date(now)
          }),
          this.createNotification({
            userId,
            type: 'crisis_follow_up',
            content: 'Crisis follow-up - checking on your wellbeing',
            channels: ['sms'],
            priority: 'urgent',
            scheduledFor: new Date(now + 300000) // 5 minutes later
          }),
          this.createNotification({
            userId,
            type: 'crisis_escalation',
            content: 'Escalating to professional support',
            channels: ['sms', 'email'],
            priority: 'critical',
            scheduledFor: new Date(now + 900000) // 15 minutes later
          })
        ];

      case 'recovery_journey':
        return [
          this.createNotification({
            userId,
            type: 'daily_checkin_reminder',
            content: 'Time for your daily reflection',
            channels: ['sms'],
            priority: 'normal'
          }),
          this.createNotification({
            userId,
            type: 'weekly_progress',
            content: 'Your weekly recovery progress report is ready',
            channels: ['email'],
            priority: 'normal',
            scheduledFor: new Date(Date.now() + 604800000) // 1 week later
          }),
          this.createNotification({
            userId,
            type: 'milestone_achievement',
            content: 'Congratulations on 30 days of recovery!',
            channels: ['email', 'sms'],
            priority: 'normal',
            scheduledFor: new Date(Date.now() + 2592000000) // 30 days later
          })
        ];

      default:
        return [];
    }
  }

  // Create realistic test scenarios
  createTestScenario(scenarioType: 'high_volume' | 'failure_recovery' | 'rate_limiting' | 'multi_channel'): {
    notifications: TestNotification[];
    description: string;
    expectedOutcome: string;
  } {
    switch (scenarioType) {
      case 'high_volume':
        return {
          notifications: Array.from({ length: 1000 }, (_, i) => 
            this.createNotification({
              userId: `load-test-user-${i}`,
              type: 'load_test_notification',
              channels: ['email'],
              content: `Load test message ${i}`
            })
          ),
          description: 'High volume load test with 1000 notifications',
          expectedOutcome: 'All notifications processed within acceptable time limits'
        };

      case 'failure_recovery':
        return {
          notifications: [
            this.createNotification({
              type: 'test_failure_recovery',
              channels: ['email', 'sms'],
              content: 'Test message for failure recovery',
              retryPolicy: {
                maxRetries: 3,
                backoffStrategy: 'exponential',
                initialDelay: 1000
              }
            })
          ],
          description: 'Test notification retry and failure recovery mechanisms',
          expectedOutcome: 'Notification delivered after initial failures and retries'
        };

      case 'rate_limiting':
        return {
          notifications: Array.from({ length: 20 }, (_, i) => 
            this.createNotification({
              userId: 'rate-limit-test-user',
              type: 'rate_limit_test',
              channels: ['sms'],
              content: `Rate limit test message ${i}`
            })
          ),
          description: 'Test rate limiting with rapid succession of notifications',
          expectedOutcome: 'Notifications throttled according to rate limit policies'
        };

      case 'multi_channel':
        return {
          notifications: [
            this.createNotification({
              type: 'multi_channel_test',
              channels: ['email', 'sms', 'push'],
              content: 'Multi-channel delivery test',
              fallbackStrategy: {
                primary: 'email',
                fallback: 'sms',
                fallbackOnFailure: true
              }
            })
          ],
          description: 'Test multi-channel delivery with fallback strategy',
          expectedOutcome: 'Message delivered via multiple channels with proper fallback handling'
        };

      default:
        return {
          notifications: [],
          description: 'Unknown scenario type',
          expectedOutcome: 'No expected outcome'
        };
    }
  }

  // Generate realistic template data based on notification type
  generateTemplateData(notificationType: string): Record<string, any> {
    const baseData = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      timezone: faker.location.timeZone(),
      timestamp: new Date().toISOString()
    };

    switch (notificationType) {
      case 'milestone_celebration':
        return {
          ...baseData,
          milestoneType: faker.helpers.arrayElement(['7_days', '14_days', '30_days', '60_days', '90_days', '1_year']),
          daysClean: faker.number.int({ min: 7, max: 365 }),
          nextGoal: faker.helpers.arrayElement(['14_days', '30_days', '60_days', '90_days', '6_months', '1_year'])
        };

      case 'appointment_reminder':
        return {
          ...baseData,
          appointmentDate: faker.date.future().toISOString(),
          appointmentTime: faker.helpers.arrayElement(['9:00 AM', '10:30 AM', '2:00 PM', '3:30 PM']),
          providerName: faker.person.fullName(),
          appointmentType: faker.helpers.arrayElement(['Therapy Session', 'Check-in', 'Group Session', 'Consultation'])
        };

      case 'crisis_alert':
        return {
          ...baseData,
          severity: faker.helpers.arrayElement(['moderate', 'high', 'critical']),
          supportContacts: Array.from({ length: 3 }, () => faker.person.firstName()),
          emergencyNumber: '988',
          location: faker.location.city()
        };

      case 'weekly_progress':
        return {
          ...baseData,
          weekNumber: faker.number.int({ min: 1, max: 52 }),
          checkinsCompleted: faker.number.int({ min: 0, max: 7 }),
          moodAverage: faker.number.float({ min: 1, max: 10, fractionDigits: 1 }),
          improvementAreas: faker.helpers.arrayElements(['sleep', 'mood', 'stress', 'social'], { min: 1, max: 3 })
        };

      default:
        return baseData;
    }
  }
}
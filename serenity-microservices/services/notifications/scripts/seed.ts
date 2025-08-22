import { v4 as uuidv4 } from 'uuid';
import { database } from '../src/models/database';
import { templateService } from '../src/services/TemplateService';
import { userPreferencesService } from '../src/services/UserPreferencesService';
import { logger } from '../src/utils/logger';
import { NotificationType, NotificationChannel } from '../src/types';

async function seedDatabase(): Promise<void> {
  try {
    logger.info('Starting database seeding...');

    // Seed notification templates
    await seedNotificationTemplates();

    // Seed test user preferences
    await seedUserPreferences();

    logger.info('Database seeding completed successfully');
    process.exit(0);

  } catch (error) {
    logger.error('Database seeding failed', { error });
    process.exit(1);
  }
}

async function seedNotificationTemplates(): Promise<void> {
  logger.info('Seeding notification templates...');

  const templates = [
    {
      name: 'Crisis Alert Email',
      type: NotificationType.CRISIS_ALERT,
      channel: NotificationChannel.EMAIL,
      subject: '🚨 URGENT: {{userName}} needs immediate support',
      body: `CRISIS ALERT - IMMEDIATE ACTION REQUIRED

{{userName}} has triggered a crisis alert and needs immediate support.

Details:
- Time: {{formatTime alertTime}}
- Location: {{location}}
- Emergency Contact: {{emergencyContact}}
- Message: "{{message}}"

NEXT STEPS:
1. Contact {{userName}} immediately at {{phoneNumber}}
2. If you cannot reach them within 5 minutes, call emergency services
3. Notify their primary support contact: {{emergencyContact}}

This is an automated crisis alert from the Serenity platform.
Do not reply to this email - take immediate action.

Crisis Hotline: 988
Emergency Services: 911`,
      htmlBody: `
<div style="background: #f44336; color: white; padding: 20px; border-radius: 8px; font-family: Arial, sans-serif;">
  <h1 style="margin: 0 0 10px 0;">🚨 CRISIS ALERT</h1>
  <p style="font-size: 18px; margin: 0;"><strong>{{userName}} needs immediate support</strong></p>
</div>

<div style="padding: 20px; font-family: Arial, sans-serif; line-height: 1.5;">
  <h2>Emergency Details</h2>
  <ul>
    <li><strong>Time:</strong> {{formatTime alertTime}}</li>
    <li><strong>Location:</strong> {{location}}</li>
    <li><strong>Emergency Contact:</strong> {{emergencyContact}}</li>
    <li><strong>Message:</strong> "{{message}}"</li>
  </ul>

  <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin: 0 0 10px 0; color: #856404;">IMMEDIATE ACTION REQUIRED</h3>
    <ol>
      <li>Contact {{userName}} immediately at {{phoneNumber}}</li>
      <li>If you cannot reach them within 5 minutes, call emergency services</li>
      <li>Notify their primary support contact: {{emergencyContact}}</li>
    </ol>
  </div>

  <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px;">
    <p style="margin: 0;"><strong>Crisis Hotline:</strong> 988</p>
    <p style="margin: 5px 0 0 0;"><strong>Emergency Services:</strong> 911</p>
  </div>

  <p style="font-size: 12px; color: #666; margin-top: 20px;">
    This is an automated crisis alert from the Serenity platform. Do not reply to this email - take immediate action.
  </p>
</div>`,
      variables: ['userName', 'alertTime', 'location', 'emergencyContact', 'message', 'phoneNumber'],
      isHipaaCompliant: true
    },
    {
      name: 'Daily Check-in Reminder',
      type: NotificationType.CHECKIN_REMINDER,
      channel: NotificationChannel.PUSH,
      subject: 'Time for your daily check-in',
      body: 'Hi {{firstName}}! 👋 Don\'t forget to complete your daily check-in. Your recovery journey matters, and every day counts! 💪',
      variables: ['firstName'],
      isHipaaCompliant: false
    },
    {
      name: 'Milestone Celebration SMS',
      type: NotificationType.MILESTONE_CELEBRATION,
      channel: NotificationChannel.SMS,
      body: '🎉 {{celebratedays daysSober}} You\'re doing amazing, {{firstName}}! Your strength inspires others. Keep going! 💪✨',
      variables: ['daysSober', 'firstName'],
      isHipaaCompliant: false
    },
    {
      name: 'Appointment Reminder Email',
      type: NotificationType.APPOINTMENT_REMINDER,
      channel: NotificationChannel.EMAIL,
      subject: 'Appointment Reminder - {{appointmentDate}}',
      body: `Hello {{firstName}},

This is a reminder about your upcoming appointment:

📅 Date: {{formatDate appointmentDate}}
⏰ Time: {{formatTime appointmentTime}}
👩‍⚕️ Provider: {{providerName}}
📍 Location: {{location}}
📝 Type: {{appointmentType}}

Please arrive 15 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.

Need directions? {{mapLink}}

See you soon!

The Serenity Care Team`,
      htmlBody: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #2c3e50;">Appointment Reminder</h2>
  
  <p>Hello {{firstName}},</p>
  
  <p>This is a reminder about your upcoming appointment:</p>
  
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <table style="width: 100%;">
      <tr><td style="padding: 5px 0;"><strong>📅 Date:</strong></td><td>{{formatDate appointmentDate}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>⏰ Time:</strong></td><td>{{formatTime appointmentTime}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>👩‍⚕️ Provider:</strong></td><td>{{providerName}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>📍 Location:</strong></td><td>{{location}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>📝 Type:</strong></td><td>{{appointmentType}}</td></tr>
    </table>
  </div>
  
  <p>Please arrive 15 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.</p>
  
  <p><a href="{{mapLink}}" style="color: #3498db;">Need directions? Click here</a></p>
  
  <p>See you soon!</p>
  <p><em>The Serenity Care Team</em></p>
</div>`,
      variables: ['firstName', 'appointmentDate', 'appointmentTime', 'providerName', 'location', 'appointmentType', 'mapLink'],
      isHipaaCompliant: true
    },
    {
      name: 'Support Message In-App',
      type: NotificationType.SUPPORT_MESSAGE,
      channel: NotificationChannel.IN_APP,
      subject: 'Message from {{senderName}}',
      body: 'You have a new message from {{senderName}}: "{{messagePreview}}"',
      variables: ['senderName', 'messagePreview'],
      isHipaaCompliant: true
    }
  ];

  for (const template of templates) {
    try {
      await templateService.createTemplate(template);
      logger.info('Created template', { name: template.name });
    } catch (error: any) {
      // Ignore duplicate template errors
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        logger.error('Failed to create template', { name: template.name, error });
      }
    }
  }

  logger.info('Notification templates seeding completed');
}

async function seedUserPreferences(): Promise<void> {
  logger.info('Seeding test user preferences...');

  const testUsers = [
    {
      userId: 'test-patient-001',
      email: { enabled: true, address: 'patient@test.com', verified: true },
      sms: { enabled: true, phoneNumber: '+1234567890', verified: true },
      push: { enabled: true, deviceTokens: ['test-device-token-patient'] },
      inApp: { enabled: true }
    },
    {
      userId: 'test-provider-001',
      email: { enabled: true, address: 'provider@test.com', verified: true },
      sms: { enabled: true, phoneNumber: '+1234567891', verified: true },
      push: { enabled: true, deviceTokens: ['test-device-token-provider'] },
      inApp: { enabled: true }
    },
    {
      userId: 'test-supporter-001',
      email: { enabled: true, address: 'supporter@test.com', verified: true },
      sms: { enabled: true, phoneNumber: '+1234567892', verified: true },
      push: { enabled: true, deviceTokens: ['test-device-token-supporter'] },
      inApp: { enabled: true }
    }
  ];

  for (const user of testUsers) {
    try {
      await userPreferencesService.createUserPreferences(user.userId, user);
      logger.info('Created user preferences', { userId: user.userId });
    } catch (error: any) {
      // Ignore duplicate user errors
      if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
        logger.error('Failed to create user preferences', { userId: user.userId, error });
      }
    }
  }

  logger.info('Test user preferences seeding completed');
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}
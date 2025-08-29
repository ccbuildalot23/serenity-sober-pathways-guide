import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import {Platform, Alert, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationConfig {
  channelId: string;
  title: string;
  message: string;
  data?: any;
  date?: Date;
  repeatType?: 'time' | 'day' | 'week' | 'month';
  repeatTime?: number;
  actions?: string[];
  userInfo?: any;
  playSound?: boolean;
  soundName?: string;
  vibrate?: boolean;
  priority?: 'high' | 'low' | 'max' | 'min' | 'default';
  importance?: 'high' | 'low' | 'max' | 'min' | 'default';
  visibility?: 'private' | 'public' | 'secret';
  badge?: number;
}

export interface MedicationReminderConfig {
  userId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  reminderTimes: string[];
  startDate: string;
  endDate?: string;
}

export interface CrisisAlertConfig {
  userId: string;
  alertId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export class NotificationService {
  private static isInitialized = false;

  /**
   * Initialize push notifications
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      await this.requestPermissions();

      // Configure push notifications
      PushNotification.configure({
        onRegister: (token) => {
          console.log('Push notification token:', token);
          this.saveDeviceToken(token.token);
        },
        
        onNotification: (notification) => {
          console.log('Notification received:', notification);
          this.handleNotification(notification);
          
          // Required for iOS
          if (Platform.OS === 'ios') {
            notification.finish(PushNotificationIOS.FetchResult.NoData);
          }
        },
        
        onAction: (notification) => {
          console.log('Notification action:', notification);
          this.handleNotificationAction(notification);
        },
        
        onRegistrationError: (error) => {
          console.error('Push notification registration error:', error);
        },
        
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        
        popInitialNotification: true,
        requestPermissions: true,
      });

      // Create notification channels for Android
      if (Platform.OS === 'android') {
        this.createNotificationChannels();
      }

      this.isInitialized = true;
      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'Serenity needs notification permission to send you important reminders and alerts.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        return new Promise((resolve) => {
          PushNotification.requestPermissions((permissions) => {
            resolve(permissions.alert && permissions.badge && permissions.sound);
          });
        });
      }
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * Create notification channels for Android
   */
  private static createNotificationChannels(): void {
    const channels = [
      {
        channelId: 'medication_reminders',
        channelName: 'Medication Reminders',
        channelDescription: 'Reminders to take your medications',
        importance: 'high' as const,
        playSound: true,
        soundName: 'medication_reminder.mp3',
        vibrate: true,
      },
      {
        channelId: 'crisis_alerts',
        channelName: 'Crisis Alerts',
        channelDescription: 'Emergency crisis alerts and notifications',
        importance: 'max' as const,
        playSound: true,
        soundName: 'crisis_alert.mp3',
        vibrate: true,
      },
      {
        channelId: 'appointment_reminders',
        channelName: 'Appointment Reminders',
        channelDescription: 'Reminders for upcoming appointments',
        importance: 'high' as const,
        playSound: true,
        vibrate: true,
      },
      {
        channelId: 'checkin_reminders',
        channelName: 'Check-in Reminders',
        channelDescription: 'Daily check-in reminders',
        importance: 'default' as const,
        playSound: true,
        vibrate: false,
      },
      {
        channelId: 'peer_messages',
        channelName: 'Peer Messages',
        channelDescription: 'Messages from peer support network',
        importance: 'high' as const,
        playSound: true,
        vibrate: true,
      },
    ];

    channels.forEach(channel => {
      PushNotification.createChannel(channel, () => {
        console.log(`Created channel: ${channel.channelId}`);
      });
    });
  }

  /**
   * Schedule a local notification
   */
  static scheduleNotification(config: NotificationConfig): void {
    try {
      PushNotification.localNotificationSchedule({
        channelId: config.channelId,
        title: config.title,
        message: config.message,
        date: config.date || new Date(Date.now() + 1000),
        repeatType: config.repeatType,
        repeatTime: config.repeatTime,
        actions: config.actions,
        userInfo: config.userInfo || {},
        playSound: config.playSound !== false,
        soundName: config.soundName || 'default',
        vibrate: config.vibrate !== false,
        priority: config.priority || 'high',
        importance: config.importance || 'high',
        visibility: config.visibility || 'private',
        number: config.badge,
        ...config.data,
      });
      
      console.log('Notification scheduled:', config.title);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  /**
   * Send immediate notification
   */
  static sendNotification(config: NotificationConfig): void {
    try {
      PushNotification.localNotification({
        channelId: config.channelId,
        title: config.title,
        message: config.message,
        actions: config.actions,
        userInfo: config.userInfo || {},
        playSound: config.playSound !== false,
        soundName: config.soundName || 'default',
        vibrate: config.vibrate !== false,
        priority: config.priority || 'high',
        importance: config.importance || 'high',
        visibility: config.visibility || 'private',
        number: config.badge,
        ...config.data,
      });
      
      console.log('Notification sent:', config.title);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Schedule medication reminders
   */
  static async scheduleMedicationReminders(config: MedicationReminderConfig): Promise<void> {
    try {
      // Cancel existing reminders for this medication
      await this.cancelMedicationReminders(config.userId, config.medicationId);

      // Schedule new reminders
      config.reminderTimes.forEach((time, index) => {
        const [hours, minutes] = time.split(':').map(Number);
        const reminderDate = new Date();
        reminderDate.setHours(hours, minutes, 0, 0);

        // If the time has passed today, schedule for tomorrow
        if (reminderDate.getTime() <= Date.now()) {
          reminderDate.setDate(reminderDate.getDate() + 1);
        }

        this.scheduleNotification({
          channelId: 'medication_reminders',
          title: 'Medication Reminder',
          message: `Time to take ${config.medicationName} (${config.dosage})`,
          date: reminderDate,
          repeatType: 'day',
          userInfo: {
            type: 'medication_reminder',
            userId: config.userId,
            medicationId: config.medicationId,
            medicationName: config.medicationName,
            dosage: config.dosage,
            reminderIndex: index,
          },
          actions: ['Take', 'Skip', 'Snooze'],
          priority: 'high',
          vibrate: true,
        });
      });

      // Save reminder configuration
      await AsyncStorage.setItem(
        `medication_reminders_${config.medicationId}`,
        JSON.stringify(config)
      );

      console.log(`Scheduled ${config.reminderTimes.length} medication reminders for ${config.medicationName}`);
    } catch (error) {
      console.error('Failed to schedule medication reminders:', error);
      throw error;
    }
  }

  /**
   * Cancel medication reminders
   */
  static async cancelMedicationReminders(userId: string, medicationId?: string): Promise<void> {
    try {
      if (medicationId) {
        // Cancel specific medication reminders
        PushNotification.cancelLocalNotifications({
          userInfo: {
            type: 'medication_reminder',
            userId,
            medicationId,
          },
        });

        await AsyncStorage.removeItem(`medication_reminders_${medicationId}`);
      } else {
        // Cancel all medication reminders for user
        PushNotification.cancelLocalNotifications({
          userInfo: {
            type: 'medication_reminder',
            userId,
          },
        });
      }

      console.log('Medication reminders cancelled');
    } catch (error) {
      console.error('Failed to cancel medication reminders:', error);
    }
  }

  /**
   * Schedule appointment reminder
   */
  static scheduleAppointmentReminder(appointmentId: string, providerName: string, appointmentTime: Date): void {
    try {
      // Schedule reminder 1 hour before
      const reminderTime = new Date(appointmentTime.getTime() - 60 * 60 * 1000);

      if (reminderTime.getTime() > Date.now()) {
        this.scheduleNotification({
          channelId: 'appointment_reminders',
          title: 'Appointment Reminder',
          message: `Your appointment with ${providerName} is in 1 hour`,
          date: reminderTime,
          userInfo: {
            type: 'appointment_reminder',
            appointmentId,
            providerName,
          },
          actions: ['Join Call', 'View Details'],
          priority: 'high',
        });
      }

      // Schedule reminder 15 minutes before
      const urgentReminderTime = new Date(appointmentTime.getTime() - 15 * 60 * 1000);

      if (urgentReminderTime.getTime() > Date.now()) {
        this.scheduleNotification({
          channelId: 'appointment_reminders',
          title: 'Appointment Starting Soon',
          message: `Your appointment with ${providerName} starts in 15 minutes`,
          date: urgentReminderTime,
          userInfo: {
            type: 'appointment_reminder',
            appointmentId,
            providerName,
            urgent: true,
          },
          actions: ['Join Now', 'Cancel'],
          priority: 'max',
        });
      }

      console.log('Appointment reminders scheduled');
    } catch (error) {
      console.error('Failed to schedule appointment reminder:', error);
    }
  }

  /**
   * Schedule daily check-in reminder
   */
  static scheduleCheckinReminder(userId: string, reminderTime: string = '20:00'): void {
    try {
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const reminderDate = new Date();
      reminderDate.setHours(hours, minutes, 0, 0);

      // If the time has passed today, schedule for tomorrow
      if (reminderDate.getTime() <= Date.now()) {
        reminderDate.setDate(reminderDate.getDate() + 1);
      }

      this.scheduleNotification({
        channelId: 'checkin_reminders',
        title: 'Daily Check-in',
        message: 'How are you feeling today? Complete your daily check-in.',
        date: reminderDate,
        repeatType: 'day',
        userInfo: {
          type: 'checkin_reminder',
          userId,
        },
        actions: ['Check In', 'Later'],
        priority: 'default',
      });

      console.log('Daily check-in reminder scheduled');
    } catch (error) {
      console.error('Failed to schedule check-in reminder:', error);
    }
  }

  /**
   * Send crisis alert notification
   */
  static async sendCrisisAlert(config: CrisisAlertConfig): Promise<void> {
    try {
      this.sendNotification({
        channelId: 'crisis_alerts',
        title: 'Crisis Alert',
        message: 'Emergency support has been requested. Immediate assistance is being dispatched.',
        userInfo: {
          type: 'crisis_alert',
          userId: config.userId,
          alertId: config.alertId,
          location: config.location,
        },
        actions: ['I\'m Safe', 'Call 911', 'Contact Support'],
        priority: 'max',
        importance: 'max',
        vibrate: true,
        soundName: 'crisis_alert.mp3',
      });

      console.log('Crisis alert notification sent');
    } catch (error) {
      console.error('Failed to send crisis alert notification:', error);
      throw error;
    }
  }

  /**
   * Send peer message notification
   */
  static sendPeerMessageNotification(senderName: string, message: string, conversationId: string): void {
    try {
      this.sendNotification({
        channelId: 'peer_messages',
        title: `Message from ${senderName}`,
        message: message.length > 50 ? `${message.substring(0, 50)}...` : message,
        userInfo: {
          type: 'peer_message',
          senderName,
          conversationId,
        },
        actions: ['Reply', 'Mark Read'],
        priority: 'high',
      });
    } catch (error) {
      console.error('Failed to send peer message notification:', error);
    }
  }

  /**
   * Handle incoming notification
   */
  private static handleNotification(notification: any): void {
    try {
      const {type} = notification.userInfo || {};

      switch (type) {
        case 'medication_reminder':
          this.handleMedicationReminder(notification);
          break;
        case 'appointment_reminder':
          this.handleAppointmentReminder(notification);
          break;
        case 'checkin_reminder':
          this.handleCheckinReminder(notification);
          break;
        case 'crisis_alert':
          this.handleCrisisAlert(notification);
          break;
        case 'peer_message':
          this.handlePeerMessage(notification);
          break;
        default:
          console.log('Unknown notification type:', type);
      }
    } catch (error) {
      console.error('Failed to handle notification:', error);
    }
  }

  /**
   * Handle notification action
   */
  private static handleNotificationAction(notification: any): void {
    try {
      const {action, userInfo} = notification;
      const {type} = userInfo || {};

      console.log(`Handling action: ${action} for type: ${type}`);

      // TODO: Implement action handling based on notification type and action
      // This would typically navigate to specific screens or perform actions
    } catch (error) {
      console.error('Failed to handle notification action:', error);
    }
  }

  private static handleMedicationReminder(notification: any): void {
    // Handle medication reminder notification
    console.log('Medication reminder received:', notification.userInfo);
  }

  private static handleAppointmentReminder(notification: any): void {
    // Handle appointment reminder notification
    console.log('Appointment reminder received:', notification.userInfo);
  }

  private static handleCheckinReminder(notification: any): void {
    // Handle check-in reminder notification
    console.log('Check-in reminder received:', notification.userInfo);
  }

  private static handleCrisisAlert(notification: any): void {
    // Handle crisis alert notification
    console.log('Crisis alert received:', notification.userInfo);
  }

  private static handlePeerMessage(notification: any): void {
    // Handle peer message notification
    console.log('Peer message received:', notification.userInfo);
  }

  /**
   * Save device token for push notifications
   */
  private static async saveDeviceToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('device_push_token', token);
      // TODO: Send token to server for push notification targeting
      console.log('Device token saved:', token);
    } catch (error) {
      console.error('Failed to save device token:', error);
    }
  }

  /**
   * Get badge count
   */
  static getBadgeCount(): Promise<number> {
    return new Promise((resolve) => {
      PushNotification.getApplicationIconBadgeNumber((badgeCount) => {
        resolve(badgeCount);
      });
    });
  }

  /**
   * Set badge count
   */
  static setBadgeCount(count: number): void {
    PushNotification.setApplicationIconBadgeNumber(count);
  }

  /**
   * Clear all notifications
   */
  static clearAllNotifications(): void {
    PushNotification.removeAllDeliveredNotifications();
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Get scheduled notifications
   */
  static getScheduledNotifications(): Promise<any[]> {
    return new Promise((resolve) => {
      PushNotification.getScheduledLocalNotifications((notifications) => {
        resolve(notifications);
      });
    });
  }
}

// Initialize notifications when app starts
export const initializePushNotifications = async () => {
  try {
    await NotificationService.initialize();
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
  }
};
import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { 
  NotificationRequest, 
  BulkNotificationRequest, 
  QueueMessage, 
  NotificationPriority 
} from '@/types';
import { NotificationProcessor } from './NotificationProcessor';

export class QueueService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private notificationProcessor: NotificationProcessor;
  private isConnected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private readonly maxReconnectAttempts = 10;
  private reconnectAttempts = 0;

  // Queue names
  private readonly NOTIFICATION_QUEUE = 'notifications.process';
  private readonly BULK_NOTIFICATION_QUEUE = 'notifications.bulk';
  private readonly RETRY_QUEUE = 'notifications.retry';
  private readonly DLQ = 'notifications.dlq'; // Dead Letter Queue
  private readonly PRIORITY_QUEUE = 'notifications.priority';

  constructor() {
    this.notificationProcessor = new NotificationProcessor();
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      logger.info('Connecting to RabbitMQ...', { url: config.rabbitmq.url });
      
      this.connection = await amqp.connect(config.rabbitmq.url, {
        heartbeat: 60,
        clientProperties: {
          service: 'serenity-notification-service',
          version: '1.0.0'
        }
      });

      this.channel = await this.connection.createChannel();
      
      // Set prefetch count for better load balancing
      await this.channel.prefetch(10);

      this.setupConnectionHandlers();
      await this.setupQueues();
      await this.setupConsumers();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info('Successfully connected to RabbitMQ and setup queues');

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error });
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection || !this.channel) return;

    this.connection.on('error', (error) => {
      logger.error('RabbitMQ connection error', { error });
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      this.isConnected = false;
      this.scheduleReconnect();
    });

    this.channel.on('error', (error) => {
      logger.error('RabbitMQ channel error', { error });
    });

    this.channel.on('close', () => {
      logger.warn('RabbitMQ channel closed');
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    logger.info(`Scheduling RabbitMQ reconnection attempt ${this.reconnectAttempts + 1}`, { delay });
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private async setupQueues(): Promise<void> {
    if (!this.channel) throw new Error('Channel not available');

    // Main notification processing queue
    await this.channel.assertQueue(this.NOTIFICATION_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': this.DLQ,
        'x-message-ttl': 86400000, // 24 hours
        'x-max-retries': 3
      }
    });

    // Bulk notification queue
    await this.channel.assertQueue(this.BULK_NOTIFICATION_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': this.DLQ,
        'x-message-ttl': 86400000
      }
    });

    // Retry queue with delay
    await this.channel.assertQueue(this.RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': this.NOTIFICATION_QUEUE,
        'x-message-ttl': 60000 // 1 minute delay for retries
      }
    });

    // Priority queue for urgent notifications
    await this.channel.assertQueue(this.PRIORITY_QUEUE, {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': this.DLQ
      }
    });

    // Dead letter queue
    await this.channel.assertQueue(this.DLQ, {
      durable: true
    });

    logger.info('All RabbitMQ queues setup completed');
  }

  private async setupConsumers(): Promise<void> {
    if (!this.channel) throw new Error('Channel not available');

    // Main notification consumer
    await this.channel.consume(this.NOTIFICATION_QUEUE, async (msg) => {
      if (msg) {
        await this.handleNotificationMessage(msg);
      }
    }, { noAck: false });

    // Bulk notification consumer
    await this.channel.consume(this.BULK_NOTIFICATION_QUEUE, async (msg) => {
      if (msg) {
        await this.handleBulkNotificationMessage(msg);
      }
    }, { noAck: false });

    // Priority notification consumer
    await this.channel.consume(this.PRIORITY_QUEUE, async (msg) => {
      if (msg) {
        await this.handleNotificationMessage(msg);
      }
    }, { noAck: false });

    // Dead letter queue consumer (for monitoring)
    await this.channel.consume(this.DLQ, async (msg) => {
      if (msg) {
        await this.handleDeadLetterMessage(msg);
      }
    }, { noAck: false });

    logger.info('All RabbitMQ consumers setup completed');
  }

  async queueNotification(notification: NotificationRequest): Promise<boolean> {
    if (!this.isConnected || !this.channel) {
      logger.error('Cannot queue notification - RabbitMQ not connected');
      return false;
    }

    try {
      const message: QueueMessage = {
        id: notification.id || this.generateMessageId(),
        type: 'notification',
        payload: notification,
        priority: this.getPriorityValue(notification.priority),
        attempts: 0,
        maxAttempts: notification.maxRetries || 3,
        createdAt: new Date(),
        processAt: notification.scheduledAt || new Date()
      };

      const queueName = this.selectQueue(notification.priority);
      const options: any = {
        persistent: true,
        messageId: message.id,
        timestamp: Date.now()
      };

      // Add priority for priority queue
      if (queueName === this.PRIORITY_QUEUE) {
        options.priority = message.priority;
      }

      const sent = this.channel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify(message)),
        options
      );

      if (sent) {
        logger.info('Notification queued successfully', {
          messageId: message.id,
          queue: queueName,
          userId: notification.userId,
          type: notification.type,
          priority: notification.priority
        });
        return true;
      } else {
        logger.warn('Failed to queue notification - queue full');
        return false;
      }

    } catch (error) {
      logger.error('Failed to queue notification', { notification, error });
      return false;
    }
  }

  async queueBulkNotifications(bulkRequest: BulkNotificationRequest): Promise<boolean> {
    if (!this.isConnected || !this.channel) {
      logger.error('Cannot queue bulk notifications - RabbitMQ not connected');
      return false;
    }

    try {
      const message: QueueMessage = {
        id: bulkRequest.batchId || this.generateMessageId(),
        type: 'bulk_notification',
        payload: bulkRequest,
        priority: 5, // Default priority for bulk
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        processAt: new Date()
      };

      const sent = this.channel.sendToQueue(
        this.BULK_NOTIFICATION_QUEUE,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          messageId: message.id,
          timestamp: Date.now()
        }
      );

      if (sent) {
        logger.info('Bulk notifications queued successfully', {
          batchId: message.id,
          count: bulkRequest.notifications.length,
          scheduleMode: bulkRequest.scheduleMode
        });
        return true;
      } else {
        logger.warn('Failed to queue bulk notifications - queue full');
        return false;
      }

    } catch (error) {
      logger.error('Failed to queue bulk notifications', { bulkRequest, error });
      return false;
    }
  }

  private async handleNotificationMessage(msg: ConsumeMessage): Promise<void> {
    try {
      const queueMessage: QueueMessage = JSON.parse(msg.content.toString());
      
      logger.debug('Processing notification message', {
        messageId: queueMessage.id,
        attempts: queueMessage.attempts
      });

      const success = await this.notificationProcessor.processNotification(
        queueMessage.payload as NotificationRequest
      );

      if (success) {
        this.channel?.ack(msg);
        logger.info('Notification processed successfully', {
          messageId: queueMessage.id
        });
      } else {
        await this.handleFailedMessage(msg, queueMessage);
      }

    } catch (error) {
      logger.error('Error processing notification message', { error });
      await this.handleFailedMessage(msg, null);
    }
  }

  private async handleBulkNotificationMessage(msg: ConsumeMessage): Promise<void> {
    try {
      const queueMessage: QueueMessage = JSON.parse(msg.content.toString());
      
      logger.debug('Processing bulk notification message', {
        batchId: queueMessage.id,
        attempts: queueMessage.attempts
      });

      const success = await this.notificationProcessor.processBulkNotification(
        queueMessage.payload as BulkNotificationRequest
      );

      if (success) {
        this.channel?.ack(msg);
        logger.info('Bulk notifications processed successfully', {
          batchId: queueMessage.id
        });
      } else {
        await this.handleFailedMessage(msg, queueMessage);
      }

    } catch (error) {
      logger.error('Error processing bulk notification message', { error });
      await this.handleFailedMessage(msg, null);
    }
  }

  private async handleFailedMessage(
    msg: ConsumeMessage, 
    queueMessage: QueueMessage | null
  ): Promise<void> {
    if (!this.channel) return;

    try {
      if (queueMessage && queueMessage.attempts < queueMessage.maxAttempts) {
        // Retry the message
        queueMessage.attempts++;
        
        logger.info('Retrying failed notification', {
          messageId: queueMessage.id,
          attempt: queueMessage.attempts,
          maxAttempts: queueMessage.maxAttempts
        });

        // Send to retry queue with delay
        this.channel.sendToQueue(
          this.RETRY_QUEUE,
          Buffer.from(JSON.stringify(queueMessage)),
          {
            persistent: true,
            messageId: queueMessage.id + '_retry_' + queueMessage.attempts
          }
        );

        this.channel.ack(msg);
      } else {
        // Exceeded max retries, reject to DLQ
        logger.error('Notification failed permanently, sending to DLQ', {
          messageId: queueMessage?.id,
          attempts: queueMessage?.attempts
        });
        
        this.channel.nack(msg, false, false); // Send to DLQ
      }
    } catch (error) {
      logger.error('Error handling failed message', { error });
      this.channel.nack(msg, false, false);
    }
  }

  private async handleDeadLetterMessage(msg: ConsumeMessage): Promise<void> {
    try {
      const queueMessage: QueueMessage = JSON.parse(msg.content.toString());
      
      logger.error('Message in dead letter queue', {
        messageId: queueMessage.id,
        type: queueMessage.type,
        attempts: queueMessage.attempts,
        payload: queueMessage.payload
      });

      // Here you might want to store failed messages for manual review
      // or send alerts to administrators

      this.channel?.ack(msg);
    } catch (error) {
      logger.error('Error processing dead letter message', { error });
      this.channel?.ack(msg); // Ack to prevent infinite loop
    }
  }

  private selectQueue(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.EMERGENCY:
      case NotificationPriority.CRITICAL:
        return this.PRIORITY_QUEUE;
      default:
        return this.NOTIFICATION_QUEUE;
    }
  }

  private getPriorityValue(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.EMERGENCY: return 10;
      case NotificationPriority.CRITICAL: return 8;
      case NotificationPriority.HIGH: return 6;
      case NotificationPriority.NORMAL: return 4;
      case NotificationPriority.LOW: return 2;
      default: return 4;
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getQueueStats(): Promise<{
    [queueName: string]: {
      messageCount: number;
      consumerCount: number;
    };
  }> {
    if (!this.channel) {
      throw new Error('Channel not available');
    }

    const queues = [
      this.NOTIFICATION_QUEUE,
      this.BULK_NOTIFICATION_QUEUE,
      this.RETRY_QUEUE,
      this.PRIORITY_QUEUE,
      this.DLQ
    ];

    const stats: any = {};
    
    for (const queue of queues) {
      try {
        const info = await this.channel.checkQueue(queue);
        stats[queue] = {
          messageCount: info.messageCount,
          consumerCount: info.consumerCount
        };
      } catch (error) {
        logger.error(`Failed to get stats for queue ${queue}`, { error });
        stats[queue] = { messageCount: -1, consumerCount: -1 };
      }
    }

    return stats;
  }

  async purgeQueue(queueName: string): Promise<{ messageCount: number }> {
    if (!this.channel) {
      throw new Error('Channel not available');
    }

    try {
      const result = await this.channel.purgeQueue(queueName);
      logger.info(`Purged queue ${queueName}`, { messageCount: result.messageCount });
      return result;
    } catch (error) {
      logger.error(`Failed to purge queue ${queueName}`, { error });
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    return this.isConnected && this.connection !== null && this.channel !== null;
  }

  async close(): Promise<void> {
    try {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      this.isConnected = false;
      logger.info('RabbitMQ connection closed successfully');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection', { error });
    }
  }
}

export const queueService = new QueueService();
import { database } from './database';
import {
  NotificationLog,
  NotificationRequest,
  NotificationStatus,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  AuditEntry,
  PaginatedResponse
} from '@/types';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class NotificationModel {
  async create(notification: NotificationRequest): Promise<NotificationLog> {
    const id = notification.id || uuidv4();
    const notificationId = uuidv4();
    
    const query = `
      INSERT INTO notification_logs (
        id, notification_id, user_id, type, channel, status, priority,
        template_id, data, scheduled_at, retry_count, max_retries,
        metadata, is_hipaa_compliant, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      id,
      notificationId,
      notification.userId,
      notification.type,
      notification.channel,
      NotificationStatus.PENDING,
      notification.priority,
      notification.templateId,
      JSON.stringify(notification.data),
      notification.scheduledAt || null,
      notification.retryCount || 0,
      notification.maxRetries || 3,
      JSON.stringify(notification.metadata || {}),
      this.isHipaaCompliantType(notification.type)
    ];

    try {
      const result = await database.query(query, values);
      const created = result.rows[0];
      
      logger.info('Notification created', {
        id: created.id,
        userId: created.user_id,
        type: created.type,
        channel: created.channel
      });

      return this.mapToNotificationLog(created);
    } catch (error) {
      logger.error('Failed to create notification', { notification, error });
      throw error;
    }
  }

  async findById(id: string): Promise<NotificationLog | null> {
    const query = `
      SELECT nl.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'timestamp', al.timestamp,
                   'action', al.action,
                   'userId', al.user_id,
                   'details', al.details,
                   'ipAddress', al.ip_address,
                   'userAgent', al.user_agent
                 )
                 ORDER BY al.timestamp DESC
               ) FILTER (WHERE al.id IS NOT NULL), 
               '[]'
             ) as audit_trail
      FROM notification_logs nl
      LEFT JOIN audit_logs al ON nl.id = al.notification_log_id
      WHERE nl.id = $1
      GROUP BY nl.id
    `;

    try {
      const result = await database.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToNotificationLog(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find notification by ID', { id, error });
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      type?: NotificationType;
      channel?: NotificationChannel;
      status?: NotificationStatus;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<PaginatedResponse<NotificationLog>> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE user_id = $1';
    let paramIndex = 2;
    const params: any[] = [userId];

    if (filters?.type) {
      whereClause += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters?.channel) {
      whereClause += ` AND channel = $${paramIndex}`;
      params.push(filters.channel);
      paramIndex++;
    }

    if (filters?.status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.dateFrom) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters?.dateTo) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) FROM notification_logs ${whereClause}`;
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const dataQuery = `
      SELECT nl.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'timestamp', al.timestamp,
                   'action', al.action,
                   'userId', al.user_id,
                   'details', al.details,
                   'ipAddress', al.ip_address,
                   'userAgent', al.user_agent
                 )
                 ORDER BY al.timestamp DESC
               ) FILTER (WHERE al.id IS NOT NULL), 
               '[]'
             ) as audit_trail
      FROM notification_logs nl
      LEFT JOIN audit_logs al ON nl.id = al.notification_log_id
      ${whereClause}
      GROUP BY nl.id
      ORDER BY nl.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    try {
      const result = await database.query(dataQuery, params);
      const notifications = result.rows.map(row => this.mapToNotificationLog(row));

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to find notifications by user ID', { userId, error });
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<boolean> {
    const updateFields = ['status = $2', 'updated_at = NOW()'];
    const params = [id, status];
    let paramIndex = 3;

    if (status === NotificationStatus.SENT) {
      updateFields.push(`sent_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;
    }

    if (status === NotificationStatus.DELIVERED) {
      updateFields.push(`delivered_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;
    }

    if (status === NotificationStatus.FAILED) {
      updateFields.push(`failed_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;
      
      if (errorMessage) {
        updateFields.push(`error_message = $${paramIndex}`);
        params.push(errorMessage);
        paramIndex++;
      }
    }

    const query = `
      UPDATE notification_logs 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id
    `;

    try {
      const result = await database.query(query, params);
      const updated = result.rowCount > 0;

      if (updated) {
        logger.info('Notification status updated', { id, status, errorMessage });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update notification status', { id, status, error });
      throw error;
    }
  }

  async incrementRetryCount(id: string): Promise<boolean> {
    const query = `
      UPDATE notification_logs 
      SET retry_count = retry_count + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING retry_count, max_retries
    `;

    try {
      const result = await database.query(query, [id]);
      if (result.rows.length === 0) {
        return false;
      }

      const { retry_count, max_retries } = result.rows[0];
      
      logger.info('Notification retry count incremented', {
        id,
        retryCount: retry_count,
        maxRetries: max_retries
      });

      return true;
    } catch (error) {
      logger.error('Failed to increment retry count', { id, error });
      throw error;
    }
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    // For in-app notifications, we track read status in metadata
    const query = `
      UPDATE notification_logs 
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'),
        '{readAt}',
        to_jsonb(NOW()::text)
      ),
      updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND channel = 'in_app'
      RETURNING id
    `;

    try {
      const result = await database.query(query, [id, userId]);
      const updated = result.rowCount > 0;

      if (updated) {
        logger.info('Notification marked as read', { id, userId });
      }

      return updated;
    } catch (error) {
      logger.error('Failed to mark notification as read', { id, userId, error });
      throw error;
    }
  }

  async getPendingNotifications(limit: number = 100): Promise<NotificationLog[]> {
    const query = `
      SELECT * FROM notification_logs
      WHERE status IN ('pending', 'failed')
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
        AND retry_count < max_retries
      ORDER BY priority DESC, created_at ASC
      LIMIT $1
    `;

    try {
      const result = await database.query(query, [limit]);
      return result.rows.map(row => this.mapToNotificationLog(row));
    } catch (error) {
      logger.error('Failed to get pending notifications', { error });
      throw error;
    }
  }

  async addAuditEntry(
    notificationId: string,
    action: string,
    details: Record<string, any>,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        notification_log_id, action, user_id, details, 
        ip_address, user_agent, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;

    const values = [
      notificationId,
      action,
      userId || null,
      JSON.stringify(details),
      ipAddress || null,
      userAgent || null
    ];

    try {
      await database.query(query, values);
      logger.debug('Audit entry added', { notificationId, action });
    } catch (error) {
      logger.error('Failed to add audit entry', { notificationId, action, error });
      throw error;
    }
  }

  async getMetrics(
    dateFrom: Date,
    dateTo: Date,
    groupBy?: 'hour' | 'day' | 'type' | 'channel'
  ): Promise<any> {
    let groupByClause = '';
    let selectClause = 'COUNT(*) as total';

    if (groupBy === 'hour') {
      groupByClause = 'GROUP BY DATE_TRUNC(\'hour\', created_at)';
      selectClause += ', DATE_TRUNC(\'hour\', created_at) as period';
    } else if (groupBy === 'day') {
      groupByClause = 'GROUP BY DATE_TRUNC(\'day\', created_at)';
      selectClause += ', DATE_TRUNC(\'day\', created_at) as period';
    } else if (groupBy === 'type') {
      groupByClause = 'GROUP BY type';
      selectClause += ', type';
    } else if (groupBy === 'channel') {
      groupByClause = 'GROUP BY channel';
      selectClause += ', channel';
    }

    const query = `
      SELECT ${selectClause},
             status,
             COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
             COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
             AVG(EXTRACT(EPOCH FROM (delivered_at - created_at)) * 1000)::int as avg_delivery_time_ms
      FROM notification_logs
      WHERE created_at >= $1 AND created_at <= $2
      ${groupByClause}
      ORDER BY period DESC
    `;

    try {
      const result = await database.query(query, [dateFrom, dateTo]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get notification metrics', { dateFrom, dateTo, error });
      throw error;
    }
  }

  private mapToNotificationLog(row: any): NotificationLog {
    return {
      id: row.id,
      notificationId: row.notification_id,
      userId: row.user_id,
      type: row.type as NotificationType,
      channel: row.channel as NotificationChannel,
      status: row.status as NotificationStatus,
      priority: row.priority as NotificationPriority,
      templateId: row.template_id,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      scheduledAt: row.scheduled_at,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      failedAt: row.failed_at,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isHipaaCompliant: row.is_hipaa_compliant,
      auditTrail: Array.isArray(row.audit_trail) ? row.audit_trail : []
    };
  }

  private isHipaaCompliantType(type: NotificationType): boolean {
    const hipaaTypes = [
      NotificationType.CRISIS_ALERT,
      NotificationType.APPOINTMENT_REMINDER,
      NotificationType.MEDICATION_REMINDER,
      NotificationType.SECURITY_ALERT
    ];
    return hipaaTypes.includes(type);
  }
}

export const notificationModel = new NotificationModel();
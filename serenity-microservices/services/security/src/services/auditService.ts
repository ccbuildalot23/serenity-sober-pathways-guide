import { db } from '@/database/connection';
import { encryptionService } from '@/utils/encryption';
import logger, { auditLogger, errorLogger } from '@/utils/logger';
import { config } from '@/config/config';
import {
  AuditLogEntry,
  CreateAuditLogRequest,
  AuditLogQuery,
  PaginatedResponse,
  AuditLogResponse,
  SecurityEvent,
  RiskLevel,
} from '@/types';

export class AuditService {
  private static instance: AuditService;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Create a new audit log entry
   */
  public async createAuditLog(data: CreateAuditLogRequest): Promise<AuditLogEntry> {
    try {
      const auditEntry: Partial<AuditLogEntry> = {
        ...data,
        event_timestamp: new Date(),
        created_at: new Date(),
        status: 'ACTIVE',
      };

      // Encrypt sensitive data if encryption is enabled
      let encryptedRequestData: Buffer | null = null;
      let encryptedResponseData: Buffer | null = null;

      if (config.hipaa.enableAuditEncryption) {
        if (data.request_data) {
          encryptedRequestData = encryptionService.encryptJSON(data.request_data);
        }
        if (data.response_data) {
          encryptedResponseData = encryptionService.encryptJSON(data.response_data);
        }
      }

      // Insert audit log entry
      const result = await db.query(`
        INSERT INTO audit_logs (
          event_type, event_name, event_description, event_timestamp,
          user_id, username, user_role, session_id,
          source_ip, user_agent, request_id, service_name, endpoint, http_method,
          resource_type, resource_id, resource_name, patient_id,
          risk_level, security_flags,
          request_data, response_data,
          hipaa_category, status, metadata, tags,
          created_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
        ) RETURNING id, created_at, retention_required_until
      `, [
        auditEntry.event_type,
        auditEntry.event_name,
        auditEntry.event_description,
        auditEntry.event_timestamp,
        auditEntry.user_id,
        auditEntry.username,
        auditEntry.user_role,
        auditEntry.session_id,
        auditEntry.source_ip,
        auditEntry.user_agent,
        auditEntry.request_id,
        auditEntry.service_name,
        auditEntry.endpoint,
        auditEntry.http_method,
        auditEntry.resource_type,
        auditEntry.resource_id,
        auditEntry.resource_name,
        auditEntry.patient_id,
        auditEntry.risk_level || 'LOW',
        JSON.stringify(auditEntry.security_flags || {}),
        encryptedRequestData,
        encryptedResponseData,
        auditEntry.hipaa_category,
        auditEntry.status,
        JSON.stringify(auditEntry.metadata || {}),
        auditEntry.tags || [],
        auditEntry.created_at,
        auditEntry.user_id || 'system',
      ]);

      const createdEntry = {
        ...auditEntry,
        id: result.rows[0].id,
        created_at: result.rows[0].created_at,
        retention_required_until: result.rows[0].retention_required_until,
      } as AuditLogEntry;

      // Create security event if high risk
      if (auditEntry.risk_level && ['HIGH', 'CRITICAL'].includes(auditEntry.risk_level)) {
        await this.createSecurityEvent(createdEntry);
      }

      // Log audit creation
      auditLogger.dataAccess(
        auditEntry.user_id || 'system',
        'audit_log',
        createdEntry.id!,
        {
          event_type: auditEntry.event_type,
          risk_level: auditEntry.risk_level,
          patient_id: auditEntry.patient_id,
        }
      );

      logger.info('Audit log created', {
        audit_log_id: createdEntry.id,
        event_type: auditEntry.event_type,
        risk_level: auditEntry.risk_level,
        user_id: auditEntry.user_id,
      });

      return createdEntry;
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditService',
        operation: 'createAuditLog',
        event_type: data.event_type,
        user_id: data.user_id,
      });
      throw new Error('Failed to create audit log entry');
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination
   */
  public async getAuditLogs(
    query: AuditLogQuery,
    includeEncryptedData: boolean = false
  ): Promise<PaginatedResponse<AuditLogResponse>> {
    try {
      const {
        user_id,
        event_type,
        risk_level,
        start_date,
        end_date,
        source_ip,
        patient_id,
        session_id,
        service_name,
        hipaa_category,
        tags,
        status,
        page = 1,
        limit = 50,
        sort_by = 'event_timestamp',
        sort_order = 'DESC',
      } = query;

      // Build WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (user_id) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(user_id);
      }

      if (event_type) {
        if (Array.isArray(event_type)) {
          conditions.push(`event_type = ANY($${paramIndex++})`);
          params.push(event_type);
        } else {
          conditions.push(`event_type = $${paramIndex++}`);
          params.push(event_type);
        }
      }

      if (risk_level) {
        if (Array.isArray(risk_level)) {
          conditions.push(`risk_level = ANY($${paramIndex++})`);
          params.push(risk_level);
        } else {
          conditions.push(`risk_level = $${paramIndex++}`);
          params.push(risk_level);
        }
      }

      if (start_date) {
        conditions.push(`event_timestamp >= $${paramIndex++}`);
        params.push(start_date);
      }

      if (end_date) {
        conditions.push(`event_timestamp <= $${paramIndex++}`);
        params.push(end_date);
      }

      if (source_ip) {
        conditions.push(`source_ip = $${paramIndex++}`);
        params.push(source_ip);
      }

      if (patient_id) {
        conditions.push(`patient_id = $${paramIndex++}`);
        params.push(patient_id);
      }

      if (session_id) {
        conditions.push(`session_id = $${paramIndex++}`);
        params.push(session_id);
      }

      if (service_name) {
        conditions.push(`service_name = $${paramIndex++}`);
        params.push(service_name);
      }

      if (hipaa_category) {
        conditions.push(`hipaa_category = $${paramIndex++}`);
        params.push(hipaa_category);
      }

      if (tags && tags.length > 0) {
        conditions.push(`tags && $${paramIndex++}`);
        params.push(tags);
      }

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const validSortFields = ['event_timestamp', 'risk_level', 'user_id', 'event_type', 'created_at'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'event_timestamp';
      const orderClause = `ORDER BY ${sortField} ${sort_order}`;

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM audit_logs ${whereClause}`;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated results
      const dataQuery = `
        SELECT 
          id, event_type, event_name, event_description, event_timestamp,
          user_id, username, user_role, session_id,
          source_ip, user_agent, request_id, service_name, endpoint, http_method,
          resource_type, resource_id, resource_name, patient_id,
          risk_level, security_flags,
          ${includeEncryptedData ? 'request_data, response_data,' : 'NULL as request_data, NULL as response_data,'}
          hipaa_category, retention_required_until,
          status, metadata, tags,
          created_at, created_by, updated_at, updated_by
        FROM audit_logs 
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const dataResult = await db.query(dataQuery, [...params, limit, offset]);

      // Process results and decrypt data if needed
      const processedData: AuditLogResponse[] = await Promise.all(
        dataResult.rows.map(async (row) => {
          const auditLog: AuditLogResponse = {
            ...row,
            security_flags: typeof row.security_flags === 'string' 
              ? JSON.parse(row.security_flags) 
              : row.security_flags,
            metadata: typeof row.metadata === 'string' 
              ? JSON.parse(row.metadata) 
              : row.metadata,
          };

          // Decrypt data if requested and available
          if (includeEncryptedData && config.hipaa.enableAuditEncryption) {
            try {
              if (row.request_data) {
                auditLog.decrypted_request_data = encryptionService.decryptJSON(row.request_data);
              }
              if (row.response_data) {
                auditLog.decrypted_response_data = encryptionService.decryptJSON(row.response_data);
              }
            } catch (decryptionError) {
              logger.warn('Failed to decrypt audit log data', {
                audit_log_id: row.id,
                error: decryptionError instanceof Error ? decryptionError.message : 'Unknown error',
              });
            }
          }

          return auditLog;
        })
      );

      // Calculate pagination info
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      // Log data access
      auditLogger.dataAccess(
        'system', // Will be replaced by actual user in middleware
        'audit_logs',
        'query',
        {
          query_filters: Object.keys(query).filter(key => query[key as keyof AuditLogQuery] !== undefined),
          result_count: processedData.length,
          include_encrypted_data: includeEncryptedData,
        }
      );

      logger.info('Audit logs retrieved', {
        query_filters: Object.keys(query).length,
        result_count: processedData.length,
        total,
        page,
        limit,
      });

      return {
        data: processedData,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next: hasNext,
          has_prev: hasPrev,
        },
      };
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditService',
        operation: 'getAuditLogs',
        query_params: Object.keys(query),
      });
      throw new Error('Failed to retrieve audit logs');
    }
  }

  /**
   * Search audit logs with advanced filtering
   */
  public async searchAuditLogs(
    searchParams: AuditLogQuery,
    includeEncryptedData: boolean = false
  ): Promise<PaginatedResponse<AuditLogResponse>> {
    // For now, use the same implementation as getAuditLogs
    // In production, this could include full-text search, regex matching, etc.
    return this.getAuditLogs(searchParams, includeEncryptedData);
  }

  /**
   * Get audit log by ID
   */
  public async getAuditLogById(
    id: string,
    includeEncryptedData: boolean = false
  ): Promise<AuditLogResponse | null> {
    try {
      const result = await db.query(`
        SELECT 
          id, event_type, event_name, event_description, event_timestamp,
          user_id, username, user_role, session_id,
          source_ip, user_agent, request_id, service_name, endpoint, http_method,
          resource_type, resource_id, resource_name, patient_id,
          risk_level, security_flags,
          ${includeEncryptedData ? 'request_data, response_data,' : 'NULL as request_data, NULL as response_data,'}
          hipaa_category, retention_required_until,
          status, metadata, tags,
          created_at, created_by, updated_at, updated_by
        FROM audit_logs 
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const auditLog: AuditLogResponse = {
        ...row,
        security_flags: typeof row.security_flags === 'string' 
          ? JSON.parse(row.security_flags) 
          : row.security_flags,
        metadata: typeof row.metadata === 'string' 
          ? JSON.parse(row.metadata) 
          : row.metadata,
      };

      // Decrypt data if requested and available
      if (includeEncryptedData && config.hipaa.enableAuditEncryption) {
        try {
          if (row.request_data) {
            auditLog.decrypted_request_data = encryptionService.decryptJSON(row.request_data);
          }
          if (row.response_data) {
            auditLog.decrypted_response_data = encryptionService.decryptJSON(row.response_data);
          }
        } catch (decryptionError) {
          logger.warn('Failed to decrypt audit log data', {
            audit_log_id: id,
            error: decryptionError instanceof Error ? decryptionError.message : 'Unknown error',
          });
        }
      }

      // Log data access
      auditLogger.dataAccess('system', 'audit_log', id, {
        include_encrypted_data: includeEncryptedData,
      });

      return auditLog;
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditService',
        operation: 'getAuditLogById',
        audit_log_id: id,
      });
      throw new Error('Failed to retrieve audit log');
    }
  }

  /**
   * Create security event from high-risk audit log
   */
  private async createSecurityEvent(auditLog: AuditLogEntry): Promise<void> {
    try {
      const securityEvent: Partial<SecurityEvent> = {
        audit_log_id: auditLog.id,
        severity: auditLog.risk_level as RiskLevel,
        category: 'HIGH_RISK_AUDIT',
        subcategory: auditLog.event_type,
        detected_at: new Date(),
        detection_method: 'AUDIT_LOG_ANALYSIS',
        confidence_score: auditLog.risk_level === 'CRITICAL' ? 1.0 : 0.8,
        response_required: auditLog.risk_level === 'CRITICAL',
        response_deadline: auditLog.risk_level === 'CRITICAL' 
          ? new Date(Date.now() + 15 * 60 * 1000) // 15 minutes for critical
          : new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours for high
        status: 'OPEN',
        threat_indicators: {
          event_type: auditLog.event_type,
          user_id: auditLog.user_id,
          source_ip: auditLog.source_ip,
          patient_id: auditLog.patient_id,
        },
        mitigation_steps: this.getMitigationSteps(auditLog),
        created_at: new Date(),
      };

      await db.query(`
        INSERT INTO security_events (
          audit_log_id, severity, category, subcategory,
          detected_at, detection_method, confidence_score,
          response_required, response_deadline, status,
          threat_indicators, mitigation_steps, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        securityEvent.audit_log_id,
        securityEvent.severity,
        securityEvent.category,
        securityEvent.subcategory,
        securityEvent.detected_at,
        securityEvent.detection_method,
        securityEvent.confidence_score,
        securityEvent.response_required,
        securityEvent.response_deadline,
        securityEvent.status,
        JSON.stringify(securityEvent.threat_indicators),
        securityEvent.mitigation_steps,
        securityEvent.created_at,
      ]);

      logger.warn('Security event created from audit log', {
        audit_log_id: auditLog.id,
        severity: securityEvent.severity,
        event_type: auditLog.event_type,
        user_id: auditLog.user_id,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditService',
        operation: 'createSecurityEvent',
        audit_log_id: auditLog.id,
      });
    }
  }

  /**
   * Get mitigation steps based on audit log type
   */
  private getMitigationSteps(auditLog: AuditLogEntry): string[] {
    const steps: string[] = [];

    switch (auditLog.event_type) {
      case 'AUTHENTICATION_FAILURE':
        steps.push('Review failed authentication attempts');
        steps.push('Check for brute force patterns');
        steps.push('Consider temporary IP blocking');
        break;
      case 'PHI_ACCESS':
        steps.push('Verify PHI access authorization');
        steps.push('Review user access patterns');
        steps.push('Confirm minimum necessary standard');
        break;
      case 'AUTHORIZATION_FAILURE':
        steps.push('Review access control policies');
        steps.push('Verify user permissions');
        steps.push('Check for privilege escalation attempts');
        break;
      case 'SECURITY_ALERT':
        steps.push('Investigate security incident');
        steps.push('Review system logs');
        steps.push('Assess potential impact');
        break;
      default:
        steps.push('Review audit log details');
        steps.push('Investigate suspicious activity');
        steps.push('Document findings');
    }

    if (auditLog.risk_level === 'CRITICAL') {
      steps.unshift('IMMEDIATE ACTION REQUIRED');
      steps.push('Escalate to security team');
      steps.push('Consider emergency response');
    }

    return steps;
  }

  /**
   * Get audit statistics
   */
  public async getAuditStatistics(days: number = 30): Promise<{
    total_events: number;
    events_by_type: Array<{ event_type: string; count: number }>;
    events_by_risk: Array<{ risk_level: string; count: number }>;
    phi_access_count: number;
    security_events_count: number;
    top_users: Array<{ user_id: string; username: string; count: number }>;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get total events
      const totalResult = await db.query(
        'SELECT COUNT(*) FROM audit_logs WHERE event_timestamp >= $1',
        [startDate]
      );

      // Get events by type
      const typeResult = await db.query(`
        SELECT event_type, COUNT(*) as count
        FROM audit_logs 
        WHERE event_timestamp >= $1
        GROUP BY event_type
        ORDER BY count DESC
      `, [startDate]);

      // Get events by risk level
      const riskResult = await db.query(`
        SELECT risk_level, COUNT(*) as count
        FROM audit_logs 
        WHERE event_timestamp >= $1
        GROUP BY risk_level
        ORDER BY count DESC
      `, [startDate]);

      // Get PHI access count
      const phiResult = await db.query(
        'SELECT COUNT(*) FROM audit_logs WHERE event_type IN ($1, $2) AND event_timestamp >= $3',
        ['PHI_ACCESS', 'PHI_EXPORT', startDate]
      );

      // Get security events count
      const securityResult = await db.query(
        'SELECT COUNT(*) FROM security_events WHERE detected_at >= $1',
        [startDate]
      );

      // Get top users
      const usersResult = await db.query(`
        SELECT user_id, username, COUNT(*) as count
        FROM audit_logs 
        WHERE event_timestamp >= $1 AND user_id IS NOT NULL
        GROUP BY user_id, username
        ORDER BY count DESC
        LIMIT 10
      `, [startDate]);

      return {
        total_events: parseInt(totalResult.rows[0].count, 10),
        events_by_type: typeResult.rows.map(row => ({
          event_type: row.event_type,
          count: parseInt(row.count, 10),
        })),
        events_by_risk: riskResult.rows.map(row => ({
          risk_level: row.risk_level,
          count: parseInt(row.count, 10),
        })),
        phi_access_count: parseInt(phiResult.rows[0].count, 10),
        security_events_count: parseInt(securityResult.rows[0].count, 10),
        top_users: usersResult.rows.map(row => ({
          user_id: row.user_id,
          username: row.username,
          count: parseInt(row.count, 10),
        })),
      };
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditService',
        operation: 'getAuditStatistics',
        days,
      });
      throw new Error('Failed to retrieve audit statistics');
    }
  }
}

export const auditService = AuditService.getInstance();
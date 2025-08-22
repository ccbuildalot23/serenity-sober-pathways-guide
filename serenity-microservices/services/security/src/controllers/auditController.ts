import { Request, Response } from 'express';
import { auditService } from '@/services/auditService';
import { auditLogger, errorLogger } from '@/utils/logger';
import { CreateAuditLogRequest, AuditLogQuery } from '@/types';

export class AuditController {
  /**
   * Create a new audit log entry
   * POST /api/v1/audit/log
   */
  public async createAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const auditData: CreateAuditLogRequest = req.body;

      // Enrich with request metadata
      const enrichedData: CreateAuditLogRequest = {
        ...auditData,
        source_ip: auditData.source_ip || req.ip || req.connection.remoteAddress,
        user_agent: auditData.user_agent || req.get('User-Agent'),
        request_id: auditData.request_id || req.requestId,
        service_name: auditData.service_name || req.get('X-Service-Name'),
      };

      const auditLog = await auditService.createAuditLog(enrichedData);

      // Log the creation
      auditLogger.apiCall(req.method, req.path, req.user?.id, {
        audit_log_id: auditLog.id,
        event_type: auditData.event_type,
        risk_level: auditData.risk_level,
      });

      res.status(201).json({
        success: true,
        data: {
          id: auditLog.id,
          event_type: auditLog.event_type,
          event_name: auditLog.event_name,
          risk_level: auditLog.risk_level,
          created_at: auditLog.created_at,
        },
        message: 'Audit log created successfully',
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditController',
        operation: 'createAuditLog',
        user_id: req.user?.id,
        request_id: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_CREATION_FAILED',
          message: 'Failed to create audit log entry',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  /**
   * Get audit logs with filtering and pagination
   * GET /api/v1/audit/logs
   */
  public async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const query: AuditLogQuery = {
        user_id: req.query.user_id as string,
        event_type: req.query.event_type as any,
        risk_level: req.query.risk_level as any,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        source_ip: req.query.source_ip as string,
        patient_id: req.query.patient_id as string,
        session_id: req.query.session_id as string,
        service_name: req.query.service_name as string,
        hipaa_category: req.query.hipaa_category as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        status: req.query.status as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'ASC' | 'DESC',
      };

      // Check if user has permission to access encrypted data
      const includeEncryptedData = req.query.include_encrypted === 'true' && 
        (req.user?.role === 'admin' || req.apiKey?.permissions.includes('audit:decrypt'));

      const result = await auditService.getAuditLogs(query, includeEncryptedData);

      // Log the access
      auditLogger.dataAccess(req.user?.id || 'api-key', 'audit_logs', 'query', {
        filters_applied: Object.keys(query).filter(key => query[key as keyof AuditLogQuery] !== undefined).length,
        results_returned: result.data.length,
        include_encrypted_data: includeEncryptedData,
        page: query.page,
        limit: query.limit,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        metadata: {
          filters_applied: Object.keys(query).filter(key => query[key as keyof AuditLogQuery] !== undefined),
          include_encrypted_data: includeEncryptedData,
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditController',
        operation: 'getAuditLogs',
        user_id: req.user?.id,
        request_id: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_RETRIEVAL_FAILED',
          message: 'Failed to retrieve audit logs',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  /**
   * Search audit logs with advanced filtering
   * POST /api/v1/audit/search
   */
  public async searchAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { query, include_encrypted_data = false } = req.body;

      // Validate search query
      if (!query || typeof query !== 'object') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_SEARCH_QUERY',
            message: 'Search query is required and must be an object',
          },
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
        return;
      }

      // Check if user has permission to access encrypted data
      const canAccessEncrypted = include_encrypted_data && 
        (req.user?.role === 'admin' || req.apiKey?.permissions.includes('audit:decrypt'));

      const result = await auditService.searchAuditLogs(query, canAccessEncrypted);

      // Log the search
      auditLogger.dataAccess(req.user?.id || 'api-key', 'audit_logs', 'search', {
        search_filters: Object.keys(query).length,
        results_returned: result.data.length,
        include_encrypted_data: canAccessEncrypted,
        page: query.page || 1,
        limit: query.limit || 50,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        metadata: {
          search_filters: Object.keys(query),
          include_encrypted_data: canAccessEncrypted,
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditController',
        operation: 'searchAuditLogs',
        user_id: req.user?.id,
        request_id: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_SEARCH_FAILED',
          message: 'Failed to search audit logs',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  /**
   * Get a specific audit log by ID
   * GET /api/v1/audit/logs/:id
   */
  public async getAuditLogById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const includeEncryptedData = req.query.include_encrypted === 'true' && 
        (req.user?.role === 'admin' || req.apiKey?.permissions.includes('audit:decrypt'));

      const auditLog = await auditService.getAuditLogById(id, includeEncryptedData);

      if (!auditLog) {
        res.status(404).json({
          success: false,
          error: {
            code: 'AUDIT_LOG_NOT_FOUND',
            message: `Audit log with ID ${id} not found`,
          },
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
        return;
      }

      // Log the access
      auditLogger.dataAccess(req.user?.id || 'api-key', 'audit_log', id, {
        include_encrypted_data: includeEncryptedData,
        event_type: auditLog.event_type,
        risk_level: auditLog.risk_level,
      });

      res.status(200).json({
        success: true,
        data: auditLog,
        metadata: {
          include_encrypted_data: includeEncryptedData,
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditController',
        operation: 'getAuditLogById',
        audit_log_id: req.params.id,
        user_id: req.user?.id,
        request_id: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_RETRIEVAL_FAILED',
          message: 'Failed to retrieve audit log',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  /**
   * Get audit statistics
   * GET /api/v1/audit/statistics
   */
  public async getAuditStatistics(req: Request, res: Response): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      
      if (days < 1 || days > 365) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DAYS_PARAMETER',
            message: 'Days parameter must be between 1 and 365',
          },
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
        return;
      }

      const statistics = await auditService.getAuditStatistics(days);

      // Log the access
      auditLogger.dataAccess(req.user?.id || 'api-key', 'audit_statistics', 'query', {
        days_requested: days,
        total_events: statistics.total_events,
      });

      res.status(200).json({
        success: true,
        data: statistics,
        metadata: {
          days_requested: days,
          generated_at: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditController',
        operation: 'getAuditStatistics',
        user_id: req.user?.id,
        request_id: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'STATISTICS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve audit statistics',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  /**
   * Bulk create audit logs
   * POST /api/v1/audit/logs/bulk
   */
  public async bulkCreateAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { logs } = req.body;

      if (!Array.isArray(logs) || logs.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BULK_REQUEST',
            message: 'Request must contain an array of log entries',
          },
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
        return;
      }

      if (logs.length > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BULK_LIMIT_EXCEEDED',
            message: 'Maximum 100 log entries allowed per bulk request',
          },
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
        return;
      }

      const results = [];
      const errors = [];

      for (let i = 0; i < logs.length; i++) {
        try {
          const logData = logs[i];
          const enrichedData: CreateAuditLogRequest = {
            ...logData,
            source_ip: logData.source_ip || req.ip || req.connection.remoteAddress,
            user_agent: logData.user_agent || req.get('User-Agent'),
            request_id: logData.request_id || `${req.requestId}_${i}`,
            service_name: logData.service_name || req.get('X-Service-Name'),
          };

          const auditLog = await auditService.createAuditLog(enrichedData);
          results.push({
            index: i,
            success: true,
            id: auditLog.id,
          });
        } catch (error) {
          errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Log the bulk operation
      auditLogger.apiCall(req.method, req.path, req.user?.id, {
        total_logs: logs.length,
        successful: results.length,
        failed: errors.length,
      });

      res.status(207).json({ // 207 Multi-Status
        success: errors.length === 0,
        data: {
          total: logs.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `Bulk audit log creation completed. ${results.length} successful, ${errors.length} failed.`,
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AuditController',
        operation: 'bulkCreateAuditLogs',
        user_id: req.user?.id,
        request_id: req.requestId,
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_AUDIT_CREATION_FAILED',
          message: 'Failed to process bulk audit log creation',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }
}

export const auditController = new AuditController();
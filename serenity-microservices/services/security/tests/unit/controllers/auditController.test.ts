import { auditController } from '@/controllers/auditController';
import { auditService } from '@/services/auditService';
import { 
  createMockRequest, 
  createMockResponse, 
  createTestAuditLog,
  createTestUser 
} from '../../setup';

jest.mock('@/services/auditService');
jest.mock('@/utils/logger');

describe('AuditController', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockAuditService: jest.Mocked<typeof auditService>;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockAuditService = auditService as jest.Mocked<typeof auditService>;
  });

  describe('createAuditLog', () => {
    it('should create audit log successfully', async () => {
      const testAuditData = createTestAuditLog();
      const mockAuditLog = {
        id: 'test-audit-id',
        ...testAuditData,
        created_at: new Date(),
      };

      mockRequest.body = testAuditData;
      mockRequest.user = createTestUser();
      mockAuditService.createAuditLog.mockResolvedValue(mockAuditLog as any);

      await auditController.createAuditLog(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'test-audit-id',
            event_type: 'LOGIN',
          }),
        })
      );
    });

    it('should enrich audit data with request metadata', async () => {
      const testAuditData = createTestAuditLog();
      mockRequest.body = testAuditData;
      mockRequest.ip = '192.168.1.1';
      mockRequest.get.mockReturnValue('Custom-User-Agent');

      mockAuditService.createAuditLog.mockResolvedValue({
        id: 'test-id',
        ...testAuditData,
      } as any);

      await auditController.createAuditLog(mockRequest, mockResponse);

      expect(mockAuditService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          ...testAuditData,
          source_ip: '192.168.1.1',
          user_agent: 'Custom-User-Agent',
          request_id: 'test-request-id',
        })
      );
    });

    it('should handle service errors', async () => {
      mockRequest.body = createTestAuditLog();
      mockAuditService.createAuditLog.mockRejectedValue(new Error('Service error'));

      await auditController.createAuditLog(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUDIT_CREATION_FAILED',
          }),
        })
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with query parameters', async () => {
      const mockResult = {
        data: [
          {
            id: 'audit-1',
            event_type: 'LOGIN',
            user_id: 'user-1',
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
      };

      mockRequest.query = {
        user_id: 'user-1',
        event_type: 'LOGIN',
        page: '1',
        limit: '50',
      };
      mockRequest.user = createTestUser({ role: 'admin' });
      mockAuditService.getAuditLogs.mockResolvedValue(mockResult as any);

      await auditController.getAuditLogs(mockRequest, mockResponse);

      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          event_type: 'LOGIN',
          page: 1,
          limit: 50,
        }),
        false // includeEncryptedData
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
          pagination: mockResult.pagination,
        })
      );
    });

    it('should handle date query parameters', async () => {
      mockRequest.query = {
        start_date: '2023-01-01T00:00:00Z',
        end_date: '2023-12-31T23:59:59Z',
      };
      mockAuditService.getAuditLogs.mockResolvedValue({
        data: [],
        pagination: expect.any(Object),
      } as any);

      await auditController.getAuditLogs(mockRequest, mockResponse);

      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: new Date('2023-01-01T00:00:00Z'),
          end_date: new Date('2023-12-31T23:59:59Z'),
        }),
        false
      );
    });

    it('should allow encrypted data access for admins', async () => {
      mockRequest.query = { include_encrypted: 'true' };
      mockRequest.user = createTestUser({ role: 'admin' });
      mockAuditService.getAuditLogs.mockResolvedValue({
        data: [],
        pagination: expect.any(Object),
      } as any);

      await auditController.getAuditLogs(mockRequest, mockResponse);

      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        true // includeEncryptedData should be true for admin
      );
    });

    it('should deny encrypted data access for regular users', async () => {
      mockRequest.query = { include_encrypted: 'true' };
      mockRequest.user = createTestUser({ role: 'patient' });
      mockAuditService.getAuditLogs.mockResolvedValue({
        data: [],
        pagination: expect.any(Object),
      } as any);

      await auditController.getAuditLogs(mockRequest, mockResponse);

      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        false // includeEncryptedData should be false for regular user
      );
    });
  });

  describe('searchAuditLogs', () => {
    it('should search audit logs successfully', async () => {
      const searchQuery = {
        event_type: 'LOGIN',
        risk_level: 'HIGH',
        page: 1,
        limit: 20,
      };

      mockRequest.body = {
        query: searchQuery,
        include_encrypted_data: false,
      };
      mockRequest.user = createTestUser({ role: 'admin' });

      const mockResult = {
        data: [],
        pagination: expect.any(Object),
      };
      mockAuditService.searchAuditLogs.mockResolvedValue(mockResult as any);

      await auditController.searchAuditLogs(mockRequest, mockResponse);

      expect(mockAuditService.searchAuditLogs).toHaveBeenCalledWith(
        searchQuery,
        false
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should validate search query', async () => {
      mockRequest.body = {
        query: null, // Invalid query
      };

      await auditController.searchAuditLogs(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_SEARCH_QUERY',
          }),
        })
      );
    });

    it('should check encryption permissions for API keys', async () => {
      mockRequest.body = {
        query: { event_type: 'LOGIN' },
        include_encrypted_data: true,
      };
      mockRequest.apiKey = {
        permissions: ['audit:decrypt'],
      };

      mockAuditService.searchAuditLogs.mockResolvedValue({
        data: [],
        pagination: expect.any(Object),
      } as any);

      await auditController.searchAuditLogs(mockRequest, mockResponse);

      expect(mockAuditService.searchAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        true // Should allow encrypted data for API key with decrypt permission
      );
    });
  });

  describe('getAuditLogById', () => {
    it('should retrieve specific audit log', async () => {
      const mockAuditLog = {
        id: 'audit-123',
        event_type: 'LOGIN',
        user_id: 'user-1',
      };

      mockRequest.params = { id: 'audit-123' };
      mockRequest.user = createTestUser();
      mockAuditService.getAuditLogById.mockResolvedValue(mockAuditLog as any);

      await auditController.getAuditLogById(mockRequest, mockResponse);

      expect(mockAuditService.getAuditLogById).toHaveBeenCalledWith(
        'audit-123',
        false
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockAuditLog,
        })
      );
    });

    it('should return 404 when audit log not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockAuditService.getAuditLogById.mockResolvedValue(null);

      await auditController.getAuditLogById(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'AUDIT_LOG_NOT_FOUND',
          }),
        })
      );
    });
  });

  describe('getAuditStatistics', () => {
    it('should return audit statistics', async () => {
      const mockStats = {
        total_events: 100,
        events_by_type: [{ event_type: 'LOGIN', count: 50 }],
        events_by_risk: [{ risk_level: 'LOW', count: 80 }],
        phi_access_count: 10,
        security_events_count: 5,
        top_users: [{ user_id: 'user-1', username: 'user1', count: 20 }],
      };

      mockRequest.query = { days: '30' };
      mockAuditService.getAuditStatistics.mockResolvedValue(mockStats);

      await auditController.getAuditStatistics(mockRequest, mockResponse);

      expect(mockAuditService.getAuditStatistics).toHaveBeenCalledWith(30);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStats,
        })
      );
    });

    it('should validate days parameter', async () => {
      mockRequest.query = { days: '400' }; // Invalid: > 365

      await auditController.getAuditStatistics(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_DAYS_PARAMETER',
          }),
        })
      );
    });
  });

  describe('bulkCreateAuditLogs', () => {
    it('should create multiple audit logs', async () => {
      const logEntries = [
        createTestAuditLog({ event_name: 'Log 1' }),
        createTestAuditLog({ event_name: 'Log 2' }),
      ];

      mockRequest.body = { logs: logEntries };
      mockAuditService.createAuditLog
        .mockResolvedValueOnce({ id: 'audit-1' } as any)
        .mockResolvedValueOnce({ id: 'audit-2' } as any);

      await auditController.bulkCreateAuditLogs(mockRequest, mockResponse);

      expect(mockAuditService.createAuditLog).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(207); // Multi-Status
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            total: 2,
            successful: 2,
            failed: 0,
          }),
        })
      );
    });

    it('should handle partial failures in bulk creation', async () => {
      const logEntries = [
        createTestAuditLog({ event_name: 'Log 1' }),
        createTestAuditLog({ event_name: 'Log 2' }),
      ];

      mockRequest.body = { logs: logEntries };
      mockAuditService.createAuditLog
        .mockResolvedValueOnce({ id: 'audit-1' } as any)
        .mockRejectedValueOnce(new Error('Creation failed'));

      await auditController.bulkCreateAuditLogs(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(207);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false, // Overall failure due to partial failures
          data: expect.objectContaining({
            total: 2,
            successful: 1,
            failed: 1,
          }),
        })
      );
    });

    it('should validate bulk request limits', async () => {
      const tooManyLogs = Array(101).fill(createTestAuditLog()); // > 100 limit

      mockRequest.body = { logs: tooManyLogs };

      await auditController.bulkCreateAuditLogs(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'BULK_LIMIT_EXCEEDED',
          }),
        })
      );
    });
  });
});
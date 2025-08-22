import { auditService } from '@/services/auditService';
import { mockDatabaseQuery, createTestAuditLog } from '../../setup';
import { CreateAuditLogRequest } from '@/types';

jest.mock('@/database/connection');
jest.mock('@/utils/encryption');

describe('AuditService', () => {
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = mockDatabaseQuery();
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry successfully', async () => {
      const testAuditData: CreateAuditLogRequest = createTestAuditLog();
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'test-audit-id',
          created_at: new Date(),
          retention_required_until: new Date(),
        }],
      });

      const result = await auditService.createAuditLog(testAuditData);

      expect(result).toMatchObject({
        id: 'test-audit-id',
        event_type: 'LOGIN',
        event_name: 'User Login',
        user_id: 'test-user-id',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          'LOGIN',
          'User Login',
          'User successfully logged in',
        ])
      );
    });

    it('should handle high-risk audit logs', async () => {
      const highRiskData: CreateAuditLogRequest = createTestAuditLog({
        risk_level: 'CRITICAL',
        event_type: 'SECURITY_ALERT',
      });

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 'test-audit-id',
            created_at: new Date(),
            retention_required_until: new Date(),
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // Security event creation

      const result = await auditService.createAuditLog(highRiskData);

      expect(result.risk_level).toBe('CRITICAL');
      expect(mockQuery).toHaveBeenCalledTimes(2); // Audit log + security event
    });

    it('should throw error when database operation fails', async () => {
      const testAuditData: CreateAuditLogRequest = createTestAuditLog();
      
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(auditService.createAuditLog(testAuditData))
        .rejects
        .toThrow('Failed to create audit log entry');
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with pagination', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          event_type: 'LOGIN',
          event_name: 'User Login',
          user_id: 'user-1',
          created_at: new Date(),
        },
        {
          id: 'audit-2',
          event_type: 'LOGOUT',
          event_name: 'User Logout',
          user_id: 'user-1',
          created_at: new Date(),
        },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockAuditLogs }); // Data query

      const result = await auditService.getAuditLogs({
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter audit logs by user_id', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 'audit-1',
            event_type: 'LOGIN',
            user_id: 'specific-user',
          }],
        });

      const result = await auditService.getAuditLogs({
        user_id: 'specific-user',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        expect.arrayContaining(['specific-user'])
      );
    });

    it('should filter audit logs by event_type array', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await auditService.getAuditLogs({
        event_type: ['LOGIN', 'LOGOUT'],
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE event_type = ANY($1)'),
        expect.arrayContaining([['LOGIN', 'LOGOUT']])
      );
    });

    it('should filter audit logs by date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      await auditService.getAuditLogs({
        start_date: startDate,
        end_date: endDate,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('event_timestamp >= $1 AND event_timestamp <= $2'),
        expect.arrayContaining([startDate, endDate])
      );
    });
  });

  describe('getAuditLogById', () => {
    it('should retrieve a specific audit log by ID', async () => {
      const mockAuditLog = {
        id: 'test-audit-id',
        event_type: 'LOGIN',
        event_name: 'User Login',
        user_id: 'test-user',
        security_flags: '{}',
        metadata: '{}',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockAuditLog] });

      const result = await auditService.getAuditLogById('test-audit-id');

      expect(result).toMatchObject({
        id: 'test-audit-id',
        event_type: 'LOGIN',
        user_id: 'test-user',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['test-audit-id']
      );
    });

    it('should return null when audit log not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await auditService.getAuditLogById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getAuditStatistics', () => {
    it('should return audit statistics', async () => {
      const mockStatistics = [
        { count: '100' }, // Total
        [{ event_type: 'LOGIN', count: '50' }], // By type
        [{ risk_level: 'LOW', count: '80' }], // By risk
        { count: '10' }, // PHI access
        { count: '5' }, // Security events
        [{ user_id: 'user-1', username: 'user1', count: '20' }], // Top users
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [mockStatistics[0]] })
        .mockResolvedValueOnce({ rows: mockStatistics[1] })
        .mockResolvedValueOnce({ rows: mockStatistics[2] })
        .mockResolvedValueOnce({ rows: [mockStatistics[3]] })
        .mockResolvedValueOnce({ rows: [mockStatistics[4]] })
        .mockResolvedValueOnce({ rows: mockStatistics[5] });

      const result = await auditService.getAuditStatistics(30);

      expect(result.total_events).toBe(100);
      expect(result.events_by_type).toHaveLength(1);
      expect(result.events_by_risk).toHaveLength(1);
      expect(result.phi_access_count).toBe(10);
      expect(result.security_events_count).toBe(5);
      expect(result.top_users).toHaveLength(1);
    });
  });

  describe('searchAuditLogs', () => {
    it('should search audit logs using the same logic as getAuditLogs', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const searchParams = {
        event_type: 'LOGIN',
        risk_level: 'HIGH',
      };

      const result = await auditService.searchAuditLogs(searchParams);

      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Connection failed'));

      await expect(auditService.createAuditLog(createTestAuditLog()))
        .rejects
        .toThrow('Failed to create audit log entry');
    });

    it('should handle invalid data gracefully', async () => {
      const invalidData = {
        event_type: 'INVALID_TYPE',
      } as any;

      mockQuery.mockRejectedValue(new Error('Invalid event type'));

      await expect(auditService.createAuditLog(invalidData))
        .rejects
        .toThrow('Failed to create audit log entry');
    });
  });
});
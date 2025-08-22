import { Router } from 'express';
import { auditController } from '@/controllers/auditController';
import { authenticate, authorize } from '@/middleware/authentication';
import { auditLogRateLimiter, searchRateLimiter } from '@/middleware/rateLimiter';
import { 
  validateWithJoi, 
  schemas, 
  validationChains, 
  handleValidationErrors,
  validateHipaaData,
  validateRequestSize
} from '@/middleware/validation';

const router = Router();

// Apply rate limiting to all audit routes
router.use(auditLogRateLimiter);

// Apply request size validation
router.use(validateRequestSize(2 * 1024 * 1024)); // 2MB limit

/**
 * @route   POST /api/v1/audit/log
 * @desc    Create a new audit log entry
 * @access  Authenticated (service accounts, admins, providers)
 */
router.post(
  '/log',
  authenticate,
  authorize(['admin', 'provider', 'service', 'audit:write']),
  validateWithJoi(schemas.createAuditLog),
  validateHipaaData,
  auditController.createAuditLog
);

/**
 * @route   POST /api/v1/audit/logs/bulk
 * @desc    Bulk create audit log entries
 * @access  Authenticated (service accounts, admins)
 */
router.post(
  '/logs/bulk',
  authenticate,
  authorize(['admin', 'service', 'audit:bulk_write']),
  validateRequestSize(10 * 1024 * 1024), // 10MB limit for bulk
  auditController.bulkCreateAuditLogs
);

/**
 * @route   GET /api/v1/audit/logs
 * @desc    Get audit logs with filtering and pagination
 * @access  Authenticated (admins, providers with proper permissions)
 */
router.get(
  '/logs',
  authenticate,
  authorize(['admin', 'provider', 'audit:read']),
  validationChains.getAuditLogs,
  handleValidationErrors,
  auditController.getAuditLogs
);

/**
 * @route   GET /api/v1/audit/logs/:id
 * @desc    Get a specific audit log by ID
 * @access  Authenticated (admins, providers with proper permissions)
 */
router.get(
  '/logs/:id',
  authenticate,
  authorize(['admin', 'provider', 'audit:read']),
  validationChains.uuid,
  handleValidationErrors,
  auditController.getAuditLogById
);

/**
 * @route   POST /api/v1/audit/search
 * @desc    Search audit logs with advanced filtering
 * @access  Authenticated (admins, security team)
 */
router.post(
  '/search',
  searchRateLimiter,
  authenticate,
  authorize(['admin', 'security_analyst', 'audit:search']),
  validateWithJoi(schemas.searchAuditLogs),
  auditController.searchAuditLogs
);

/**
 * @route   GET /api/v1/audit/statistics
 * @desc    Get audit statistics and metrics
 * @access  Authenticated (admins, security team, providers)
 */
router.get(
  '/statistics',
  authenticate,
  authorize(['admin', 'provider', 'security_analyst', 'audit:read']),
  auditController.getAuditStatistics
);

export default router;
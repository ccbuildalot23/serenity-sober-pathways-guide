import { Router } from 'express';
import { healthController } from '@/controllers/healthController';
import { optionalAuth } from '@/middleware/authentication';

const router = Router();

/**
 * @route   GET /health
 * @desc    Basic health check endpoint (public)
 * @access  Public
 */
router.get('/health', healthController.basicHealthCheck.bind(healthController));

/**
 * @route   GET /ready
 * @desc    Kubernetes readiness probe endpoint
 * @access  Public
 */
router.get('/ready', healthController.readinessCheck.bind(healthController));

/**
 * @route   GET /live
 * @desc    Kubernetes liveness probe endpoint
 * @access  Public
 */
router.get('/live', healthController.livenessCheck.bind(healthController));

/**
 * @route   GET /api/v1/health
 * @desc    Detailed health check with authentication
 * @access  Authenticated (optional)
 */
router.get('/api/v1/health', optionalAuth, healthController.detailedHealthCheck.bind(healthController));

export default router;
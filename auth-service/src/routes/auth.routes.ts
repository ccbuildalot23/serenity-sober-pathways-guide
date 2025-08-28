import express from 'express';
import { body, param, query } from 'express-validator';
import { authController } from '../controllers/auth.controller';
import { authenticate, optionalAuth, requireOwnership } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { rateLimiter } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = express.Router();

// Register new user
router.post('/register',
  rateLimiter.register,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and symbol'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must be under 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must be under 50 characters'),
    body('phoneNumber')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number is required'),
    body('role')
      .optional()
      .isIn(['patient', 'provider', 'supporter'])
      .withMessage('Role must be patient, provider, or supporter'),
    body('acceptedTerms')
      .equals('true')
      .withMessage('Terms of service must be accepted'),
    body('acceptedPrivacy')
      .equals('true')
      .withMessage('Privacy policy must be accepted'),
  ],
  validateRequest,
  asyncHandler(authController.register)
);

// Login
router.post('/login',
  rateLimiter.login,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    body('deviceInfo')
      .optional()
      .isObject()
      .withMessage('Device info must be an object'),
    body('rememberMe')
      .optional()
      .isBoolean()
      .withMessage('Remember me must be a boolean'),
  ],
  validateRequest,
  asyncHandler(authController.login)
);

// Refresh token
router.post('/refresh',
  rateLimiter.token,
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],
  validateRequest,
  asyncHandler(authController.refreshToken)
);

// Logout
router.post('/logout',
  authenticate,
  [
    body('refreshToken')
      .optional()
      .isString()
      .withMessage('Refresh token must be a string'),
    body('logoutAll')
      .optional()
      .isBoolean()
      .withMessage('Logout all must be a boolean'),
  ],
  validateRequest,
  asyncHandler(authController.logout)
);

// Get current user profile
router.get('/me',
  authenticate,
  asyncHandler(authController.getProfile)
);

// Update user profile
router.patch('/me',
  authenticate,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be 1-50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be 1-50 characters'),
    body('phoneNumber')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number is required'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object'),
  ],
  validateRequest,
  asyncHandler(authController.updateProfile)
);

// Change password
router.post('/password/change',
  authenticate,
  rateLimiter.passwordChange,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and symbol'),
  ],
  validateRequest,
  asyncHandler(authController.changePassword)
);

// Request password reset
router.post('/password/reset-request',
  rateLimiter.passwordReset,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('clientUrl')
      .optional()
      .isURL()
      .withMessage('Client URL must be a valid URL'),
  ],
  validateRequest,
  asyncHandler(authController.requestPasswordReset)
);

// Complete password reset
router.post('/password/reset-complete',
  rateLimiter.passwordReset,
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and symbol'),
  ],
  validateRequest,
  asyncHandler(authController.completePasswordReset)
);

// Verify email
router.post('/email/verify',
  [
    body('token')
      .notEmpty()
      .withMessage('Verification token is required'),
  ],
  validateRequest,
  asyncHandler(authController.verifyEmail)
);

// Resend email verification
router.post('/email/resend-verification',
  authenticate,
  rateLimiter.emailVerification,
  asyncHandler(authController.resendEmailVerification)
);

// Get user sessions
router.get('/sessions',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean'),
  ],
  validateRequest,
  asyncHandler(authController.getUserSessions)
);

// Revoke session
router.delete('/sessions/:sessionId',
  authenticate,
  [
    param('sessionId')
      .isUUID()
      .withMessage('Session ID must be a valid UUID'),
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 255 })
      .withMessage('Reason must be a string under 255 characters'),
  ],
  validateRequest,
  requireOwnership('sessionId'),
  asyncHandler(authController.revokeSession)
);

// Revoke all sessions
router.delete('/sessions',
  authenticate,
  [
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 255 })
      .withMessage('Reason must be a string under 255 characters'),
  ],
  validateRequest,
  asyncHandler(authController.revokeAllSessions)
);

// OAuth routes
router.get('/oauth/:provider',
  [
    param('provider')
      .isIn(['google', 'microsoft'])
      .withMessage('Provider must be google or microsoft'),
    query('state')
      .optional()
      .isString()
      .withMessage('State must be a string'),
  ],
  validateRequest,
  asyncHandler(authController.initiateOAuth)
);

router.post('/oauth/:provider/callback',
  [
    param('provider')
      .isIn(['google', 'microsoft'])
      .withMessage('Provider must be google or microsoft'),
    body('code')
      .notEmpty()
      .withMessage('Authorization code is required'),
    body('state')
      .optional()
      .isString()
      .withMessage('State must be a string'),
    body('codeVerifier')
      .optional()
      .isString()
      .withMessage('Code verifier must be a string'),
  ],
  validateRequest,
  asyncHandler(authController.handleOAuthCallback)
);

// Link OAuth provider to existing account
router.post('/oauth/:provider/link',
  authenticate,
  [
    param('provider')
      .isIn(['google', 'microsoft'])
      .withMessage('Provider must be google or microsoft'),
    body('code')
      .notEmpty()
      .withMessage('Authorization code is required'),
  ],
  validateRequest,
  asyncHandler(authController.linkOAuthProvider)
);

// Unlink OAuth provider
router.delete('/oauth/:provider',
  authenticate,
  [
    param('provider')
      .isIn(['google', 'microsoft'])
      .withMessage('Provider must be google or microsoft'),
  ],
  validateRequest,
  asyncHandler(authController.unlinkOAuthProvider)
);

// Get linked OAuth providers
router.get('/oauth',
  authenticate,
  asyncHandler(authController.getLinkedProviders)
);

// Check password strength
router.post('/password/check-strength',
  [
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  validateRequest,
  asyncHandler(authController.checkPasswordStrength)
);

// Get password policy
router.get('/password/policy',
  asyncHandler(authController.getPasswordPolicy)
);

// Check email availability
router.post('/check-email',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
  ],
  validateRequest,
  asyncHandler(authController.checkEmailAvailability)
);

// Get account security status
router.get('/security-status',
  authenticate,
  asyncHandler(authController.getSecurityStatus)
);

// Export account data (GDPR compliance)
router.post('/export-data',
  authenticate,
  rateLimiter.dataExport,
  asyncHandler(authController.exportUserData)
);

// Delete account
router.delete('/account',
  authenticate,
  [
    body('password')
      .notEmpty()
      .withMessage('Password is required to delete account'),
    body('confirmDelete')
      .equals('true')
      .withMessage('Account deletion must be confirmed'),
  ],
  validateRequest,
  asyncHandler(authController.deleteAccount)
);

export default router;
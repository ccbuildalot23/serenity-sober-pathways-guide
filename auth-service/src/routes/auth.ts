import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { AuthService } from '../services/authService';
import { MfaService } from '../services/mfaService';

const router = Router();
const authService = new AuthService();
const mfaService = new MfaService();

// Registration validation
const registrationValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name required (1-50 chars)'),
  body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name required (1-50 chars)'),
  body('role').isIn(['patient', 'provider', 'supporter']).withMessage('Valid role required'),
];

// Login validation
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required'),
];

// Register user
router.post('/register', registrationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role } = req.body;
    
    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      role
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info(`User registered: ${email}`, { role });
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      userId: result.userId
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, mfaToken } = req.body;
    
    const result = await authService.login(email, password, mfaToken);
    
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    // Set secure HTTP-only cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`User logged in: ${email}`);
    
    res.json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
      requiresMfa: result.requiresMfa
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('refreshToken');
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const result = await authService.refreshToken(refreshToken);
    
    if (!result.success) {
      res.clearCookie('refreshToken');
      return res.status(401).json({ error: result.error });
    }

    res.json({
      success: true,
      accessToken: result.accessToken
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Setup MFA
router.post('/mfa/setup', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const result = await mfaService.setupMfa(userId);
    
    res.json({
      success: true,
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes: result.backupCodes
    });
  } catch (error) {
    logger.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

// Verify MFA
router.post('/mfa/verify', async (req, res) => {
  try {
    const { userId, token } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({ error: 'User ID and token required' });
    }

    const isValid = await mfaService.verifyMfaToken(userId, token);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid MFA token' });
    }

    await mfaService.enableMfa(userId);
    
    res.json({
      success: true,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    logger.error('MFA verification error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// Password reset request
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    await authService.requestPasswordReset(email);
    
    // Always return success for security
    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.'
    });
  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

// Reset password with token
router.post('/reset-password/confirm', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    const result = await authService.resetPassword(token, newPassword);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export { router as authRoutes };
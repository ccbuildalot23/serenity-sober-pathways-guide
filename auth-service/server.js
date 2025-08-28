import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import winston from 'winston';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import UAParser from 'ua-parser-js';
import nodemailer from 'nodemailer';
import Joi from 'joi';
import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';

dotenv.config();

// ============================================================================
// CONFIGURATION & SETUP
// ============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// Winston Logger Configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Redis Client
const redis = createRedisClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redis.connect().catch(err => logger.error('Redis connection failed', err));

// Email Transporter - optional for development
let emailTransporter = null;
try {
  if (process.env.SMTP_HOST) {
    // Only create transporter if SMTP is configured
    emailTransporter = {
      sendMail: async (options) => {
        logger.info('Email would be sent:', options);
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }
} catch (err) {
  logger.warn('Email transporter not configured:', err.message);
}

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const PHI_SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes for PHI access

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'session-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: PHI_SESSION_TIMEOUT
  }
}));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Auth Rate Limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Device Fingerprinting
function generateDeviceFingerprint(req) {
  const ua = new UAParser(req.headers['user-agent']);
  const fingerprint = {
    browser: ua.getBrowser(),
    os: ua.getOS(),
    device: ua.getDevice(),
    ip: req.ip,
    timestamp: new Date().toISOString()
  };
  return Buffer.from(JSON.stringify(fingerprint)).toString('base64');
}

// Audit Logging
async function logSecurityEvent(eventType, userId, req, riskLevel = 'low', metadata = {}) {
  try {
    const deviceFingerprint = generateDeviceFingerprint(req);
    
    await supabase
      .from('security_audit_logs')
      .insert({
        event_type: eventType,
        user_id: userId,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        risk_level: riskLevel,
        metadata: {
          ...metadata,
          device_fingerprint: deviceFingerprint
        }
      });

    logger.info('Security event logged', {
      eventType,
      userId,
      ip: req.ip,
      riskLevel
    });
  } catch (error) {
    logger.error('Failed to log security event', error);
  }
}

// Rate Limit Tracking
async function trackRateLimit(endpoint, identifier, ip, success = true) {
  try {
    await supabase
      .from('rate_limit_attempts')
      .insert({
        endpoint,
        identifier,
        ip_address: ip,
        success
      });
  } catch (error) {
    logger.error('Failed to track rate limit', error);
  }
}

// Generate Tokens
function generateTokens(userId, role) {
  const payload = { userId, role };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'serenity-auth',
    audience: 'serenity-app'
  });
  
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'serenity-auth',
    audience: 'serenity-app'
  });
  
  return { accessToken, refreshToken };
}

// Verify Token
function verifyToken(token, secret = JWT_SECRET) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required(),
  fullName: Joi.string().min(2).max(100).required(),
  phoneNumber: Joi.string().pattern(/^\\+?[1-9]\\d{1,14}$/).optional(),
  role: Joi.string().valid('patient', 'support_member', 'provider').optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  mfaCode: Joi.string().length(6).pattern(/^[0-9]+$/).optional()
});

const passwordResetSchema = Joi.object({
  email: Joi.string().email().required()
});

const passwordUpdateSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required()
});

const profileUpdateSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  phoneNumber: Joi.string().pattern(/^\\+?[1-9]\\d{1,14}$/).optional()
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      await logSecurityEvent('invalid_token', null, req, 'medium');
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Check if user still exists
    const { data: user, error } = await supabase.auth.admin.getUserById(decoded.userId);
    if (error || !user) {
      return res.status(403).json({ error: 'User not found' });
    }

    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch (error) {
    logger.error('Token verification failed', error);
    res.status(403).json({ error: 'Token verification failed' });
  }
}

function requireRole(roles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      await logSecurityEvent('unauthorized_access', req.user.id, req, 'high', { 
        requiredRoles: roles, 
        userRole: req.user.role 
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// ============================================================================
// BRUTE FORCE PROTECTION
// ============================================================================

const loginAttempts = new Map();

function getBruteForceKey(email, ip) {
  return `bf:${email}:${ip}`;
}

async function checkBruteForce(email, ip) {
  const key = getBruteForceKey(email, ip);
  const attempts = loginAttempts.get(key) || { count: 0, lockUntil: null };
  
  if (attempts.lockUntil && attempts.lockUntil > Date.now()) {
    const lockTimeRemaining = Math.ceil((attempts.lockUntil - Date.now()) / 1000);
    throw new Error(`Account locked due to too many failed attempts. Try again in ${lockTimeRemaining} seconds.`);
  }
  
  return attempts;
}

async function recordFailedAttempt(email, ip) {
  const key = getBruteForceKey(email, ip);
  const attempts = loginAttempts.get(key) || { count: 0, lockUntil: null };
  
  attempts.count += 1;
  
  // Progressive lockout: 1min, 5min, 15min, 1hour
  const lockDurations = [60000, 300000, 900000, 3600000];
  if (attempts.count >= 3) {
    const lockIndex = Math.min(attempts.count - 3, lockDurations.length - 1);
    attempts.lockUntil = Date.now() + lockDurations[lockIndex];
  }
  
  loginAttempts.set(key, attempts);
  
  // Store in Redis for persistence
  try {
    await redis.setEx(key, 3600, JSON.stringify(attempts));
  } catch (error) {
    logger.error('Failed to store brute force data in Redis', error);
  }
}

async function clearFailedAttempts(email, ip) {
  const key = getBruteForceKey(email, ip);
  loginAttempts.delete(key);
  
  try {
    await redis.del(key);
  } catch (error) {
    logger.error('Failed to clear brute force data from Redis', error);
  }
}

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'auth', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// User Registration
app.post('/auth/register', authLimiter, async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, fullName, phoneNumber, role = 'patient' } = value;

    await trackRateLimit('/auth/register', email, req.ip);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      await logSecurityEvent('registration_attempt_existing_email', null, req, 'medium', { email });
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // We'll handle email verification separately
      user_metadata: {
        full_name: fullName,
        phone_number: phoneNumber
      }
    });

    if (authError) {
      logger.error('User creation failed', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        phone_number: phoneNumber
      });

    if (profileError) {
      logger.error('Profile creation failed', profileError);
      // Cleanup auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Registration failed' });
    }

    // Assign role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role
      });

    if (roleError) {
      logger.error('Role assignment failed', roleError);
    }

    // Generate email verification token
    const verificationToken = jwt.sign(
      { userId: authData.user.id, purpose: 'email_verification' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    try {
      await emailTransporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Verify your Serenity account',
        html: `
          <h2>Welcome to Serenity Sober Pathways</h2>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
        `
      });
    } catch (emailError) {
      logger.error('Verification email failed', emailError);
    }

    await logSecurityEvent('user_registered', authData.user.id, req, 'low', { role });

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: authData.user.id,
        email,
        fullName,
        role
      }
    });

  } catch (error) {
    logger.error('Registration error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Email Verification
app.post('/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.purpose !== 'email_verification') {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user as verified
    const { error } = await supabase.auth.admin.updateUserById(decoded.userId, {
      email_confirm: true
    });

    if (error) {
      logger.error('Email verification failed', error);
      return res.status(400).json({ error: 'Verification failed' });
    }

    await logSecurityEvent('email_verified', decoded.userId, req, 'low');

    res.json({ message: 'Email verified successfully' });

  } catch (error) {
    logger.error('Email verification error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, mfaCode } = value;

    await trackRateLimit('/auth/login', email, req.ip);

    // Check brute force protection
    try {
      await checkBruteForce(email, req.ip);
    } catch (bruteForceError) {
      await logSecurityEvent('login_blocked_brute_force', null, req, 'high', { email });
      return res.status(429).json({ error: bruteForceError.message });
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      await recordFailedAttempt(email, req.ip);
      await trackRateLimit('/auth/login', email, req.ip, false);
      await logSecurityEvent('login_failed', null, req, 'medium', { email, reason: authError.message });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!authData.user.email_confirmed_at) {
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in',
        requiresVerification: true
      });
    }

    // Get user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .single();

    const userRole = roleData?.role || 'patient';

    // Check if MFA is enabled
    const { data: mfaData } = await supabase
      .from('mfa_settings')
      .select('enabled')
      .eq('user_id', authData.user.id)
      .single();

    if (mfaData?.enabled) {
      if (!mfaCode) {
        return res.status(200).json({
          requiresMfa: true,
          message: 'MFA code required'
        });
      }

      // Verify MFA code
      const { data: secretData } = await supabase
        .from('mfa_settings')
        .select('secret')
        .eq('user_id', authData.user.id)
        .single();

      const verified = speakeasy.totp.verify({
        secret: secretData.secret,
        encoding: 'base32',
        token: mfaCode,
        window: 2 // Allow 2 steps of variance
      });

      if (!verified) {
        await recordFailedAttempt(email, req.ip);
        await logSecurityEvent('mfa_failed', authData.user.id, req, 'high');
        return res.status(401).json({ error: 'Invalid MFA code' });
      }
    }

    // Clear failed attempts on successful login
    await clearFailedAttempts(email, req.ip);

    // Generate tokens
    const tokens = generateTokens(authData.user.id, userRole);

    // Store refresh token in secure httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Create session
    req.session.userId = authData.user.id;
    req.session.role = userRole;
    req.session.phiAccessExpires = Date.now() + PHI_SESSION_TIMEOUT;

    await logSecurityEvent('user_logged_in', authData.user.id, req, 'low');

    res.json({
      message: 'Login successful',
      accessToken: tokens.accessToken,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userRole
      }
    });

  } catch (error) {
    logger.error('Login error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token Refresh
app.post('/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);
    if (!decoded) {
      await logSecurityEvent('invalid_refresh_token', null, req, 'medium');
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Verify user still exists and get current role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', decoded.userId)
      .single();

    if (!roleData) {
      return res.status(403).json({ error: 'User not found' });
    }

    // Generate new tokens
    const tokens = generateTokens(decoded.userId, roleData.role);

    // Update refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logSecurityEvent('token_refreshed', decoded.userId, req, 'low');

    res.json({
      accessToken: tokens.accessToken
    });

  } catch (error) {
    logger.error('Token refresh error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    // Destroy session
    req.session.destroy(() => {
      logger.info('Session destroyed for user', { userId: req.user.id });
    });

    await logSecurityEvent('user_logged_out', req.user.id, req, 'low');

    res.json({ message: 'Logout successful' });

  } catch (error) {
    logger.error('Logout error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// PASSWORD RESET ENDPOINTS
// ============================================================================

// Request Password Reset
app.post('/auth/password-reset', authLimiter, async (req, res) => {
  try {
    const { error, value } = passwordResetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email } = value;

    await trackRateLimit('/auth/password-reset', email, req.ip);

    // Check if user exists
    const { data: userData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (!userData) {
      // Don't reveal if user exists or not
      await logSecurityEvent('password_reset_attempt_unknown_email', null, req, 'low', { email });
      return res.json({ message: 'If the email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: userData.id, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    try {
      await emailTransporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: 'Reset your Serenity password',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Serenity account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        `
      });
    } catch (emailError) {
      logger.error('Password reset email failed', emailError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    await logSecurityEvent('password_reset_requested', userData.id, req, 'low');

    res.json({ message: 'If the email exists, a password reset link has been sent.' });

  } catch (error) {
    logger.error('Password reset request error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Password with Reset Token
app.post('/auth/password-update', authLimiter, async (req, res) => {
  try {
    const { error, value } = passwordUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { token, newPassword } = value;

    const decoded = verifyToken(token);
    if (!decoded || decoded.purpose !== 'password_reset') {
      await logSecurityEvent('invalid_password_reset_token', null, req, 'medium');
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(decoded.userId, {
      password: newPassword
    });

    if (updateError) {
      logger.error('Password update failed', updateError);
      return res.status(400).json({ error: 'Password update failed' });
    }

    await logSecurityEvent('password_updated', decoded.userId, req, 'medium');

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    logger.error('Password update error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// MFA ENDPOINTS
// ============================================================================

// Setup MFA
app.post('/auth/mfa/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if MFA is already enabled
    const { data: existingMfa } = await supabase
      .from('mfa_settings')
      .select('enabled')
      .eq('user_id', userId)
      .single();

    if (existingMfa?.enabled) {
      return res.status(400).json({ error: 'MFA is already enabled' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: 'Serenity Sober Pathways',
      account: req.user.email || userId,
      length: 32
    });

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(uuidv4().replace(/-/g, '').substring(0, 8));
    }

    // Store MFA settings (not enabled yet)
    const { error: mfaError } = await supabase
      .from('mfa_settings')
      .upsert({
        user_id: userId,
        secret: secret.base32,
        backup_codes: JSON.stringify(backupCodes),
        enabled: false
      });

    if (mfaError) {
      logger.error('MFA setup failed', mfaError);
      return res.status(500).json({ error: 'MFA setup failed' });
    }

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    await logSecurityEvent('mfa_setup_initiated', userId, req, 'low');

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes
    });

  } catch (error) {
    logger.error('MFA setup error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enable MFA
app.post('/auth/mfa/enable', authenticateToken, async (req, res) => {
  try {
    const { mfaCode } = req.body;
    const userId = req.user.id;

    if (!mfaCode) {
      return res.status(400).json({ error: 'MFA code required' });
    }

    // Get the secret
    const { data: mfaData } = await supabase
      .from('mfa_settings')
      .select('secret')
      .eq('user_id', userId)
      .single();

    if (!mfaData) {
      return res.status(400).json({ error: 'MFA not set up' });
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: mfaData.secret,
      encoding: 'base32',
      token: mfaCode,
      window: 2
    });

    if (!verified) {
      await logSecurityEvent('mfa_enable_failed', userId, req, 'medium');
      return res.status(400).json({ error: 'Invalid MFA code' });
    }

    // Enable MFA
    const { error } = await supabase
      .from('mfa_settings')
      .update({ enabled: true })
      .eq('user_id', userId);

    if (error) {
      logger.error('MFA enable failed', error);
      return res.status(500).json({ error: 'Failed to enable MFA' });
    }

    await logSecurityEvent('mfa_enabled', userId, req, 'low');

    res.json({ message: 'MFA enabled successfully' });

  } catch (error) {
    logger.error('MFA enable error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable MFA
app.post('/auth/mfa/disable', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      return res.status(400).json({ error: 'Password required to disable MFA' });
    }

    // Verify password
    const { data: user } = await supabase.auth.admin.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.user.email,
      password
    });

    if (signInError) {
      await logSecurityEvent('mfa_disable_failed_auth', userId, req, 'high');
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Disable MFA
    const { error } = await supabase
      .from('mfa_settings')
      .update({ enabled: false })
      .eq('user_id', userId);

    if (error) {
      logger.error('MFA disable failed', error);
      return res.status(500).json({ error: 'Failed to disable MFA' });
    }

    await logSecurityEvent('mfa_disabled', userId, req, 'medium');

    res.json({ message: 'MFA disabled successfully' });

  } catch (error) {
    logger.error('MFA disable error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// USER PROFILE ENDPOINTS
// ============================================================================

// Get Current User Profile
app.get('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const { data: mfaData } = await supabase
      .from('mfa_settings')
      .select('enabled')
      .eq('user_id', userId)
      .single();

    res.json({
      ...profile,
      role: roleData?.role || 'patient',
      mfaEnabled: mfaData?.enabled || false
    });

  } catch (error) {
    logger.error('Get profile error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update User Profile
app.put('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { error, value } = profileUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user.id;
    const updateData = {
      ...value,
      updated_at: new Date().toISOString()
    };

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      logger.error('Profile update failed', updateError);
      return res.status(400).json({ error: 'Profile update failed' });
    }

    await logSecurityEvent('profile_updated', userId, req, 'low');

    res.json(updatedProfile);

  } catch (error) {
    logger.error('Update profile error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// ROLE MANAGEMENT ENDPOINTS (Admin only)
// ============================================================================

// Get All Users (Admin only)
app.get('/auth/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles(role),
        mfa_settings(enabled)
      `);

    if (error) {
      logger.error('Get users failed', error);
      return res.status(500).json({ error: 'Failed to retrieve users' });
    }

    await logSecurityEvent('users_accessed', req.user.id, req, 'low');

    res.json(users);

  } catch (error) {
    logger.error('Get users error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update User Role (Admin only)
app.put('/auth/users/:userId/role', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['patient', 'support_member', 'provider', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role
      });

    if (error) {
      logger.error('Role update failed', error);
      return res.status(400).json({ error: 'Role update failed' });
    }

    await logSecurityEvent('role_updated', userId, req, 'medium', { 
      newRole: role, 
      updatedBy: req.user.id 
    });

    res.json({ message: 'Role updated successfully' });

  } catch (error) {
    logger.error('Update role error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

// Check Session Status
app.get('/auth/session', authenticateToken, (req, res) => {
  const phiAccess = req.session.phiAccessExpires > Date.now();
  
  res.json({
    userId: req.user.id,
    role: req.user.role,
    phiAccess,
    sessionExpires: req.session.phiAccessExpires
  });
});

// Extend PHI Session
app.post('/auth/session/extend', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required to extend PHI access' });
    }

    // Get user email to verify password
    const { data: user } = await supabase.auth.admin.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.user.email,
      password
    });

    if (signInError) {
      await logSecurityEvent('phi_access_extension_failed', req.user.id, req, 'high');
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Extend PHI access
    req.session.phiAccessExpires = Date.now() + PHI_SESSION_TIMEOUT;

    await logSecurityEvent('phi_access_extended', req.user.id, req, 'low');

    res.json({ 
      message: 'PHI access extended',
      expiresAt: req.session.phiAccessExpires
    });

  } catch (error) {
    logger.error('PHI session extend error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', error);
  
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await redis.disconnect();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error('Error disconnecting Redis', error);
  }
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
  
  console.log(`
🔐 Serenity Auth Service Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Server: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
🛡️  Security: Helmet, CORS, Rate Limiting enabled
🔑 Features: JWT, MFA, RBAC, Session Management
📝 Logging: Winston with security audit trail
🗄️  Database: Supabase PostgreSQL with RLS
🎯 Environment: ${process.env.NODE_ENV || 'development'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;
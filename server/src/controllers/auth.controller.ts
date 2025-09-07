import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { supabase, db } from '../config/database';
import { config } from '../config/config';
import { AppError } from '../middleware/errorHandler';
import { logger, logAuditEvent } from '../utils/logger';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { email, password, fullName, role } = req.body;
      
      // Check if user already exists
      const existingUser = await db.users.findByEmail(email);
      if (existingUser) {
        return next(new AppError('User already exists', 409));
      }
      
      // Create auth user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });
      
      if (authError) {
        logger.error('Supabase auth error:', authError);
        return next(new AppError('Registration failed', 500));
      }
      
      // Create user profile
      const userProfile = await db.users.create({
        id: authData.user?.id,
        email,
        full_name: fullName,
        created_at: new Date().toISOString(),
      });
      
      // Create user role
      await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user?.id,
          role,
        });
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: authData.user?.id,
          email,
          role,
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
      );
      
      // Log audit event
      logAuditEvent(authData.user?.id || '', 'USER_REGISTER', 'user', authData.user?.id, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: authData.user?.id,
          email,
          fullName,
          role,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  },
  
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { email, password } = req.body;
      
      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        logAuditEvent('unknown', 'LOGIN_FAILED', 'auth', undefined, {
          email,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        return next(new AppError('Invalid credentials', 401));
      }
      
      // Get user profile and role
      const userProfile = await db.users.findById(authData.user.id);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();
      
      // Generate JWT token
      const token = jwt.sign(
        {
          id: authData.user.id,
          email: authData.user.email,
          role: roleData?.role || 'patient',
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
      );
      
      // Log audit event
      logAuditEvent(authData.user.id, 'LOGIN_SUCCESS', 'auth', undefined, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          fullName: userProfile?.full_name,
          role: roleData?.role,
        },
        token,
      });
    } catch (error) {
      next(error);
    }
  },
  
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logger.error('Logout error:', error);
      }
      
      // Log audit event
      logAuditEvent(req.user?.id || '', 'LOGOUT', 'auth', undefined, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      
      res.status(200).json({
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  },
  
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return next(new AppError('Refresh token required', 400));
      }
      
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });
      
      if (error) {
        return next(new AppError('Invalid refresh token', 401));
      }
      
      res.status(200).json({
        token: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
      });
    } catch (error) {
      next(error);
    }
  },
  
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.protocol}://${req.get('host')}/reset-password`,
      });
      
      if (error) {
        logger.error('Password reset error:', error);
      }
      
      // Always return success to prevent email enumeration
      res.status(200).json({
        message: 'If an account exists, a password reset link has been sent',
      });
    } catch (error) {
      next(error);
    }
  },
  
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        return next(new AppError('Password reset failed', 400));
      }
      
      res.status(200).json({
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  },
  
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      const userProfile = await db.users.findById(userId!);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      res.status(200).json({
        user: {
          id: userId,
          email: userProfile?.email,
          fullName: userProfile?.full_name,
          role: roleData?.role,
          createdAt: userProfile?.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },
  
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const updates = req.body;
      
      // Remove sensitive fields from updates
      delete updates.id;
      delete updates.email;
      delete updates.role;
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) {
        return next(new AppError('Profile update failed', 400));
      }
      
      res.status(200).json({
        message: 'Profile updated successfully',
        user: data,
      });
    } catch (error) {
      next(error);
    }
  },
};
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { AppError } from './errorHandler';
import { supabase } from '../config/database';
import { logAuditEvent } from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401));
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    
    // Attach user to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    
    // Check session timeout for PHI access
    if (decoded.iat) {
      const sessionAge = Date.now() - decoded.iat * 1000;
      if (sessionAge > config.SESSION_TIMEOUT) {
        logAuditEvent(decoded.id, 'SESSION_TIMEOUT', 'auth', undefined, {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
        return next(new AppError('Session expired for PHI access', 401));
      }
    }
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      logAuditEvent(req.user.id, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'auth', undefined, {
        requiredRoles: roles,
        userRole: req.user.role,
        path: req.path,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      return next(new AppError('Insufficient permissions', 403));
    }
    
    next();
  };
};

// Middleware to check if user owns the resource
export const checkResourceOwnership = (resourceType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const resourceId = req.params.id;
      
      // Check ownership based on resource type
      let isOwner = false;
      
      switch (resourceType) {
        case 'checkin':
          const { data: checkin } = await supabase
            .from('daily_checkins')
            .select('user_id')
            .eq('id', resourceId)
            .single();
          isOwner = checkin?.user_id === userId;
          break;
          
        case 'goal':
          const { data: goal } = await supabase
            .from('recovery_goals')
            .select('user_id')
            .eq('id', resourceId)
            .single();
          isOwner = goal?.user_id === userId;
          break;
          
        // Add more resource types as needed
      }
      
      if (!isOwner && req.user?.role !== 'admin') {
        return next(new AppError('Access denied', 403));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};
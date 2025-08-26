import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        sessionId?: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify token
    const decoded = AuthService.verifyToken(token);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      sessionId: decoded.sessionId,
    };

    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = AuthService.verifyToken(token);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        sessionId: decoded.sessionId,
      };
    }

    next();
  } catch (error) {
    // Silently continue without auth if token is invalid
    next();
  }
}; 
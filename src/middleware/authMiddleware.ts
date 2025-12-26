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
    
    // Extract user info, preferring standard claims or custom ones
    const userId = decoded.userId || decoded.sub;
    
    if (!userId) {
      throw new Error('User ID not found in token');
    }

    const fullUser = await AuthService.findUserById(userId);
    
    if (!fullUser) {
      return res.status(401).json({
        success: false,
        error: 'User not found in database'
      });
    }
    
    // Generate a fallback session ID if not present in token
    // This allows us to have a stable identifier for this specific token
    const sessionId = decoded.sessionId || decoded.jti || 
      token.split('.').pop()?.substring(0, 16) || 'anonymous';
    
    // Add user info to request
    req.user = {
      userId,
      email: fullUser.email,
      sessionId
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
      try {
        const decoded = AuthService.verifyToken(token);
        const userId = decoded.userId || decoded.sub;
        
        if (userId) {
          const sessionId = decoded.sessionId || decoded.jti || 
            token.split('.').pop()?.substring(0, 16) || 'anonymous';
            
          req.user = {
            userId,
            email: decoded.email || '',
            sessionId,
          };
        }
      } catch (e) {
        // Ignore invalid tokens in optional auth
      }
    }

    next();
  } catch (error) {
    // Silently continue without auth if token is invalid
    next();
  }
}; 
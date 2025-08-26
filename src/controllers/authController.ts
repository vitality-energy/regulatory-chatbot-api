import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { z } from 'zod';

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  forceLogin: z.boolean().optional(),
});


export class AuthController {
  /**
   * Login endpoint
   */
  static async login(req: Request, res: Response) {
    try {
      // Validate request body
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input',
          details: validationResult.error.errors,
        });
      }

      const { email, password, forceLogin } = validationResult.data;

      // Get user agent and IP address for session tracking
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

      // If not forced login, check for existing sessions first
      if (!forceLogin) {
        const credentialsResult = await AuthService.checkCredentials(email, password);
        
        if (!credentialsResult) {
          return res.status(401).json({
            success: false,
            error: 'Invalid email or password',
          });
        }

        // If user has existing sessions, return a warning
        if (credentialsResult.existingSessions.length > 0) {
          return res.status(409).json({ // 409 Conflict
            success: false,
            error: 'EXISTING_SESSION_WARNING',
            data: {
              user: {
                id: credentialsResult.user.id,
                email: credentialsResult.user.email,
              },
              existingSessions: credentialsResult.existingSessions.map(session => ({
                sessionId: session.sessionId,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                userAgent: session.userAgent,
                ipAddress: session.ipAddress,
              })),
            },
            message: 'You have an active session. Proceeding will log out your other sessions.',
          });
        }
      }

      // Authenticate user with session management (will invalidate existing sessions)
      const authResult = await AuthService.authenticateUser(email, password, userAgent, ipAddress);
      
      if (!authResult) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }

      const { user, token, sessionId } = authResult;

      // Log session creation and invalidation
      console.log(`User ${user.email} logged in. New session: ${sessionId}. Previous sessions invalidated.`);

      // Return success response with session info
      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
          },
          token,
          sessionId,
        },
        message: forceLogin 
          ? 'Login successful. Previous sessions have been terminated.' 
          : 'Login successful.',
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Verify token endpoint (to check if token is still valid)
   */
  static async verifyToken(req: Request, res: Response) {
    try {
      // User info is already attached by authMiddleware
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'No user information found',
        });
      }

      // Get full user details
      const fullUser = await AuthService.findUserById(user.userId);
      
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.json({
        success: true,
        data: {
          user: {
            id: fullUser.id,
            email: fullUser.email,
            createdAt: fullUser.createdAt,
          },
        },
      });
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Logout endpoint
   */
  static async logout(req: Request, res: Response) {
    try {
      // Extract session ID from the JWT token (decoded by middleware)
      const user = req.user;
      
      if (!user || !user.sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid token - no session ID found',
        });
      }

      // Logout the session
      const success = AuthService.logout(user.sessionId);

      if (success) {
        console.log(`User ${user.userId} logged out from session ${user.sessionId}`);
        return res.json({
          success: true,
          message: 'Logged out successfully',
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Session not found or already logged out',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

} 
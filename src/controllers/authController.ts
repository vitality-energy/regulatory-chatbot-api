import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

export class AuthController {
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
   * Get currently logged in user details
   */
  static async me(req: Request, res: Response) {
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

      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      return res.json({
        success: true,
        data: {
          user: {
            id: fullUser.id,
            email: fullUser.email,
            createdAt: fullUser.createdAt,
          },
          token,
          sessionId: user.sessionId,
        },
        message: 'Login successful.',
      });
    } catch (error) {
      console.error('Auth me error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
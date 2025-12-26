import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * GET /auth/verify
 * Verify if current token is valid (requires authentication)
 */
router.get('/verify', authenticateToken, AuthController.verifyToken);

/**
 * GET /auth/me
 * Get currently logged in user details
 */
router.get('/me', authenticateToken, AuthController.me);

export default router;
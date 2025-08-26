import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', AuthController.login);

/**
 * GET /auth/verify
 * Verify if current token is valid (requires authentication)
 */
router.get('/verify', authenticateToken, AuthController.verifyToken);

/**
 * POST /auth/logout
 * Logout current session (requires authentication)
 */
router.post('/logout', authenticateToken, AuthController.logout);

export default router; 
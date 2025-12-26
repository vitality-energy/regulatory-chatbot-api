import { AuthService } from '../services/authService';
import { UserService } from '../services';
import jwt from 'jsonwebtoken';

// Mock external dependencies
jest.mock('jsonwebtoken');
jest.mock('../services/userService');

const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedUserService = UserService as jest.Mocked<typeof UserService>;

describe('AuthService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWebSocketService = {
    closeSession: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear static sessions
    (AuthService as any).activeSessions.clear();
    // Set up mock WebSocket service
    AuthService.setWebSocketService(mockWebSocketService);
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = 'valid-token';
      const sessionId = 'session-123';
      const decoded = {
        userId: mockUser.id,
        email: mockUser.email,
        sessionId,
      };
      mockedJwt.verify.mockImplementation(() => {
        return decoded;
      });
      
      const result = AuthService.verifyToken(token);

      expect(mockedJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(result).toEqual(decoded);
    });

    it('should throw error for invalid token', () => {
      const token = 'invalid-token';

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => AuthService.verifyToken(token)).toThrow('Invalid or expired token');
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      mockedUserService.findUserByEmail.mockResolvedValue(mockUser);

      const result = await AuthService.findUserByEmail(mockUser.email);

      expect(mockedUserService.findUserByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockedUserService.findUserByEmail.mockResolvedValue(null);

      const result = await AuthService.findUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockedUserService.findUserByEmail.mockRejectedValue(new Error('Database error'));

      await expect(AuthService.findUserByEmail(mockUser.email)).rejects.toThrow('Database error');
    });
  });

  describe('findUserById', () => {
    it('should find user by ID', async () => {
      mockedUserService.findUserById.mockResolvedValue(mockUser);

      const result = await AuthService.findUserById(mockUser.id);

      expect(mockedUserService.findUserById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });
  });

  describe('session management', () => {
    it('should check if session is valid', () => {
      const sessionId = 'session-123';
      const session = {
        userId: mockUser.id,
        sessionId,
        token: 'token',
        createdAt: new Date(),
        lastActivity: new Date('2023-01-01'),
      } as any;

      (AuthService as any).activeSessions.set(sessionId, session);

      const result = AuthService.isSessionValid(sessionId);

      expect(result).toBe(true);
      // Check that last activity was updated
      expect(session.lastActivity.getTime()).toBeGreaterThan(new Date('2023-01-01').getTime());
    });

    it('should return false for invalid session', () => {
      const result = AuthService.isSessionValid('non-existent-session');

      expect(result).toBe(false);
    });

    it('should get session info', () => {
      const sessionId = 'session-123';
      const session = {
        userId: mockUser.id,
        sessionId,
        token: 'token',
        createdAt: new Date(),
        lastActivity: new Date(),
      } as any;

      (AuthService as any).activeSessions.set(sessionId, session);

      const result = AuthService.getSession(sessionId);

      expect(result).toEqual(session);
    });

    it('should get active sessions count', () => {
      // Add some sessions
      (AuthService as any).activeSessions.set('s1', { userId: 'u1' } as any);
      (AuthService as any).activeSessions.set('s2', { userId: 'u2' } as any);

      const count = AuthService.getActiveSessionsCount();

      expect(count).toBe(2);
    });

    it('should get user sessions', () => {
      const otherUserId = 'user-456';
      
      (AuthService as any).activeSessions.set('s1', { userId: mockUser.id } as any);
      (AuthService as any).activeSessions.set('s2', { userId: otherUserId } as any);

      const userSessions = AuthService.getUserSessions(mockUser.id);

      expect(userSessions).toHaveLength(1);
      expect(userSessions[0].userId).toBe(mockUser.id);
    });
  });
});

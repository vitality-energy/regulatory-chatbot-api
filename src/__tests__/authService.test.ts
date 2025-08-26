import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock external dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../services/userService');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
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

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashedPassword123';
      
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await AuthService.hashPassword(password);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

   
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const password = 'testPassword123';
      const hash = 'hashedPassword123';
      
      jest.spyOn(mockedBcrypt, 'compare').mockImplementation(
        () => new Promise((resolve) => resolve(true)),
    )

      const result = await AuthService.verifyPassword(password, hash);

      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'wrongPassword';
      const hash = 'hashedPassword123';
      
      jest.spyOn(mockedBcrypt, 'compare').mockImplementation(
        () => new Promise((resolve) => resolve(false)),
    )

      const result = await AuthService.verifyPassword(password, hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with user data', () => {
      const token = 'generated-jwt-token';
      
      jest.spyOn(mockedJwt, 'sign').mockImplementationOnce(() => {
        return token;
      });

      const result = AuthService.generateToken(mockUser);
      console.log(result);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          sessionId: expect.stringContaining('session_'),
          iat: expect.any(Number),
        }),
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      expect(result).toBe(token);
    });


    it('should use provided sessionId when given', () => {
      const customSessionId = 'custom-session-123';
      const token = 'generated-jwt-token';
      
      jest.spyOn(mockedJwt, 'sign').mockImplementationOnce(() => {
        return token;
      });

      AuthService.generateToken(mockUser, customSessionId);

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: customSessionId,
        }),
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
    });
  });

  describe('createSession', () => {
    it('should create new session and invalidate existing ones', () => {
      const userAgent = 'Mozilla/5.0';
      const ipAddress = '192.168.1.1';

      jest.spyOn(mockedJwt, 'sign').mockImplementationOnce(() => {
        return 'new-token';
      });

      const result = AuthService.createSession(mockUser, userAgent, ipAddress);

      expect(result).toEqual({
        token: 'new-token',
        sessionId: expect.stringContaining('session_'),
      });

      // Check that session is stored
      const sessions = AuthService.getUserSessions(mockUser.id);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        userId: mockUser.id,
        userAgent,
        ipAddress,
      });
    });

    it('should invalidate existing sessions when creating new one', () => {
      // Create first session
      jest.spyOn(mockedJwt, 'sign').mockImplementationOnce(() => {
        return 'token-1';
      });
      const session1 = AuthService.createSession(mockUser);

      // Create second session (should invalidate first)
      jest.spyOn(mockedJwt, 'sign').mockImplementationOnce(() => {
        return 'token-2';
      });
      const session2 = AuthService.createSession(mockUser);

      const sessions = AuthService.getUserSessions(mockUser.id);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe(session2.sessionId);
      expect(mockWebSocketService.closeSession).toHaveBeenCalledWith(
        session1.sessionId,
        'Session invalidated by new login',
        true
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and session', () => {
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
      
      // Create session to make it valid
      (AuthService as any).activeSessions.set(sessionId, {
        userId: mockUser.id,
        sessionId,
        token,
        createdAt: new Date(),
        lastActivity: new Date(),
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

    it('should throw error for invalidated session', () => {
      const token = 'valid-token';
      const sessionId = 'invalid-session-123';
      const decoded = {
        userId: mockUser.id,
        email: mockUser.email,
        sessionId,
      };

      jest.spyOn(mockedJwt, 'verify').mockImplementationOnce(() => {
        return decoded;
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

  describe('authenticateUser', () => {
    it('should authenticate user with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const userAgent = 'Mozilla/5.0';
      const ipAddress = '192.168.1.1';

      // Mock UserDao response
      mockedUserService.findUserByEmail.mockResolvedValue(mockUser);

      // Mock password verification
      jest.spyOn(mockedBcrypt, 'compare').mockImplementationOnce(() => {
        return true;
      });

      // Mock token generation
      jest.spyOn(mockedJwt, 'sign').mockImplementationOnce(() => {
        return 'auth-token';
      });

      const result = await AuthService.authenticateUser(email, password, userAgent, ipAddress);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
        token: 'auth-token',
        sessionId: expect.stringContaining('session_'),
      });
    });

    it('should return null for non-existent user', async () => {
      mockedUserService.findUserByEmail.mockResolvedValue(null);

      const result = await AuthService.authenticateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      mockedUserService.findUserByEmail.mockResolvedValue(mockUser);
      jest.spyOn(mockedBcrypt, 'compare').mockImplementation(
        () => new Promise((resolve) => resolve(false)),
    )

      const result = await AuthService.authenticateUser(mockUser.email, 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout user and close WebSocket connection', () => {
      const sessionId = 'session-123';
      const session = {
        userId: mockUser.id,
        sessionId,
        token: 'token',
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      // Add session to active sessions
      (AuthService as any).activeSessions.set(sessionId, session);

      const result = AuthService.logout(sessionId);

      expect(result).toBe(true);
      expect(AuthService.getSession(sessionId)).toBeNull();
      expect(mockWebSocketService.closeSession).toHaveBeenCalledWith(
        sessionId,
        'User logged out',
        true
      );
    });

    it('should return false for non-existent session', () => {
      const result = AuthService.logout('non-existent-session');

      expect(result).toBe(false);
    });

    it('should skip WebSocket close when requested', () => {
      const sessionId = 'session-123';
      const session = {
        userId: mockUser.id,
        sessionId,
        token: 'token',
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      (AuthService as any).activeSessions.set(sessionId, session);

      AuthService.logout(sessionId, true);

      expect(mockWebSocketService.closeSession).not.toHaveBeenCalled();
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
      };

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
      };

      (AuthService as any).activeSessions.set(sessionId, session);

      const result = AuthService.getSession(sessionId);

      expect(result).toEqual(session);
    });

    it('should get active sessions count', () => {
      // Add some sessions
      AuthService.createSession(mockUser);
      AuthService.createSession({ ...mockUser, id: 'user-456' });

      const count = AuthService.getActiveSessionsCount();

      expect(count).toBe(2);
    });

    it('should get user sessions', () => {
      const otherUserId = 'user-456';
      
      // Create sessions for different users
      jest.spyOn(mockedJwt, 'sign').mockImplementation(
        () => new Promise((resolve) => resolve('token-1')),
    )
      AuthService.createSession(mockUser);
      
      jest.spyOn(mockedJwt, 'sign').mockImplementation(
        () => new Promise((resolve) => resolve('token-2')),
    )
      AuthService.createSession({ ...mockUser, id: otherUserId });

      const userSessions = AuthService.getUserSessions(mockUser.id);

      expect(userSessions).toHaveLength(1);
      expect(userSessions[0].userId).toBe(mockUser.id);
    });
  });

  describe('checkCredentials', () => {
    it('should check credentials and return user with existing sessions', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      // Mock UserDao response
      mockedUserService.findUserByEmail.mockResolvedValue(mockUser);

      // Mock password verification
      jest.spyOn(mockedBcrypt, 'compare').mockImplementation(
        () => new Promise((resolve) => resolve(true)),
    )

      // Create existing session
      jest.spyOn(mockedJwt, 'sign').mockImplementation(
        () => new Promise((resolve) => resolve('existing-token')),
    )
      AuthService.createSession(mockUser);

      const result = await AuthService.checkCredentials(email, password);

      expect(result).toEqual({
        user: mockUser,
        existingSessions: expect.arrayContaining([
          expect.objectContaining({
            userId: mockUser.id,
          }),
        ]),
      });
    });

    it('should return null for invalid credentials', async () => {
      mockedUserService.findUserByEmail.mockResolvedValue(null);

      const result = await AuthService.checkCredentials('invalid@example.com', 'password');

      expect(result).toBeNull();
    });
  });
});

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserService } from './userService';
import { SelectUser } from '../db/schema';

const JWT_SECRET = process.env.JWT_SECRET;

// Define a type for user response without password
type UserResponse = Omit<SelectUser, 'password'>;

// Session management
interface UserSession {
  userId: string;
  sessionId: string;
  token: string;
  createdAt: Date;
  lastActivity: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class AuthService {

  private static activeSessions: Map<string, UserSession> = new Map();
  
  // WebSocket service reference for session invalidation
  private static webSocketService: any = null;
  
  /**
   * Set WebSocket service reference for session invalidation
   */
  static setWebSocketService(wsService: any) {
    this.webSocketService = wsService;
  }
  
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token for a user with session management
   */
  static generateToken(user: SelectUser, sessionId?: string): string {
    const sessionIdentifier = sessionId || `session_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payload = {
      userId: user.id,
      email: user.email,
      sessionId: sessionIdentifier,
      iat: Math.floor(Date.now() / 1000),
    };
    
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  }

  /**
   * Check if user has existing sessions
   */
  static hasExistingSessions(userId: string): UserSession[] {
    const existingSessions: UserSession[] = [];
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        existingSessions.push(session);
      }
    }
    
    return existingSessions;
  }

  /**
   * Create a new session and invalidate existing ones (single session enforcement)
   */
  static createSession(user: SelectUser, userAgent?: string, ipAddress?: string): { token: string; sessionId: string } {
    // Generate unique session ID with timestamp and random component
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const sessionId = `session_${user.id}_${timestamp}_${randomId}`;
    
    // Invalidate all existing sessions for this user (excluding the new session being created)
    this.invalidateUserSessions(user.id, sessionId);
    
    // Generate new token
    const token = this.generateToken(user, sessionId);
    
    // Create session record
    const session: UserSession = {
      userId: user.id,
      sessionId,
      token,
      createdAt: new Date(),
      lastActivity: new Date(),
      userAgent,
      ipAddress
    };
    
    // Store session
    this.activeSessions.set(sessionId, session);
    
    console.log(`Created new session ${sessionId} for user ${user.id}, invalidated previous sessions`);
    
    return { token, sessionId };
  }

  /**
   * Invalidate all sessions for a user
   */
  static invalidateUserSessions(userId: string, exceptSessionId?: string): string[] {
    const invalidatedSessions: string[] = [];
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId && sessionId !== exceptSessionId) {
        this.activeSessions.delete(sessionId);
        invalidatedSessions.push(sessionId);
        
        // Close WebSocket connection if service is available
        if (this.webSocketService) {
          this.webSocketService.closeSession(sessionId, 'Session invalidated by new login', true);
        }
      }
    }
    
    console.log(`Invalidated ${invalidatedSessions.length} sessions for user ${userId}`);
    return invalidatedSessions;
  }

  /**
   * Check if a session is valid
   */
  static isSessionValid(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    // Update last activity
    session.lastActivity = new Date();
    return true;
  }

  /**
   * Get session info
   */
  static getSession(sessionId: string): UserSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions for a user
   */
  static getUserSessions(userId: string): UserSession[] {
    return Array.from(this.activeSessions.values()).filter(session => session.userId === userId);
  }

  /**
   * Verify and decode a JWT token with session validation
   */
  static verifyToken(token: string): any {
    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as any;
      
      // Check if session is still valid (if sessionId exists in token)
      if (decoded.sessionId && !this.isSessionValid(decoded.sessionId)) {
        throw new Error('Session has been invalidated');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Find user by email
   */
  static async findUserByEmail(email: string): Promise<SelectUser | null> {
    try {
      return await UserService.findUserByEmail(email);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error('Database error');
    }
  }

  /**
   * Find user by ID
   */
  static async findUserById(id: string): Promise<SelectUser | null> {
    try {
      return await UserService.findUserById(id);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error('Database error');
    }
  }

  /**
   * Check user credentials without creating session (for existing session check)
   */
  static async checkCredentials(
    email: string, 
    password: string
  ): Promise<{ user: SelectUser; existingSessions: UserSession[] } | null> {
    try {
      // Find user by email
      const user = await this.findUserByEmail(email);
      if (!user) {
        return null;
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      // Check for existing sessions
      const existingSessions = this.hasExistingSessions(user.id);

      return {
        user,
        existingSessions,
      };
    } catch (error) {
      console.error('Error checking credentials:', error);
      throw new Error('Credential check failed');
    }
  }

  /**
   * Authenticate user with email and password (with single-session enforcement)
   */
  static async authenticateUser(
    email: string, 
    password: string, 
    userAgent?: string, 
    ipAddress?: string
  ): Promise<{ user: UserResponse; token: string; sessionId: string } | null> {
    try {
      // Find user by email
      const user = await this.findUserByEmail(email);
      if (!user) {
        return null;
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      // Create new session (this will invalidate existing sessions)
      const { token, sessionId } = this.createSession(user, userAgent, ipAddress);

      return {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        token,
        sessionId,
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Logout user by invalidating their session
   */
  static logout(sessionId: string, skipWebSocketClose: boolean = false): boolean {
    const session = this.activeSessions.get(sessionId);
    const deleted = this.activeSessions.delete(sessionId);
    
    if (deleted && session) {
      console.log(`User ${session.userId} logged out from session ${sessionId}`);
      
      // Close WebSocket connection if service is available (avoid circular calls)
      if (!skipWebSocketClose && this.webSocketService) {
        this.webSocketService.closeSession(sessionId, 'User logged out', true);
      }
    }
    
    return deleted;
  }

  /**
   * Get all active sessions count
   */
  static getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }
} 
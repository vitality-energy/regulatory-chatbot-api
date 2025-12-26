import jwt from 'jsonwebtoken';
import { UserService } from './userService';
import { SelectUser } from '../db/external_schema';

const JWT_SECRET = process.env.JWT_SECRET;

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
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): any {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }

    try {
      return jwt.verify(token, JWT_SECRET) as any;
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
   * Get all active sessions count
   */
  static getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }
}
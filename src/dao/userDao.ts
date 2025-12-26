import { eq } from 'drizzle-orm';
import { db } from '../db/config';
import { users, SelectUser } from '../db/external_schema';
import { logger } from '../utils/logger';

export class UserDao {
  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<SelectUser | null> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find user by ID:', error);
      throw new Error('Database error');
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<SelectUser | null> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to find user by email:', error);
      throw new Error('Database error');
    }
  }

  /**
   * Check if user exists by email
   */
  static async existsByEmail(email: string): Promise<boolean> {
    try {
      const result = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      return result.length > 0;
    } catch (error) {
      logger.error('Failed to check user existence by email:', error);
      return false;
    }
  }
}


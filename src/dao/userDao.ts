import { eq } from 'drizzle-orm';
import { db } from '../db/config';
import { users, SelectUser, InsertUser } from '../db/schema';
import { logger } from '../utils/logger';

export type CreateUser = Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUser = Partial<Omit<InsertUser, 'id' | 'createdAt'>>;

export class UserDao {
  /**
   * Create a new user
   */
  static async create(data: CreateUser): Promise<SelectUser | null> {
    try {
      const [result] = await db.insert(users).values(data).returning();
      logger.info(`User created: ${result.email}`);
      return result;
    } catch (error) {
      logger.error('Failed to create user:', error);
      return null;
    }
  }

  /**
   * Update a user
   */
  static async update(id: string, data: UpdateUser): Promise<SelectUser | null> {
    try {
      const [result] = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      logger.info(`User updated: ${id}`);
      return result;
    } catch (error) {
      logger.error('Failed to update user:', error);
      return null;
    }
  }

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
   * Delete a user
   */
  static async deleteById(id: string): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      logger.info(`User deleted: ${id}`);
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      logger.error('Failed to delete user:', error);
      return false;
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


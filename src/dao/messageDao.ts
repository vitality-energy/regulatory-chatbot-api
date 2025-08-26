import { eq, desc } from 'drizzle-orm';
import { db } from '../db/config';
import { messages, CreateMessage, UpdateMessage, SelectMessage } from '../db/schema';
import { logger } from '../utils/logger';

export class MessageDao {
  /**
   * Create a new message
   */
  static async create(data: CreateMessage): Promise<SelectMessage | null> {
    try {
      const [result] = await db.insert(messages).values(data).returning();
      logger.info(`Message saved: ${data.messageId} (${data.type})`);
      return result;
    } catch (error) {
      logger.error('Failed to create message:', error);
      return null;
    }
  }

  /**
   * Update a message
   */
  static async update(id: string, data: UpdateMessage): Promise<SelectMessage | null> {
    try {
      const [result] = await db
        .update(messages)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(messages.id, id))
        .returning();

      logger.info(`Message updated: ${id}`);
      return result;
    } catch (error) {
      logger.error('Failed to update message:', error);
      return null;
    }
  }

  /**
   * Update message by messageId
   */
  static async updateByMessageId(messageId: string, data: UpdateMessage): Promise<SelectMessage | null> {
    try {
      const [result] = await db
        .update(messages)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(messages.messageId, messageId))
        .returning();

      logger.info(`Message updated by messageId: ${messageId}`);
      return result;
    } catch (error) {
      logger.error('Failed to update message by messageId:', error);
      return null;
    }
  }

  /**
   * Find message by ID
   */
  static async findById(id: string): Promise<SelectMessage | null> {
    try {
      const result = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get message by ID:', error);
      return null;
    }
  }

  /**
   * Find message by messageId
   */
  static async findByMessageId(messageId: string): Promise<SelectMessage | null> {
    try {
      const result = await db
        .select()
        .from(messages)
        .where(eq(messages.messageId, messageId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get message by messageId:', error);
      return null;
    }
  }

  /**
   * Find messages by session ID
   */
  static async findBySessionId(sessionId: string, limit: number = 50): Promise<SelectMessage[]> {
    try {
      const result = await db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      return result;
    } catch (error) {
      logger.error('Failed to get messages by session ID:', error);
      return [];
    }
  }

  /**
   * Find messages by user ID
   */
  static async findByUserId(userId: string, limit: number = 50): Promise<SelectMessage[]> {
    try {
      const result = await db
        .select()
        .from(messages)
        .where(eq(messages.userId, userId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

      return result;
    } catch (error) {
      logger.error('Failed to get messages by user ID:', error);
      return [];
    }
  }

  /**
   * Get recent messages with pagination
   */
  static async findRecent(limit: number = 50, offset: number = 0): Promise<SelectMessage[]> {
    try {
      const result = await db
        .select()
        .from(messages)
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset);

      return result;
    } catch (error) {
      logger.error('Failed to get recent messages:', error);
      return [];
    }
  }

  /**
   * Delete message by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    try {
      const result = await db
        .delete(messages)
        .where(eq(messages.id, id));

      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error('Failed to delete message:', error);
      return false;
    }
  }
} 
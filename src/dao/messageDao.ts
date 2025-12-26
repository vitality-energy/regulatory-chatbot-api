import { eq, desc } from 'drizzle-orm';
import { db } from '../db/config';
import { messages, CreateMessage, UpdateMessage, SelectMessage } from '../db/schema';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

export class MessageDao {
  /**
   * Create a new message
   */
  static async create(data: CreateMessage): Promise<SelectMessage | null> {
    try {
      const id = randomUUID();
      const newMessage = {
        ...data,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(messages).values(newMessage);
      logger.info(`Message saved: ${data.messageId} (${data.type})`);
      return newMessage as SelectMessage;
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
      const updatedAt = new Date();
      await db
        .update(messages)
        .set({ ...data, updatedAt })
        .where(eq(messages.id, id));

      const updatedMessage = await this.findById(id);
      logger.info(`Message updated: ${id}`);
      return updatedMessage;
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
      const updatedAt = new Date();
      await db
        .update(messages)
        .set({ ...data, updatedAt })
        .where(eq(messages.messageId, messageId));

      const updatedMessage = await this.findByMessageId(messageId);
      logger.info(`Message updated by messageId: ${messageId}`);
      return updatedMessage;
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
      return await db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
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
      return await db
        .select()
        .from(messages)
        .where(eq(messages.userId, userId))
        .orderBy(desc(messages.createdAt))
        .limit(limit);
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
      return await db
        .select()
        .from(messages)
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset);
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
      const [result] = await db
        .delete(messages)
        .where(eq(messages.id, id)) as any;

      return (result.affectedRows || 0) > 0;
    } catch (error) {
      logger.error('Failed to delete message:', error);
      return false;
    }
  }
} 
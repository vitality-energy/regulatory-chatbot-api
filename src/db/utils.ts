import { eq, desc, count, and, gte, lte } from 'drizzle-orm';
import { db } from './config';
import { apiCalls, CreateApiCall, UpdateApiCall, SelectApiCall, messages, CreateMessage, UpdateMessage, SelectMessage } from './schema';
import { logger } from '../utils/logger';

export class ApiCallService {
  /**
   * Log an API call to the database
   */
  static async logApiCall(data: CreateApiCall): Promise<SelectApiCall | null> {
    try {
      const [result] = await db.insert(apiCalls).values(data).returning();
      logger.info(`API call logged: ${data.endpoint} - ${data.statusCode}`);
      return result;
    } catch (error) {
      logger.error('Failed to log API call:', error);
      return null;
    }
  }

  /**
   * Update an existing API call record
   */
  static async updateApiCall(id: string, data: UpdateApiCall): Promise<SelectApiCall | null> {
    try {
      const [result] = await db
        .update(apiCalls)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(apiCalls.id, id))
        .returning();
      
      logger.info(`API call updated: ${id}`);
      return result;
    } catch (error) {
      logger.error('Failed to update API call:', error);
      return null;
    }
  }

  /**
   * Get API call by ID
   */
  static async getApiCall(id: string): Promise<SelectApiCall | null> {
    try {
      const result = await db
        .select()
        .from(apiCalls)
        .where(eq(apiCalls.id, id))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get API call:', error);
      return null;
    }
  }



  /**
   * Clean up old API call records
   */
  static async cleanupOldRecords(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await db
        .delete(apiCalls)
        .where(lte(apiCalls.timestamp, cutoffDate));

      logger.info(`Cleaned up ${result.rowCount} old API call records`);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup old API call records:', error);
      return 0;
    }
  }
}

export class MessageService {
  /**
   * Create a user message
   */
  static async createUserMessage(
    messageId: string,
    content: string,
    sessionId?: string,
    userId?: string
  ): Promise<SelectMessage | null> {
    try {
      const messageData: CreateMessage = {
        messageId,
        type: 'user',
        content,
        sessionId,
        userId,
      };

      const [result] = await db.insert(messages).values(messageData).returning();
      logger.info(`User message saved: ${messageId}`);
      return result;
    } catch (error) {
      logger.error('Failed to save user message:', error);
      return null;
    }
  }

  /**
   * Create a bot message
   */
  static async createBotMessage(
    messageId: string,
    content: string,
    metadata?: any,
    sessionId?: string,
    userId?: string
  ): Promise<SelectMessage | null> {
    try {
      const messageData: CreateMessage = {
        messageId,
        type: 'bot',
        content,
        metadata,
        sessionId,
        userId,
      };

      const [result] = await db.insert(messages).values(messageData).returning();
      logger.info(`Bot message saved: ${messageId}`);
      return result;
    } catch (error) {
      logger.error('Failed to save bot message:', error);
      return null;
    }
  }

  /**
   * Update bot message with research results
   */
  static async updateBotMessageWithResearch(
    messageId: string,
    researchResults: any
  ): Promise<SelectMessage | null> {
    try {
      const [result] = await db
        .update(messages)
        .set({ 
          researchResults,
          updatedAt: new Date() 
        })
        .where(eq(messages.messageId, messageId))
        .returning();

      logger.info(`Bot message updated with research: ${messageId}`);
      return result;
    } catch (error) {
      logger.error('Failed to update bot message with research:', error);
      return null;
    }
  }

  /**
   * Get message by message ID
   */
  static async getMessageByMessageId(messageId: string): Promise<SelectMessage | null> {
    try {
      const result = await db
        .select()
        .from(messages)
        .where(eq(messages.messageId, messageId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get message by message ID:', error);
      return null;
    }
  }

  /**
   * Get messages by session ID
   */
  static async getMessagesBySessionId(sessionId: string, limit: number = 50): Promise<SelectMessage[]> {
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
   * Get recent messages with pagination
   */
  static async getRecentMessages(
    limit: number = 50,
    offset: number = 0
  ): Promise<SelectMessage[]> {
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
}

/**
 * Middleware helper to extract request information
 */
export const extractRequestInfo = (req: any) => {
  return {
    userAgent: req.get('User-Agent') || undefined,
    ipAddress: req.ip || req.connection.remoteAddress || undefined,
    sessionId: req.session?.id || undefined,
    userId: req.user?.id || undefined,
  };
};

/**
 * Calculate request/response sizes
 */
export const calculatePayloadSize = (payload: any): number => {
  if (!payload) return 0;
  return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}; 
import { MessageDao } from '../dao';
import { CreateMessage, UpdateMessage, SelectMessage } from '../db/schema';
import { logger } from '../utils/logger';

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

      return await MessageDao.create(messageData);
    } catch (error) {
      logger.error('Service error creating user message:', error);
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

      return await MessageDao.create(messageData);
    } catch (error) {
      logger.error('Service error creating bot message:', error);
      return null;
    }
  }

//   /**
//    * Update bot message with research results
//    */
//   static async updateBotMessageWithResearch(
//     messageId: string,
//     researchResults: any
//   ): Promise<SelectMessage | null> {
//     try {
//       return await MessageDao.updateByMessageId(messageId, { researchResults });
//     } catch (error) {
//       logger.error('Service error updating bot message with research:', error);
//       return null;
//     }
//   }

  /**
   * Get message by message ID
   */
  static async getMessageByMessageId(messageId: string): Promise<SelectMessage | null> {
    try {
      return await MessageDao.findByMessageId(messageId);
    } catch (error) {
      logger.error('Service error getting message by messageId:', error);
      return null;
    }
  }

  /**
   * Get messages by session ID
   */
  static async getMessagesBySessionId(sessionId: string, limit: number = 50): Promise<SelectMessage[]> {
    try {
      return await MessageDao.findBySessionId(sessionId, limit);
    } catch (error) {
      logger.error('Service error getting messages by sessionId:', error);
      return [];
    }
  }

  /**
   * Get messages by user ID
   */
  static async getMessagesByUserId(userId: string, limit: number = 50): Promise<SelectMessage[]> {
    try {
      return await MessageDao.findByUserId(userId, limit);
    } catch (error) {
      logger.error('Service error getting messages by userId:', error);
      return [];
    }
  }

  /**
   * Get recent messages with pagination
   */
  static async getRecentMessages(limit: number = 50, offset: number = 0): Promise<SelectMessage[]> {
    try {
      return await MessageDao.findRecent(limit, offset);
    } catch (error) {
      logger.error('Service error getting recent messages:', error);
      return [];
    }
  }

  /**
   * Delete message by ID
   */
  static async deleteMessage(id: string): Promise<boolean> {
    try {
      return await MessageDao.deleteById(id);
    } catch (error) {
      logger.error('Service error deleting message:', error);
      return false;
    }
  }
} 
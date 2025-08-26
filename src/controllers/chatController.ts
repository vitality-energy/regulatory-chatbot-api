import { Request, Response } from 'express';
import { ChatService, ChatRequest } from '../services';
import { getResearchResult, cleanupResearchResult } from '../utils/researchHelper';
import { extractRequestInfo } from '../utils/helpers';
import { logger } from '../utils/logger';

export class ChatController {
  /**
   * Handle chat message requests
   */
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const requestInfo = extractRequestInfo(req);
      const chatRequest: ChatRequest = req.body;

      const response = await ChatService.processChatRequest(
        chatRequest,
        requestInfo.userId,
        requestInfo.sessionId
      );

      res.json(response);
    } catch (error) {
      logger.error('Error in chat controller:', error);
      
      let statusCode = 500;
      let errorMessage = 'An error occurred while processing your request.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Determine status code based on error message
        if (error.message.includes('Rate limit')) {
          statusCode = 429;
        } else if (error.message.includes('API configuration')) {
          statusCode = 500;
        }
      }
      
      res.status(statusCode).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * Get research status for a message
   */
  static async getResearchStatus(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const result = getResearchResult(messageId);
      
      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Research result not found',
        });
        return;
      }
      
      res.json({
        success: true,
        result: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching research result:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred while fetching research result.',
      });
    }
  }

  /**
   * Get combined message result (original response + research)
   */
  static async getMessageResult(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const result = getResearchResult(messageId);
      
      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Message result not found',
        });
        return;
      }
      
      // If research is completed, return combined result
      if (result.status === 'completed') {
        // Clean up after retrieving
        cleanupResearchResult(messageId);
        
        res.json({
          success: true,
          response: {
            research_results: result.research_results,
            citations: result.citations,
          },
          status: 'completed',
          timestamp: new Date().toISOString(),
        });
        return;
      }
      
      // Return current status
      res.json({
        success: true,
        status: result.status,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error fetching message result:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred while fetching message result.',
      });
    }
  }

  /**
   * Get message history for a session
   */
  static async getSessionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await ChatService.getMessageHistory(sessionId, limit);
      
      res.json({
        success: true,
        messages,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting session history:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred while fetching session history.',
      });
    }
  }

  /**
   * Get user message history
   */
  static async getUserHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await ChatService.getUserMessageHistory(userId, limit);
      
      res.json({
        success: true,
        messages,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting user history:', error);
      res.status(500).json({
        success: false,
        error: 'An error occurred while fetching user history.',
      });
    }
  }

  /**
   * Health check for chat service
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'OK',
      service: 'chat',
      timestamp: new Date().toISOString(),
    });
  }
} 
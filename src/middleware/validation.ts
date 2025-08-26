import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const validateChatRequest = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages } = req.body;
    
    // Check if messages exist
    if (!messages) {
      return res.status(400).json({
        success: false,
        error: 'Messages are required',
      });
    }
    
    // Check if messages is an array
    if (!Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages must be an array',
      });
    }
    
    // Check if array is not empty
    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages array cannot be empty',
      });
    }
    
    // Check if array is not too long
    if (messages.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Too many messages. Maximum 50 messages allowed.',
      });
    }
    
    // Validate each message
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      // Check if message has required fields
      if (!message.role || !message.content) {
        return res.status(400).json({
          success: false,
          error: `Message at index ${i} must have 'role' and 'content' fields`,
        });
      }
      
      // Check if role is valid
      if (!['user', 'assistant', 'system'].includes(message.role)) {
        return res.status(400).json({
          success: false,
          error: `Message at index ${i} has invalid role. Must be 'user', 'assistant', or 'system'`,
        });
      }
      
      // Check if content is a string
      if (typeof message.content !== 'string') {
        return res.status(400).json({
          success: false,
          error: `Message at index ${i} content must be a string`,
        });
      }
      
      // Check content length
      if (message.content.length > 10000) {
        return res.status(400).json({
          success: false,
          error: `Message at index ${i} content is too long. Maximum 10,000 characters allowed.`,
        });
      }
      
      // Check if content is not empty
      if (message.content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: `Message at index ${i} content cannot be empty`,
        });
      }
    }
    
    logger.info(`Validated chat request with ${messages.length} messages`);
    return next();
    
  } catch (error) {
    logger.error('Error in validation middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during validation',
    });
  }
}; 
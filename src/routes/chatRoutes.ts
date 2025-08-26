import express from 'express';
import { ChatController } from '../controllers';
import { validateChatRequest } from '../middleware/validation';

const router = express.Router();

// Chat endpoints
router.post('/', validateChatRequest, ChatController.sendMessage);
router.get('/research/:messageId', ChatController.getResearchStatus);
router.get('/message/:messageId', ChatController.getMessageResult);
router.get('/session/:sessionId/history', ChatController.getSessionHistory);
router.get('/user/:userId/history', ChatController.getUserHistory);
router.get('/health', ChatController.healthCheck);

export default router; 
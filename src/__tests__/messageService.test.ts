import { MessageService } from '../services/messageService';
import { MessageDao } from '../dao';
import { logger } from '../utils/logger';

// Mock dependencies
jest.mock('../dao');
jest.mock('../utils/logger');

const mockedMessageDao = MessageDao as jest.Mocked<typeof MessageDao>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('MessageService', () => {
  const mockMessage = {
    id: 'msg-123',
    messageId: 'msg_123456789_abc123',
    type: 'user' as const,
    content: 'Hello, how can I help you?',
    metadata: null,
    sessionId: 'session-123',
    researchResults: null,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserMessage', () => {
    it('should create a user message successfully', async () => {
      const messageId = 'msg_123456789_abc123';
      const content = 'Hello, world!';
      const sessionId = 'session-123';
      const userId = 'user-123';

      mockedMessageDao.create.mockResolvedValue(mockMessage);

      const result = await MessageService.createUserMessage(
        messageId,
        content,
        sessionId,
        userId
      );

      expect(mockedMessageDao.create).toHaveBeenCalledWith({
        messageId,
        type: 'user',
        content,
        sessionId,
        userId,
      });
      expect(result).toEqual(mockMessage);
    });

    it('should handle errors and return null', async () => {
      const messageId = 'msg_123456789_abc123';
      const content = 'Hello, world!';
      const error = new Error('Database error');

      mockedMessageDao.create.mockRejectedValue(error);

      const result = await MessageService.createUserMessage(messageId, content);

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error creating user message:', error);
      expect(result).toBeNull();
    });

    it('should create user message with minimal parameters', async () => {
      const messageId = 'msg_123456789_abc123';
      const content = 'Hello, world!';

      mockedMessageDao.create.mockResolvedValue(mockMessage);

      const result = await MessageService.createUserMessage(messageId, content);

      expect(mockedMessageDao.create).toHaveBeenCalledWith({
        messageId,
        type: 'user',
        content,
        sessionId: undefined,
        userId: undefined,
      });
      expect(result).toEqual(mockMessage);
    });
  });

  describe('createBotMessage', () => {
    it('should create a bot message successfully', async () => {
      const messageId = 'msg_123456789_abc123';
      const content = 'I can help you with that!';
      const metadata = { confidence: 0.95, sources: ['source1'] };
      const sessionId = 'session-123';
      const userId = 'user-123';

      const botMessage = { ...mockMessage, type: 'bot' as const, content, metadata };
      mockedMessageDao.create.mockResolvedValue(botMessage);

      const result = await MessageService.createBotMessage(
        messageId,
        content,
        metadata,
        sessionId,
        userId
      );

      expect(mockedMessageDao.create).toHaveBeenCalledWith({
        messageId,
        type: 'bot',
        content,
        metadata,
        sessionId,
        userId,
      });
      expect(result).toEqual(botMessage);
    });

    it('should handle errors and return null', async () => {
      const messageId = 'msg_123456789_abc123';
      const content = 'I can help you with that!';
      const error = new Error('Database error');

      mockedMessageDao.create.mockRejectedValue(error);

      const result = await MessageService.createBotMessage(messageId, content);

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error creating bot message:', error);
      expect(result).toBeNull();
    });

    it('should create bot message with minimal parameters', async () => {
      const messageId = 'msg_123456789_abc123';
      const content = 'I can help you with that!';

      const botMessage = { ...mockMessage, type: 'bot' as const, content };
      mockedMessageDao.create.mockResolvedValue(botMessage);

      const result = await MessageService.createBotMessage(messageId, content);

      expect(mockedMessageDao.create).toHaveBeenCalledWith({
        messageId,
        type: 'bot',
        content,
        metadata: undefined,
        sessionId: undefined,
        userId: undefined,
      });
      expect(result).toEqual(botMessage);
    });
  });

  describe('getMessageByMessageId', () => {
    it('should get message by message ID successfully', async () => {
      const messageId = 'msg_123456789_abc123';

      mockedMessageDao.findByMessageId.mockResolvedValue(mockMessage);

      const result = await MessageService.getMessageByMessageId(messageId);

      expect(mockedMessageDao.findByMessageId).toHaveBeenCalledWith(messageId);
      expect(result).toEqual(mockMessage);
    });

    it('should return null when message not found', async () => {
      const messageId = 'non-existent-msg';

      mockedMessageDao.findByMessageId.mockResolvedValue(null);

      const result = await MessageService.getMessageByMessageId(messageId);

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      const messageId = 'msg_123456789_abc123';
      const error = new Error('Database error');

      mockedMessageDao.findByMessageId.mockRejectedValue(error);

      const result = await MessageService.getMessageByMessageId(messageId);

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error getting message by messageId:', error);
      expect(result).toBeNull();
    });
  });

  describe('getMessagesBySessionId', () => {
    it('should get messages by session ID with default limit', async () => {
      const sessionId = 'session-123';
      const messages = [mockMessage, { ...mockMessage, id: 'msg-124' }];

      mockedMessageDao.findBySessionId.mockResolvedValue(messages);

      const result = await MessageService.getMessagesBySessionId(sessionId);

      expect(mockedMessageDao.findBySessionId).toHaveBeenCalledWith(sessionId, 50);
      expect(result).toEqual(messages);
    });

    it('should get messages by session ID with custom limit', async () => {
      const sessionId = 'session-123';
      const limit = 100;
      const messages = [mockMessage];

      mockedMessageDao.findBySessionId.mockResolvedValue(messages);

      const result = await MessageService.getMessagesBySessionId(sessionId, limit);

      expect(mockedMessageDao.findBySessionId).toHaveBeenCalledWith(sessionId, limit);
      expect(result).toEqual(messages);
    });

    it('should handle errors and return empty array', async () => {
      const sessionId = 'session-123';
      const error = new Error('Database error');

      mockedMessageDao.findBySessionId.mockRejectedValue(error);

      const result = await MessageService.getMessagesBySessionId(sessionId);

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error getting messages by sessionId:', error);
      expect(result).toEqual([]);
    });
  });

  describe('getMessagesByUserId', () => {
    it('should get messages by user ID with default limit', async () => {
      const userId = 'user-123';
      const messages = [mockMessage, { ...mockMessage, id: 'msg-124' }];

      mockedMessageDao.findByUserId.mockResolvedValue(messages);

      const result = await MessageService.getMessagesByUserId(userId);

      expect(mockedMessageDao.findByUserId).toHaveBeenCalledWith(userId, 50);
      expect(result).toEqual(messages);
    });

    it('should get messages by user ID with custom limit', async () => {
      const userId = 'user-123';
      const limit = 25;
      const messages = [mockMessage];

      mockedMessageDao.findByUserId.mockResolvedValue(messages);

      const result = await MessageService.getMessagesByUserId(userId, limit);

      expect(mockedMessageDao.findByUserId).toHaveBeenCalledWith(userId, limit);
      expect(result).toEqual(messages);
    });

    it('should handle errors and return empty array', async () => {
      const userId = 'user-123';
      const error = new Error('Database error');

      mockedMessageDao.findByUserId.mockRejectedValue(error);

      const result = await MessageService.getMessagesByUserId(userId);

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error getting messages by userId:', error);
      expect(result).toEqual([]);
    });
  });

  describe('getRecentMessages', () => {
    it('should get recent messages with default pagination', async () => {
      const messages = [mockMessage, { ...mockMessage, id: 'msg-124' }];

      mockedMessageDao.findRecent.mockResolvedValue(messages);

      const result = await MessageService.getRecentMessages();

      expect(mockedMessageDao.findRecent).toHaveBeenCalledWith(50, 0);
      expect(result).toEqual(messages);
    });

    it('should get recent messages with custom pagination', async () => {
      const limit = 25;
      const offset = 10;
      const messages = [mockMessage];

      mockedMessageDao.findRecent.mockResolvedValue(messages);

      const result = await MessageService.getRecentMessages(limit, offset);

      expect(mockedMessageDao.findRecent).toHaveBeenCalledWith(limit, offset);
      expect(result).toEqual(messages);
    });

    it('should handle errors and return empty array', async () => {
      const error = new Error('Database error');

      mockedMessageDao.findRecent.mockRejectedValue(error);

      const result = await MessageService.getRecentMessages();

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error getting recent messages:', error);
      expect(result).toEqual([]);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      const messageId = 'msg-123';

      mockedMessageDao.deleteById.mockResolvedValue(true);

      const result = await MessageService.deleteMessage(messageId);

      expect(mockedMessageDao.deleteById).toHaveBeenCalledWith(messageId);
      expect(result).toBe(true);
    });

    it('should return false when deletion fails', async () => {
      const messageId = 'msg-123';

      mockedMessageDao.deleteById.mockResolvedValue(false);

      const result = await MessageService.deleteMessage(messageId);

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      const messageId = 'msg-123';
      const error = new Error('Database error');

      mockedMessageDao.deleteById.mockRejectedValue(error);

      const result = await MessageService.deleteMessage(messageId);

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error deleting message:', error);
      expect(result).toBe(false);
    });
  });
});





import { ApiCallService } from '../services/apiCallService';
import { ApiCallDao } from '../dao';
import { logger } from '../utils/logger';

// Mock dependencies
jest.mock('../dao');
jest.mock('../utils/logger');

const mockedApiCallDao = ApiCallDao as jest.Mocked<typeof ApiCallDao>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('ApiCallService', () => {
  const mockApiCall = {
    id: 'api-call-123',
    endpoint: '/api/chat',
    method: 'POST',
    userAgent: 'Mozilla/5.0',
    ipAddress: '192.168.1.1',
    requestPayload: { message: 'Hello' },
    responsePayload: { response: 'Hi there!' },
    requestSize: 1024,
    responseSize: 2048,
    duration: 150,
    timestamp: new Date(),
    statusCode: 200,
    success: true,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateApiCallData = {
    endpoint: '/api/chat',
    method: 'POST',
    userAgent: 'Mozilla/5.0',
    ipAddress: '192.168.1.1',
    requestPayload: { message: 'Hello' },
    responsePayload: { response: 'Hi there!' },
    requestSize: 1024,
    responseSize: 2048,
    duration: 150,
    statusCode: 200,
    success: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logApiCall', () => {
    it('should log API call successfully', async () => {
      mockedApiCallDao.create.mockResolvedValue(mockApiCall);

      const result = await ApiCallService.logApiCall(mockCreateApiCallData);

      expect(mockedApiCallDao.create).toHaveBeenCalledWith(mockCreateApiCallData);
      expect(result).toEqual(mockApiCall);
    });

    it('should handle errors and return null', async () => {
      const error = new Error('Database error');
      mockedApiCallDao.create.mockRejectedValue(error);

      const result = await ApiCallService.logApiCall(mockCreateApiCallData);

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error logging API call:', error);
      expect(result).toBeNull();
    });

    it('should log failed API call', async () => {
      const failedApiCallData = {
        ...mockCreateApiCallData,
        statusCode: 500,
        success: false,
        errorMessage: 'Internal server error',
      };

      const failedApiCall = { ...mockApiCall, ...failedApiCallData };
      mockedApiCallDao.create.mockResolvedValue(failedApiCall);

      const result = await ApiCallService.logApiCall(failedApiCallData);

      expect(result).toEqual(failedApiCall);
    });
  });

  describe('updateApiCall', () => {
    it('should update API call successfully', async () => {
      const id = 'api-call-123';
      const updateData = {
        responsePayload: { response: 'Updated response' },
        duration: 200,
        statusCode: 200,
        success: true,
      };

      const updatedApiCall = { ...mockApiCall, ...updateData };
      mockedApiCallDao.update.mockResolvedValue(updatedApiCall);

      const result = await ApiCallService.updateApiCall(id, updateData);

      expect(mockedApiCallDao.update).toHaveBeenCalledWith(id, updateData);
      expect(result).toEqual(updatedApiCall);
    });

    it('should handle errors and return null', async () => {
      const id = 'api-call-123';
      const updateData = { duration: 200 };
      const error = new Error('Database error');

      mockedApiCallDao.update.mockRejectedValue(error);

      const result = await ApiCallService.updateApiCall(id, updateData);

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error updating API call:', error);
      expect(result).toBeNull();
    });
  });

  describe('getApiCall', () => {
    it('should get API call by ID successfully', async () => {
      const id = 'api-call-123';

      mockedApiCallDao.findById.mockResolvedValue(mockApiCall);

      const result = await ApiCallService.getApiCall(id);

      expect(mockedApiCallDao.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockApiCall);
    });

    it('should return null when API call not found', async () => {
      const id = 'non-existent-id';

      mockedApiCallDao.findById.mockResolvedValue(null);

      const result = await ApiCallService.getApiCall(id);

      expect(result).toBeNull();
    });

    it('should handle errors and return null', async () => {
      const id = 'api-call-123';
      const error = new Error('Database error');

      mockedApiCallDao.findById.mockRejectedValue(error);

      const result = await ApiCallService.getApiCall(id);

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error getting API call:', error);
      expect(result).toBeNull();
    });
  });

  describe('getRecentApiCalls', () => {
    it('should get recent API calls with default pagination', async () => {
      const apiCalls = [mockApiCall, { ...mockApiCall, id: 'api-call-124' }];

      mockedApiCallDao.findRecent.mockResolvedValue(apiCalls);

      const result = await ApiCallService.getRecentApiCalls();

      expect(mockedApiCallDao.findRecent).toHaveBeenCalledWith(50, 0);
      expect(result).toEqual(apiCalls);
    });

    it('should get recent API calls with custom pagination', async () => {
      const limit = 25;
      const offset = 10;
      const apiCalls = [mockApiCall];

      mockedApiCallDao.findRecent.mockResolvedValue(apiCalls);

      const result = await ApiCallService.getRecentApiCalls(limit, offset);

      expect(mockedApiCallDao.findRecent).toHaveBeenCalledWith(limit, offset);
      expect(result).toEqual(apiCalls);
    });

    it('should handle errors and return empty array', async () => {
      const error = new Error('Database error');

      mockedApiCallDao.findRecent.mockRejectedValue(error);

      const result = await ApiCallService.getRecentApiCalls();

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error getting recent API calls:', error);
      expect(result).toEqual([]);
    });
  });

  describe('getApiCallStats', () => {
    it('should get API call statistics successfully', async () => {
      const stats = {
        totalCalls: 100,
        successfulCalls: 95,
        failedCalls: 5,
        averageDuration: 150,
      };

      mockedApiCallDao.getStats.mockResolvedValue(stats);

      const result = await ApiCallService.getApiCallStats();

      expect(mockedApiCallDao.getStats).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(stats);
    });

    it('should get API call statistics with date range', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');
      const stats = {
        totalCalls: 50,
        successfulCalls: 48,
        failedCalls: 2,
        averageDuration: 120,
      };

      mockedApiCallDao.getStats.mockResolvedValue(stats);

      const result = await ApiCallService.getApiCallStats(startDate, endDate);

      expect(mockedApiCallDao.getStats).toHaveBeenCalledWith(startDate, endDate);
      expect(result).toEqual(stats);
    });

    it('should handle errors and return default stats', async () => {
      const error = new Error('Database error');

      mockedApiCallDao.getStats.mockRejectedValue(error);

      const result = await ApiCallService.getApiCallStats();

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error getting API call stats:', error);
      expect(result).toEqual({
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
      });
    });
  });

  describe('cleanupOldRecords', () => {
    it('should cleanup old records with default days', async () => {
      const deletedCount = 25;

      mockedApiCallDao.deleteOlder.mockResolvedValue(deletedCount);

      const result = await ApiCallService.cleanupOldRecords();

      expect(mockedApiCallDao.deleteOlder).toHaveBeenCalledWith(30);
      expect(result).toBe(deletedCount);
    });

    it('should cleanup old records with custom days', async () => {
      const olderThanDays = 60;
      const deletedCount = 50;

      mockedApiCallDao.deleteOlder.mockResolvedValue(deletedCount);

      const result = await ApiCallService.cleanupOldRecords(olderThanDays);

      expect(mockedApiCallDao.deleteOlder).toHaveBeenCalledWith(olderThanDays);
      expect(result).toBe(deletedCount);
    });

    it('should handle errors and return 0', async () => {
      const error = new Error('Database error');

      mockedApiCallDao.deleteOlder.mockRejectedValue(error);

      const result = await ApiCallService.cleanupOldRecords();

      expect(mockedLogger.error).toHaveBeenCalledWith('Service error cleaning up API calls:', error);
      expect(result).toBe(0);
    });

    it('should return 0 when no records are deleted', async () => {
      mockedApiCallDao.deleteOlder.mockResolvedValue(0);

      const result = await ApiCallService.cleanupOldRecords();

      expect(result).toBe(0);
    });
  });
});

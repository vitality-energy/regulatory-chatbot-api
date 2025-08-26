import { ApiCallDao } from '../dao';
import { CreateApiCall, UpdateApiCall, SelectApiCall } from '../db/schema';
import { logger } from '../utils/logger';

export class ApiCallService {
  /**
   * Log a new API call
   */
  static async logApiCall(data: CreateApiCall): Promise<SelectApiCall | null> {
    try {
      return await ApiCallDao.create(data);
    } catch (error) {
      logger.error('Service error logging API call:', error);
      return null;
    }
  }

  /**
   * Update an existing API call
   */
  static async updateApiCall(id: string, data: UpdateApiCall): Promise<SelectApiCall | null> {
    try {
      return await ApiCallDao.update(id, data);
    } catch (error) {
      logger.error('Service error updating API call:', error);
      return null;
    }
  }

  /**
   * Get API call by ID
   */
  static async getApiCall(id: string): Promise<SelectApiCall | null> {
    try {
      return await ApiCallDao.findById(id);
    } catch (error) {
      logger.error('Service error getting API call:', error);
      return null;
    }
  }

  /**
   * Get recent API calls with pagination
   */
  static async getRecentApiCalls(limit: number = 50, offset: number = 0): Promise<SelectApiCall[]> {
    try {
      return await ApiCallDao.findRecent(limit, offset);
    } catch (error) {
      logger.error('Service error getting recent API calls:', error);
      return [];
    }
  }

  /**
   * Get API call statistics
   */
  static async getApiCallStats(startDate?: Date, endDate?: Date) {
    try {
      return await ApiCallDao.getStats(startDate, endDate);
    } catch (error) {
      logger.error('Service error getting API call stats:', error);
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
      };
    }
  }

  /**
   * Clean up old API call records
   */
  static async cleanupOldRecords(olderThanDays: number = 30): Promise<number> {
    try {
      return await ApiCallDao.deleteOlder(olderThanDays);
    } catch (error) {
      logger.error('Service error cleaning up API calls:', error);
      return 0;
    }
  }
} 
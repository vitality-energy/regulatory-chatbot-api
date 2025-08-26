import { eq, desc, count, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/config';
import { apiCalls, CreateApiCall, UpdateApiCall, SelectApiCall } from '../db/schema';
import { logger } from '../utils/logger';

export class ApiCallDao {
  /**
   * Create a new API call record
   */
  static async create(data: CreateApiCall): Promise<SelectApiCall | null> {
    try {
      const [result] = await db.insert(apiCalls).values(data).returning();
      logger.info(`API call logged: ${data.endpoint} - ${data.statusCode}`);
      return result;
    } catch (error) {
      logger.error('Failed to create API call record:', error);
      return null;
    }
  }

  /**
   * Update an existing API call record
   */
  static async update(id: string, data: UpdateApiCall): Promise<SelectApiCall | null> {
    try {
      const [result] = await db
        .update(apiCalls)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(apiCalls.id, id))
        .returning();
      
      logger.info(`API call updated: ${id}`);
      return result;
    } catch (error) {
      logger.error('Failed to update API call record:', error);
      return null;
    }
  }

  /**
   * Get API call by ID
   */
  static async findById(id: string): Promise<SelectApiCall | null> {
    try {
      const result = await db
        .select()
        .from(apiCalls)
        .where(eq(apiCalls.id, id))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      logger.error('Failed to get API call by ID:', error);
      return null;
    }
  }

  /**
   * Get recent API calls with pagination
   */
  static async findRecent(limit: number = 50, offset: number = 0): Promise<SelectApiCall[]> {
    try {
      const result = await db
        .select()
        .from(apiCalls)
        .orderBy(desc(apiCalls.timestamp))
        .limit(limit)
        .offset(offset);
      
      return result;
    } catch (error) {
      logger.error('Failed to get recent API calls:', error);
      return [];
    }
  }

  /**
   * Get API call statistics
   */
  static async getStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageDuration: number;
  }> {
    try {
      const conditions: any[] = [];
      
      if (startDate) {
        conditions.push(gte(apiCalls.timestamp, startDate));
      }
      
      if (endDate) {
        conditions.push(lte(apiCalls.timestamp, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total calls
      const [totalResult] = await db
        .select({ count: count() })
        .from(apiCalls)
        .where(whereClause);

      // Get successful calls
      const [successResult] = await db
        .select({ count: count() })
        .from(apiCalls)
        .where(
          whereClause 
            ? and(whereClause, eq(apiCalls.success, true))
            : eq(apiCalls.success, true)
        );

      // Get failed calls
      const [failedResult] = await db
        .select({ count: count() })
        .from(apiCalls)
        .where(
          whereClause 
            ? and(whereClause, eq(apiCalls.success, false))
            : eq(apiCalls.success, false)
        );

      return {
        totalCalls: totalResult.count,
        successfulCalls: successResult.count,
        failedCalls: failedResult.count,
        averageDuration: 0, // Can be calculated from aggregated data if needed
      };
    } catch (error) {
      logger.error('Failed to get API call statistics:', error);
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
      };
    }
  }

  /**
   * Delete old API call records
   */
  static async deleteOlder(olderThanDays: number = 30): Promise<number> {
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
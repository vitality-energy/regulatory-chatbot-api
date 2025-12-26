import { mysqlTable, varchar, text, int, json, boolean, datetime } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// API calls table to track all API interactions
export const apiCalls = mysqlTable('api_calls', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().default(sql`(UUID())`),
  
  // Request information
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  
  // Request/Response data
  requestPayload: json('request_payload'),
  responsePayload: json('response_payload'),
  requestSize: int('request_size'),
  responseSize: int('response_size'),
  
  // Timing and performance
  duration: int('duration'), // in milliseconds
  timestamp: datetime('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull(),
  
  // Status and error tracking
  statusCode: int('status_code').notNull(),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  
  // Metadata
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

// Messages table to store user and bot messages
export const messages = mysqlTable('messages', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().default(sql`(UUID())`),
  
  // Message identification
  messageId: varchar('message_id', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(), // 'user' or 'bot'
  
  // Message content
  content: text('content').notNull(),
  metadata: json('metadata').default({}), // For bot: confidence_score, citations, original_response
  researchResults: json('research_results').default({}), // For storing async research results
  
  // User context
  sessionId: varchar('session_id', { length: 255 }).default(''),
  userId: varchar('user_id', { length: 255 }).default(''),
  
  // Metadata
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

export type SelectApiCall = typeof apiCalls.$inferSelect;
export type InsertApiCall = typeof apiCalls.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// Utility types for API operations
export type CreateApiCall = Omit<InsertApiCall, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateApiCall = Partial<Omit<InsertApiCall, 'id' | 'createdAt'>>;
export type CreateMessage = Omit<InsertMessage, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMessage = Partial<Omit<InsertMessage, 'id' | 'createdAt'>>;
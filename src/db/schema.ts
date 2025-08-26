import { pgTable, uuid, varchar, text, timestamp, integer, decimal, jsonb, boolean } from 'drizzle-orm/pg-core';

// Users table for authentication
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(), // Will store bcrypt hashed password
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// API calls table to track all API interactions
export const apiCalls = pgTable('api_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Request information
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  userAgent: varchar('user_agent', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  
  // Request/Response data
  requestPayload: jsonb('request_payload'),
  responsePayload: jsonb('response_payload'),
  requestSize: integer('request_size'),
  responseSize: integer('response_size'),
  
  // Timing and performance
  duration: integer('duration'), // in milliseconds
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  
  // Status and error tracking
  statusCode: integer('status_code').notNull(),
  success: boolean('success').notNull(),
  errorMessage: text('error_message'),
  

  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Messages table to store user and bot messages
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Message identification
  messageId: varchar('message_id', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull(), // 'user' or 'bot'
  
  // Message content
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}), // For bot: confidence_score, citations, original_response
  researchResults: jsonb('research_results').default({}), // For storing async research results
  
  // User context
  sessionId: varchar('session_id', { length: 255 }).default(''),
  userId: varchar('user_id', { length: 255 }).default(''),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports using Drizzle's built-in types
export type SelectApiCall = typeof apiCalls.$inferSelect;
export type InsertApiCall = typeof apiCalls.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Utility types for API operations
export type CreateApiCall = Omit<InsertApiCall, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateApiCall = Partial<Omit<InsertApiCall, 'id' | 'createdAt'>>;
export type CreateMessage = Omit<InsertMessage, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMessage = Partial<Omit<InsertMessage, 'id' | 'createdAt'>>;
// export type CreateUser = Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>;
// export type UpdateUser = Partial<Omit<InsertUser, 'id' | 'createdAt'>>; 
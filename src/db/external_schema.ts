import { mysqlTable, varchar, datetime } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// Users table (managed externally by Rails app)
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().notNull().default(sql`(UUID())`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('encrypted_password', { length: 255 }).notNull(),
  createdAt: datetime('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: datetime('updated_at').default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull(),
});

export type SelectUser = typeof users.$inferSelect;

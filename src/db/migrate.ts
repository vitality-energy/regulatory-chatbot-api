import { config } from 'dotenv';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

// Load environment variables
config();

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const migrationClient = postgres(databaseUrl, { max: 1, ssl: 'require' });
const db = drizzle(migrationClient);

import { logger } from '../utils/logger';

export async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    await migrate(db, {
      migrationsFolder: './src/db/migrations',
    });
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(async () => {
      logger.info('Migration script completed');
      await migrationClient.end();
      process.exit(0);
    })
    .catch(async (error) => {
      logger.error('Migration script failed:', error);
      await migrationClient.end();
      process.exit(1);
    });
}
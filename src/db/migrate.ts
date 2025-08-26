import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './config';
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
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
} 
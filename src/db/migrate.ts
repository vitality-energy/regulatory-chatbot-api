import { config } from 'dotenv';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { logger } from '../utils/logger';

// Load environment variables
config();

const databaseUrl = process.env['DATABASE_URL'] || '';
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

export async function runMigrations() {
  const migrationConnection = await mysql.createConnection(databaseUrl);
  const db = drizzle(migrationConnection);

  try {
    logger.info('Starting database migrations...');
    
    await migrate(db, {
      migrationsFolder: './src/db/migrations',
    });
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  } finally {
    await migrationConnection.end();
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
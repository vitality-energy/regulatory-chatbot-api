import postgres from 'postgres';
import { config } from 'dotenv';

config();

async function createDb() {
  const databaseUrl = process.env['DATABASE_URL']?.replace('/vitality_chat', '/postgres');
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { ssl: 'require' });

  try {
    console.log('Checking if database "vitality_chat" exists...');
    const dbs = await sql`SELECT datname FROM pg_database WHERE datname = 'vitality_chat';`;
    
    if (dbs.length === 0) {
      console.log('Creating database "vitality_chat"...');
      await sql`CREATE DATABASE vitality_chat;`;
      console.log('Database "vitality_chat" created successfully.');
    } else {
      console.log('Database "vitality_chat" already exists.');
    }

  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await sql.end();
  }
}

createDb();

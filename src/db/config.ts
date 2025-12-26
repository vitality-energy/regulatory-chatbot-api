import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "./schema";

if (!process.env['DATABASE_URL']) {
  throw new Error(
    "DATABASE_URL must be set. Environment variable not found.",
  );
}

export const pool = mysql.createPool(process.env['DATABASE_URL']);

export const db = drizzle(pool, { schema, mode: 'default' });
import { drizzle } from 'drizzle-orm/sqlite3';
import { Database } from 'sqlite3';
import * as schema from '../shared/schema';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

// Initialize SQLite database
const sqlite = new Database('sqlite.db');

// Create the database instance with schema
export const db = drizzle(sqlite);

// Export schema for use in other parts of the application
export { schema };

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}; 
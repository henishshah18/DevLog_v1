import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Configure WebSocket for Neon's serverless driver
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the database instance with schema
export const db = drizzle(pool, { schema });

// Export schema for use in other parts of the application
export { schema };

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'your-secret-key',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mydb',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}; 
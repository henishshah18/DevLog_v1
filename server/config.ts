import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema';
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Configure WebSocket for Neon's serverless driver
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the database instance with schema
export const db = drizzle(pool, { schema });

// Export schema for use in other parts of the application
export { schema }; 
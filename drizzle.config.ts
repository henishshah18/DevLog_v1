import type { Config } from 'drizzle-kit';

export default {
  schema: './shared/schema.ts',
  out: './drizzle',
  driver: 'sqlite',
  dbCredentials: {
    url: 'sqlite.db'
  },
} satisfies Config;

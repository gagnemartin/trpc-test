import { type Config } from "drizzle-kit";

export default {
  schema: './src/database/schema.ts',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.POSTGRES_URL as string
  },
  tablesFilter: ['trpc-next_*']
} satisfies Config

import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import * as schema from './schema'
import dotenv from 'dotenv'

dotenv.config()

const client = new Client({
  connectionString: process.env.POSTGRES_URL
})

;(async () => {
  await client.connect()
})()
const db = drizzle(client, { schema })

export default db

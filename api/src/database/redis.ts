import { createClient } from 'redis'
import dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  url: process.env.REDIS_URL
})
const subscriber = client.duplicate()
const publisher = client.duplicate()

;(async () => {
  await Promise.all([
    client.connect(),
    subscriber.connect(),
    publisher.connect()
  ])
})()

client.on('error', (err) => console.log('Redis Client Error', err))

export {client, subscriber, publisher }

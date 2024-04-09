import {  createTRPCRouter } from './trpc'
import usersRouter from './routers/users'
import profilesRouter from './routers/profiles'
import conversationsRouter from './routers/conversations'

export const appRouter = createTRPCRouter({
  users: usersRouter,
  profiles: profilesRouter,
  conversations: conversationsRouter
})

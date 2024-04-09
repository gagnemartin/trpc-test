// import * as trpc from '@trpc/server'
import { z } from 'zod'
import { authedProcedure, createTRPCRouter, publicProcedure } from '../trpc'
import { profiles, users } from '../database/schema'
import { TRPCError } from '@trpc/server'

const usersRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        firebaseUid: z.string().min(1),
        email: z.string().min(1).toLowerCase()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            firebaseUid: input.firebaseUid,
            email: input.email
          })
          .returning({ id: users.id, firebaseUid: users.firebaseUid, email: users.email })

        if (user) {
          await tx.insert(profiles).values({
            userId: user.id
          })
        }

        return { firebaseUid: user.firebaseUid, email: user.email }
      })

      return user
    }),

  getByFirebaseUid: publicProcedure
    .input(
      z.object({
        firebaseUid: z.string().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.firebaseUid == undefined) {
        throw new TRPCError({ code: 'BAD_REQUEST' })
      }

      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.firebaseUid, input.firebaseUid as string),
        with: {
          profile: true
        }
      })

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return user
    }),

  getLastActiveAt: authedProcedure
    .input(
      z.object({
        userIds: z.array(z.string())
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const lastActiveAt = await Promise.all(
          input.userIds.map(async (id) => {
            return ctx.redis.client.get(`user:${id}:lastActiveAt`).then((lastActiveAt) => {
              console.log(lastActiveAt)
              return { [id]: lastActiveAt ? new Date(Number(lastActiveAt)) : null }
            })
          })
        )
  
        console.log({lastActiveAt})
  
        return lastActiveAt
      } catch (e) {
        console.error(e)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }
    })
})

export default usersRouter
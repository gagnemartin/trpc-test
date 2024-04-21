// import * as trpc from '@trpc/server'
import { z } from 'zod'
import { authedProcedure, createTRPCRouter, publicProcedure } from '../trpc'
import { profiles, users } from '../database/schema'
import { TRPCError } from '@trpc/server'
import { verifyToken } from '../firebase'
import { observable } from '@trpc/server/observable'

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
      try {
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
      } catch (e) {
        console.error(e)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }
    }),

  getLastActiveAt: authedProcedure
    .input(
      z.object({
        userIds: z.array(z.string())
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const lastActiveAtArray = await Promise.all(
          input.userIds.map(async (id) => {
            return ctx.redis.client.get(`user:${id}:lastActiveAt`).then((lastActiveAt) => {
              return { [id]: lastActiveAt ? new Date(Number(lastActiveAt)) : null }
            })
          })
        )

        const lastActiveAt: { [key: string]: Date | null } = Object.assign({}, ...lastActiveAtArray)

        return lastActiveAt
      } catch (e) {
        console.error(e)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }
    }),

  onLastActiveAtUpdate: publicProcedure
    .input(
      z.object({
        token: z.string(),
        userIds: z.array(z.string())
      })
    )
    .subscription(async ({ ctx, input }) => {
      console.log({ input: input.userIds })
      try {
        const decodedToken = await verifyToken(input.token)

        if (!decodedToken) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }

        return observable<{ [x: string]: Date }>((emit) => {
          const onLastActiveUpdate = (message: string) => {
            const { userId, lastActiveAt } = JSON.parse(message)
            console.log({ userId, lastActiveAt, userIds: input.userIds })

            if (input.userIds.includes(userId)) {
              emit.next({ [userId]: new Date(lastActiveAt) })
            }
          }

          ctx.redis.subscriber.subscribe(`user:onLastActiveAtUpdate`, onLastActiveUpdate)
          return () => {
            ctx.redis.subscriber.unsubscribe(`user:onLastActiveAtUpdate`, onLastActiveUpdate)
          }
        })

        // const lastActiveAtArray = await Promise.all(
        //   input.userIds.map(async (id) => {
        //     return ctx.redis.client.get(`user:${id}:lastActiveAt`).then((lastActiveAt) => {
        //       return { [id]: lastActiveAt ? new Date(Number(lastActiveAt)) : null }
        //     })
        //   })
        // )

        // const lastActiveAt: { [key: string]: Date | null } = Object.assign({}, ...lastActiveAtArray)

        // return lastActiveAt
      } catch (e) {
        console.error(e)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }
    })
})

export default usersRouter
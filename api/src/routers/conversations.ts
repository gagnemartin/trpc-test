import { TRPCError } from "@trpc/server"
import { authedProcedure, createTRPCRouter, publicProcedure } from "../trpc"
import { z } from "zod"
import { Conversation, Message, MessageFormatted, Profile, ReadReceipt, conversations, messages, profiles, readReceipts, userConversations, users } from "../database/schema"
import { and, countDistinct, desc, eq, gte, inArray, ne } from "drizzle-orm"
import { observable } from "@trpc/server/observable"
import { verifyToken } from "../firebase"
import { alias } from "drizzle-orm/pg-core"
import { publisher } from "../database/redis"

interface BaseUpdateConversation {
  action: string
}

interface OnNewMessage {
  message: MessageFormatted,
  conversation: {
    id: string
  }
}

interface NewMessageUpdate extends BaseUpdateConversation {
  action: 'new_message'
  payload: OnNewMessage
}

interface ReadMessageUpdate extends BaseUpdateConversation {
  action: 'read_message'
  payload: ReadReceipt[]
}

type OnUpdateConversation = NewMessageUpdate | ReadMessageUpdate

type UserTyping = {
  isTyping: boolean
  lastTyped: string
  profile: Profile
}

export type UsersTyping = Record<string, UserTyping>

// // who is currently typing, key is `name`
// const currentlyTyping: Record<string, { lastTyped: Date, profile: Profile }> =
//   Object.create(null);

// // every 3s, clear old "isTyping"
// const interval = setInterval(() => {
//   let updated = false;
//   const now = Date.now();
//   for (const [key, value] of Object.entries(currentlyTyping)) {
//     if (now - value.lastTyped.getTime() > 3e3) {
//       delete currentlyTyping[key];
//       updated = true;
//     }
//   }
//   if (updated) {
//     publisher.publish('isTypingUpdate', JSON.stringify(Object.keys(currentlyTyping)));
//   }
// }, 3e3);
// process.on('SIGTERM', () => {
//   clearInterval(interval);
// });

const conversationsRouter = createTRPCRouter({
  isTyping: authedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        isTyping: z.boolean()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const usersTypingString = await ctx.redis.client.get(`conversation:${input.conversationId}:typing`)
      const userTyping: UserTyping = {
        isTyping: input.isTyping,
        profile: ctx.user.profile,
        lastTyped: new Date().toISOString()
      }
      let usersTyping: UsersTyping = {
        [ctx.user.id]: userTyping
      }

      if (usersTypingString) {
        usersTyping = JSON.parse(usersTypingString)

        if (input.isTyping) {
          usersTyping[ctx.user.id] = userTyping
        } else {
          delete usersTyping[ctx.user.id]
        }
      }

      await ctx.redis.client.set(`conversation:${input.conversationId}:typing`, JSON.stringify(usersTyping), { EX: 60 * 60 * 12 })
      ctx.redis.publisher.publish(`conversation:${input.conversationId}:typing`, 'update')
    }),

  whoIsTyping: publicProcedure
    .input(
      z.object({
        token: z.string(),
        conversationId: z.string().optional()
      })
    )
    .subscription(async ({ input, ctx }) => {
      try {
        const decodedToken = await verifyToken(input.token)

        if (!decodedToken) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }
        // stringified json of who is currently typing, key is the user id
        let prev: string | null = null

        // every 3s, clear old "isTyping"
        const interval = setInterval(async () => {
          const usersTypingString = await ctx.redis.client.get(`conversation:${input.conversationId}:typing`)
          const now = Date.now()
          let updated = false

          if (usersTypingString) {
            const usersTyping: UsersTyping = JSON.parse(usersTypingString)

            for (const [key, value] of Object.entries(usersTyping)) {
              if (now - new Date(value.lastTyped).getTime() > 3e3) {
                delete usersTyping[key]
                updated = true
              }
            }

            if (updated) {
              await ctx.redis.client.set(`conversation:${input.conversationId}:typing`, JSON.stringify(usersTyping), { EX: 60 * 60 * 12 })
              publisher.publish(`conversation:${input.conversationId}:typing`, 'update')
            }
          }
        }, 3e3)
        process.on('SIGTERM', () => {
          clearInterval(interval)
        })

        return observable<UsersTyping | null>((emit) => {
          const onIsTypingUpdate = async () => {
            const usersTypingString = await ctx.redis.client.get(`conversation:${input.conversationId}:typing`)
            let usersTyping = usersTypingString ? JSON.parse(usersTypingString) : null
            const usersId = Object.keys(usersTyping)
            const usersIdString = JSON.stringify(usersId)

            if (usersId.length === 0) {
              usersTyping = null
            }

            if (!prev || prev !== usersIdString) {
              emit.next(usersTyping)
            }

            prev = usersTyping ? usersIdString : null
          }

          ctx.redis.subscriber.subscribe(`conversation:${input.conversationId}:typing`, onIsTypingUpdate)
          return () => {
            ctx.redis.subscriber.unsubscribe(`conversation:${input.conversationId}:typing`, onIsTypingUpdate)
            clearInterval(interval)
          }
        })
      } catch (e) {
        console.error(e)
      }
    }),

  list: authedProcedure.query(async ({ ctx }) => {
    try {
      const lastMessage = ctx.db
        .selectDistinctOn([messages.conversationId], {
          id: messages.id,
          content: messages.content,
          conversationId: messages.conversationId,
          createdAt: messages.createdAt,
          sentBy: messages.sentBy,
          isSeen: readReceipts.isSeen,
          seenAt: readReceipts.seenAt
        })
        .from(messages)
        .innerJoin(userConversations, eq(userConversations.conversationId, messages.conversationId))
        .leftJoin(readReceipts, and(eq(readReceipts.messageId, messages.id), eq(readReceipts.userId, ctx.user.id)))
        .where(eq(userConversations.conversationId, messages.conversationId))
        .orderBy(messages.conversationId, desc(messages.createdAt))
        .as('lastMessage')
      const conversationsList = await ctx.db
        .select({
          id: conversations.id,
          lastMessage: {
            id: lastMessage.id,
            content: lastMessage.content,
            conversationId: lastMessage.conversationId,
            createdAt: lastMessage.createdAt,
            sentBy: lastMessage.sentBy,
            isSeen: lastMessage.isSeen,
            seenAt: lastMessage.seenAt
          }
        })
        .from(lastMessage)
        .innerJoin(conversations, eq(lastMessage.conversationId, conversations.id))
        .innerJoin(userConversations, and(eq(userConversations.conversationId, conversations.id)))
        .where(and(eq(userConversations.userId, ctx.user.id), eq(userConversations.visible, true)))
        .orderBy(desc(lastMessage.createdAt))
      const conversationsWithParticipants = await Promise.all(
        conversationsList.map(async (conversation) => {
          const query = ctx.db
            .select({ id: profiles.userId, displayName: profiles.displayName })
            .from(profiles)
            .innerJoin(userConversations, eq(userConversations.userId, profiles.userId))
            .where(and(eq(userConversations.conversationId, conversation.id), ne(userConversations.userId, ctx.user.id)))

          return {
            ...conversation,
            participants: await query
          }
        })
      )

      return conversationsWithParticipants
    } catch (e) {
      console.error(e)
    }
  }),

  onInboxUpdate: publicProcedure
    .input(
      z.object({
        token: z.string()
      })
    )
    .subscription(async ({ input, ctx }) => {
      const decodedToken = await verifyToken(input.token)

      if (!decodedToken) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const [user] = await ctx.db.select({ id: users.id }).from(users).where(eq(users.firebaseUid, decodedToken.uid)).limit(1)

      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      return observable<string>((emit) => {
        const onInboxUpdate = async () => {
          console.log('HERE')
          emit.next('update')
        }

        ctx.redis.subscriber.subscribe(`conversations:user:${user.id}`, onInboxUpdate)
        return () => {
          ctx.redis.subscriber.unsubscribe(`conversations:user:${user.id}`, onInboxUpdate)
        }
      })
    }),

  getConversation: authedProcedure
    // .meta({ table: 'users', foreignKey: 'user_id' })
    .input(
      z.object({
        id: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const [hasAccess] = await ctx.db
          .select({ id: userConversations.conversationId })
          .from(userConversations)
          .where(and(eq(userConversations.userId, ctx.user.id), eq(userConversations.conversationId, input.id)))
          .limit(1)

        if (!hasAccess) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        const readReceiptProfile = alias(profiles, 'readReceiptProfile')
        const parent = alias(messages, 'parent')
        const rows = await ctx.db
          .select({
            conversation: conversations,
            message: messages,
            parent: parent,
            profile: profiles,
            readReceipt: readReceipts,
            readReceiptProfile: readReceiptProfile
          })
          .from(conversations)
          .innerJoin(messages, eq(conversations.id, messages.conversationId))
          .innerJoin(readReceipts, eq(readReceipts.messageId, messages.id))
          .innerJoin(readReceiptProfile, eq(readReceiptProfile.userId, readReceipts.userId))
          .innerJoin(profiles, eq(profiles.userId, messages.sentBy))
          .leftJoin(parent, eq(parent.id, messages.parentId))
          .orderBy(messages.createdAt)

        const conversationRow = rows[0].conversation
        const messagesRow: MessageFormatted[] = []
        rows.forEach((item) => {
          if (!messagesRow.some((d: any) => d.id === item.message.id)) {
            messagesRow.push({
              ...item.message,
              parent: item.parent,
              profile: item.profile,
              readReceipts: rows
                .filter((d) => d.message.id === item.message.id)
                .map((d) => {
                  return {
                    ...d.readReceipt,
                    profile: d.readReceiptProfile
                  }
                })
            })
          }
        })

        const result: { id: Conversation['id']; messages: MessageFormatted[] } = {
          id: conversationRow.id,
          messages: messagesRow
        }
        // console.log(JSON.stringify(result, null, 2))

        return result
      } catch (e) {
        console.error(e)
      }
    }),

  getConversationFromProfile: authedProcedure
    // .meta({ table: 'users', foreignKey: 'user_id' })
    .input(
      z.object({
        userId: z.string()
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const [userConversation] = await ctx.db
          .select({ conversationId: userConversations.conversationId })
          .from(userConversations)
          .where(inArray(userConversations.userId, [input.userId, ctx.user.id]))
          .groupBy(userConversations.conversationId)
          .having(() => gte(countDistinct(userConversations.userId), 2))
          .limit(1)

        return userConversation?.conversationId ?? 'new'
      } catch (e) {
        console.error({ e })
      }
    }),

  addMessage: authedProcedure
    .input(
      z.object({
        conversationId: z.string().optional(),
        message: z.string(),
        userId: z.string().optional(),
        replyTo: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const conversationAndMessage = await ctx.db.transaction(async (tx) => {
          const conversation = await tx.transaction(async (tx2) => {
            if (!input.conversationId) {
              if (!input.userId) {
                throw new TRPCError({ code: 'BAD_REQUEST' })
              }
              // New conversation, try again to find it in case both
              // users write to each other for the first time at the same time
              // Or create it and add the users to it
              const userConversation = await tx2
                .select({ conversationId: userConversations.conversationId, userId: userConversations.userId })
                .from(userConversations)
                .where(inArray(userConversations.userId, [input.userId, ctx.user.id]))
                .groupBy(userConversations.conversationId, userConversations.userId)
                .having(() => gte(countDistinct(userConversations.userId), 2))
                .limit(1)

              if (userConversation.length > 0) {
                return { id: userConversation[0].conversationId, usersId: userConversation.map((uc) => uc.userId), parent: null }
              }

              const [conversation] = await tx2.insert(conversations).values({}).returning({ id: conversations.id })

              await tx2.insert(userConversations).values([
                { userId: ctx.user.id, conversationId: conversation.id },
                { userId: input.userId, conversationId: conversation.id }
              ])

              return { id: conversation.id, usersId: [ctx.user.id, input.userId], parent: null }
            } else {
              // Existing conversation, just select it to make sure the user is part of it
              let parent: Message | null = null
              const [userConversation] = await tx2
                .select({ id: userConversations.conversationId })
                .from(userConversations)
                .where(and(eq(userConversations.userId, ctx.user.id), eq(userConversations.conversationId, input.conversationId)))
                .limit(1)

              if (!userConversation) {
                throw new TRPCError({ code: 'NOT_FOUND' })
              }

              if (input.replyTo) {
                const [parentMessage] = await tx2
                  .select()
                  .from(messages)
                  .where(and(eq(messages.id, input.replyTo), eq(messages.conversationId, input.conversationId)))
                  .limit(1)

                if (!parentMessage) {
                  throw new TRPCError({ code: 'BAD_REQUEST' })
                }

                parent = parentMessage
              }

              const conversation = await tx2
                .select()
                .from(userConversations)
                .where(eq(userConversations.conversationId, input.conversationId))

              return { id: userConversation.id, usersId: conversation.map((c) => c.userId), parent }
            }
          })

          const [message] = await tx
            .insert(messages)
            .values({
              conversationId: conversation.id,
              content: input.message,
              sentBy: ctx.user.id,
              ...(input.replyTo && { parentId: input.replyTo })
            })
            .returning()

          const newReadReceiptsArray = await Promise.all(
            conversation.usersId
              .filter((userId) => userId !== ctx.user.id)
              .map((userId) => {
                // if (userId !== ctx.user.id) {
                return tx
                  .insert(readReceipts)
                  .values({
                    messageId: message.id,
                    userId
                  })
                  .returning()
                // }
              })
          )
          const newReadReceipts = newReadReceiptsArray.filter(Boolean).map((d) => d[0])

          const readReceiptsProfiles = await tx.select().from(profiles).where(inArray(profiles.userId, conversation.usersId))
          const newReadReceiptsWithProfile = newReadReceipts
            .map((readReceipt, i) => {
              return { ...readReceipt, profile: readReceiptsProfiles[i] }
            })
            .filter(Boolean)
          // return {
          //   id: conversation.id,
          //   messages: [
          //     {
          //       ...message,
          //       profile: ctx.user.profile,
          //       readReceipts
          //     }
          //   ]
          // }

          return {
            conversation,
            message: {
              ...message,
              parent: conversation.parent,
              profile: ctx.user.profile,
              readReceipts: newReadReceiptsWithProfile
            }
          }
        })

        if (!conversationAndMessage.message || !conversationAndMessage.conversation) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        const publishData: NewMessageUpdate = {
          action: 'new_message',
          payload: conversationAndMessage
        }

        const usersInConversation = await ctx.db
          .select({ userId: userConversations.userId })
          .from(userConversations)
          .where(
            and(eq(userConversations.conversationId, conversationAndMessage.conversation.id), ne(userConversations.userId, ctx.user.id))
          )

        ctx.redis.publisher.publish(`conversation:${input.conversationId}`, JSON.stringify(publishData))

        usersInConversation.forEach((user) => {
          ctx.redis.publisher.publish(`conversations:user:${user.userId}`, 'update')
        })

        return conversationAndMessage
      } catch (e) {
        console.error(e)
      }
    }),

  onUpdate: publicProcedure
    .input(
      z.object({
        token: z.string(),
        conversationId: z.string().optional()
      })
    )
    .subscription(async ({ input, ctx }) => {
      if (input.conversationId) {
        console.log('Subscribing')
        const decodedToken = await verifyToken(input.token)

        if (!decodedToken) {
          throw new TRPCError({ code: 'UNAUTHORIZED' })
        }

        return observable<OnUpdateConversation>((emit) => {
          const emitNext = async (stringData: string) => {
            const data: OnUpdateConversation = JSON.parse(stringData)

            // if (decodedToken) {
            const [user] = await ctx.db.select({ id: users.id }).from(users).where(eq(users.firebaseUid, decodedToken.uid)).limit(1)

            if (data.action === 'new_message' && data.payload.message.sentBy !== user.id) {
              console.log('SENDING NEW MESSAGE')
              emit.next(data)
            } else if (data.action === 'read_message' && data.payload.some((message) => message.userId !== user.id)) {
              console.log('SENDING READ MESSAGE')
              emit.next(data)
            }
            // }
          }

          ctx.redis.subscriber.subscribe(`conversation:${input.conversationId}`, emitNext)

          return () => {
            console.log('unsubscribing')
            ctx.redis.subscriber.unsubscribe(`conversation:${input.conversationId}`, emitNext)
          }
        })
      } else {
        console.log('No conversationId')
      }
    }),

  readMessages: authedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        messagesId: z.array(z.string())
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const messages = await ctx.db
          .update(readReceipts)
          .set({ isSeen: true, seenAt: new Date() })
          .where(and(inArray(readReceipts.messageId, input.messagesId), eq(readReceipts.userId, ctx.user.id)))
          .returning()

        if (messages.length > 0) {
          const publishData: ReadMessageUpdate = {
            action: 'read_message',
            payload: messages
          }
          ctx.redis.publisher.publish(`conversation:${input.conversationId}`, JSON.stringify(publishData))
          ctx.redis.publisher.publish(`conversations:user:${ctx.user.id}`, 'update')
        }

        return messages
      } catch (e) {
        console.error(e)
      }
    })

  // getProfiles: authedProcedure.query(async ({ ctx }) => {
  //   const profiles = await ctx.db.query.profiles.findMany({
  //     limit: 50,
  //     where: (users, { ne }) => ne(users.id, ctx.user.id)
  //   })

  //   console.log({ profiles })
  //   return profiles
  // })
})

export default conversationsRouter
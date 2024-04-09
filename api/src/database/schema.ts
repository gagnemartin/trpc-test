// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { relations, sql } from 'drizzle-orm'
import { AnyPgColumn, boolean, index, pgTableCreator, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `trpc-next_${name}`)

export const users = createTable(
  'users',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    firebaseUid: varchar('firebase_uid').unique().notNull(),
    email: varchar('email').unique().notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at'),
    lastLoginAt: timestamp('last_login_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull()
  },
  (table) => ({
    firebaseUidIndex: index('firebase_uid_idx').on(table.firebaseUid)
  })
)
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId]
  }),
  messages: many(messages),
  userConversations: many(userConversations)
}))

export const profiles = createTable('profiles', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  displayName: varchar('display_name'),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  createdAt: timestamp('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp('updated_at')
})
export type Profile = typeof profiles.$inferSelect
export type newProfile = typeof profiles.$inferInsert

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id] 
  })
}))

export const conversations = createTable('conversations', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  createdAt: timestamp('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull()
})
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
  userConversations: many(userConversations)
}))

export const userConversations = createTable(
  'user_conversations',
  {
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    conversationId: uuid('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),
    visible: boolean('visible').default(true).notNull()
  },
  (table) => ({
    userConversationUnique: unique('user_conversation_unique').on(table.userId, table.conversationId)
  })
)
export type UserConversation = typeof userConversations.$inferSelect
export type NewUserConversation = typeof userConversations.$inferInsert

export const userConversationRelations = relations(userConversations, ({ one }) => ({
  user: one(users, {
    fields: [userConversations.userId],
    references: [users.id]
  }),
  conversation: one(conversations, {
    fields: [userConversations.conversationId],
    references: [conversations.id]
  })
}))

export const messages = createTable('messages', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  content: varchar('content').notNull(),
  sentBy: uuid('sent_by')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  conversationId: uuid('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' })
    .notNull(),
  parentId: uuid('parent').references((): AnyPgColumn => messages.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp('updated_at')
})
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type MessageWithReadReceipts = Message & {
  isSeen: ReadReceipt['isSeen'],
  seenAt: ReadReceipt['seenAt']
 }
export type MessageFormatted = Message & {
  profile: Profile
  parent: Message | null
  readReceipts: (ReadReceipt & {
    profile: Profile
  })[]
}

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  }),
  user: one(users, {
    fields: [messages.sentBy],
    references: [users.id]
  }),
  parent: one(messages, {
    fields: [messages.parentId],
    references: [messages.id]
  })
}))

export const readReceipts = createTable(
  'read_receipts',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    messageId: uuid('message_id')
      .references(() => messages.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    isSeen: boolean('is_seen').default(false).notNull(),
    seenAt: timestamp('seen_at')
  },
  (table) => ({
    readReceiptUnique: unique('read_receipts_unique').on(table.userId, table.messageId)
  })
)
export type ReadReceipt = typeof readReceipts.$inferSelect
export type NewReadReceipt = typeof readReceipts.$inferInsert

export const readReceiptsRelations = relations(readReceipts, ({ one }) => ({
  message: one(messages, {
    fields: [readReceipts.messageId],
    references: [messages.id]
  }),
  user: one(users, {
    fields: [readReceipts.userId],
    references: [users.id]
  })
}))

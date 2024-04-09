import { Profile } from './user.interface'

export type UserTyping = {
  isTyping: boolean
  lastTyped: string
  profile: Profile
}
export type UsersTyping = Record<string, UserTyping> | null
export type ReadReceipt = {
  id: string
  createdAt: string
  updatedAt: string | null
  messageId: string
  userId: string
  isSeen: boolean
  profile: Profile
}
export type Message = {
  id: string
  createdAt: string
  updatedAt: string | null
  conversationId: string
  content: string
  sentBy: string
  parentId: string | null
  parent: Message | null
  profile: Profile
  readReceipts: ReadReceipt[]
}

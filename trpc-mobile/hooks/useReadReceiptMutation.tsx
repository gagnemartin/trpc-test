import { userAtom } from '@/atoms'
import { trpc } from '@/trpc'
import { useAtomValue } from 'jotai'

const useReadReceiptMutation = (conversationId: string) => {
  const utils = trpc.useUtils()
  const user = useAtomValue(userAtom)

  return trpc.conversations.readMessages.useMutation({
    async onMutate(data) {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await utils.conversations.getConversation.cancel()

      // Get the data from the queryCache
      const prevData = utils.conversations.getConversation.getData()

      // Optimistically update the data with our new post
      utils.conversations.getConversation.setData({ id: data.conversationId }, (old) => {
        if (old && user) {
          const currentDate = new Date().toISOString()

          data.messagesId.forEach((messageId) => {
            const message = old.messages.find((message) => message.id === messageId)

            if (message) {
              message.readReceipts.push({
                id: Math.random().toString(),
                messageId,
                userId: user.id,
                isSeen: true,
                seenAt: currentDate,
                profile: {
                  id: user.id,
                  createdAt: currentDate,
                  updatedAt: null,
                  displayName: '',
                  userId: user.id
                }
              })
            }
          })

          return old
        }
      })

      // Return the previous data so we can revert if something goes wrong
      return { prevData }
    },
    onError(err, _newPost, ctx) {
      console.log(err, 'set previous before readMessages failed')
      utils.conversations.getConversation.setData({ id: conversationId }, ctx?.prevData)
    },
    onSettled() {
      utils.conversations.getConversation.invalidate({ id: conversationId })
    }
  })
}

export default useReadReceiptMutation

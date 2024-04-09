import { NativeSyntheticEvent, TextInputKeyPressEventData, View } from 'react-native'
import { Button, TextInput } from 'react-native-paper'
import styles from './styles'
import { Dispatch, MutableRefObject, SetStateAction, useState } from 'react'
import { Message } from '@/interfaces/conversation.interface'
import { Swipeable } from 'react-native-gesture-handler'
import { trpc } from '@/trpc'
import { useAtomValue } from 'jotai'
import { userAtom } from '@/atoms'
import { router } from 'expo-router'

interface MessageInputProps {
  conversationId: string
  userId: string
  replyTo: Message | null
  setReplyTo: Dispatch<SetStateAction<Message | null>>
  swipeableRefs: MutableRefObject<{ [key: string]: Swipeable | null }>
}

const MessageInput: React.FC<MessageInputProps> = ({ conversationId, userId, replyTo, setReplyTo, swipeableRefs }) => {
  const utils = trpc.useUtils()
  const user = useAtomValue(userAtom)
  const [newMessage, setNewMessage] = useState('')
  const isTyping = trpc.conversations.isTyping.useMutation()
  const addMessage = trpc.conversations.addMessage.useMutation({
    async onMutate(data) {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await utils.conversations.getConversation.cancel()

      // Get the data from the queryCache
      const prevData = utils.conversations.getConversation.getData()

      // Optimistically update the data with our new post
      utils.conversations.getConversation.setData({ id: conversationId }, (old) => {
        if (old && user) {
          const currentDate = new Date().toISOString()

          return {
            ...old,
            messages: old.messages.concat({
              id: Math.random().toString(),
              createdAt: currentDate,
              updatedAt: null,
              conversationId: data.conversationId || Math.random().toString(),
              content: data.message,
              sentBy: user.id,
              parentId: replyTo?.id ?? null,
              parent: replyTo ?? null,
              profile: {
                id: user.id,
                createdAt: currentDate,
                updatedAt: null,
                displayName: '',
                userId: user.id
              },
              readReceipts: [
                {
                  id: Math.random().toString(),
                  messageId: '',
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
                }
              ]
            })
          }
        }
      })

      // Return the previous data so we can revert if something goes wrong
      return { prevData }
    },
    onError(err, _newPost, ctx) {
      // If the mutation fails, use the context-value from onMutate

      console.log(err, 'set previous before addMessage failed')
      utils.conversations.getConversation.setData({ id: conversationId }, ctx?.prevData)
    },
    onSettled() {
      // Sync with server once mutation has settled
      utils.conversations.getConversation.invalidate({ id: conversationId })
    }
  })

  const closeSwipeables = () => {
    Object.values(swipeableRefs.current).forEach((swipeable) => {
      if (swipeable) {
        swipeable.close()
      }
    })
  }

  const handleSendMessage = () => {
    addMessage.mutate(
      {
        message: newMessage,
        replyTo: replyTo?.id,
        // if the conversation is new, send the target's userId
        ...(conversationId === 'new' && { userId }),
        // if the conversation is not new, send the conversationId
        ...(conversationId !== 'new' && { conversationId })
      },
      {
        onSuccess: (data) => {
          setNewMessage('')
          setReplyTo(null)
          closeSwipeables()
          utils.conversations.list.invalidate()
          if (data?.conversation.id && data?.conversation.id !== conversationId) {
            utils.conversations.getConversationFromProfile.invalidate({ userId })
            utils.conversations.getConversation.invalidate({ id: conversationId })
            router.setParams({ id: data.conversation.id })
          }
        }
      }
    )
  }

  const handleOnBlur = () => {
    if (conversationId !== 'new') {
      isTyping.mutate({ conversationId, isTyping: false })
    }
  }

  const handleOnKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (conversationId !== 'new' && e.nativeEvent.key !== 'Backspace') {
      isTyping.mutate({ conversationId, isTyping: true })
    }
  }

  return (
    <View style={styles.inputWrapper}>
      <TextInput
        mode='outlined'
        style={styles.input}
        value={newMessage}
        onChangeText={setNewMessage}
        onKeyPress={handleOnKeyPress}
        onBlur={handleOnBlur}
        contentStyle={{ padding: 500, flex: 1 }}
      />
      <Button onPress={handleSendMessage} disabled={newMessage.length === 0}>
        Send
      </Button>
    </View>
  )
}

export default MessageInput

import { Platform, StyleSheet, View, KeyboardAvoidingView, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native'
import { ActivityIndicator, Button, IconButton, Text, TextInput } from 'react-native-paper'
import { trpc } from '@/trpc'
import { useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { sessionAtom, userAtom } from '@/atoms'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import Swipeable from 'react-native-gesture-handler/Swipeable'
import MessagesList from '@/components/MessagesList'
import { Message, UsersTyping } from '@/interfaces/conversation.interface'
import MessageInput from '@/components/MessageInput'
import { FlashList } from '@shopify/flash-list'
import { User } from '@/interfaces/user.interface'

export default function TabOneScreen() {
  const utils = trpc.useUtils()
  const { id: conversationId, userId } = useLocalSearchParams<{ id: string; userId: string }>()
  const session = useAtomValue(sessionAtom)
  const user = useAtomValue(userAtom) as User
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const flashListRef = useRef<FlashList<any> | null>(null)
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({})
  const { data, isLoading: isLoadingConversation } = trpc.conversations.getConversation.useQuery(
    { id: conversationId },
    { enabled: conversationId !== 'new' }
  )

  const participantIds = Array.from(
    data?.messages.reduce((acc, message) => {
      if (message.sentBy !== user.id) {
        acc.add(message.sentBy)
      }
      return acc
    }, new Set<string>()) || []
  )
  const { data: lastActiveAt } = trpc.users.getLastActiveAt.useQuery(
    { userIds: participantIds },
    { enabled: participantIds.length > 0 && conversationId !== 'new' }
  )
  console.log({ lastActiveAt })

  trpc.conversations.onUpdate.useSubscription(
    {
      token: session!.token,
      ...(conversationId !== 'new' && { conversationId })
    },
    {
      onData: async (newData) => {
        await utils.conversations.getConversation.cancel()
        console.log(newData.action)

        // Optimistically update the data with our new post
        utils.conversations.getConversation.setData({ id: conversationId }, (old) => {
          if (!old) return

          if (newData.action === 'new_message') {
            const currentDate = new Date().toISOString()
            return {
              ...old,
              messages: old.messages.concat(newData.payload.message)
            }
          } else if (newData.action === 'read_message') {
            console.log('Another user read the message!')

            newData.payload.forEach((readReceipt) => {
              old.messages.forEach((message) => {
                const oldReadReceipt = message.readReceipts.find((r) => r.id === readReceipt.id)

                if (oldReadReceipt) {
                  oldReadReceipt.isSeen = readReceipt.isSeen
                  oldReadReceipt.seenAt = readReceipt.seenAt
                }
              })
            })

            return old
          }
        })
        flashListRef.current?.scrollToEnd()
      }
    }
  )

  if (isLoadingConversation || !user || !session) {
    return <ActivityIndicator animating />
  }

  // get a list of all the users from the messages in the conversation from their profile displayname
  const participants = Array.from(
    data?.messages.reduce((acc, message) => {
      if (message.sentBy !== user.id) {
        acc.add(message.profile.displayName)
      }
      return acc
    }, new Set()) || []
  ).join(', ')

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen
        options={{
          headerTitle: participants,
          headerBackTitle: 'Back'
        }}
      />
      <View style={styles.messagesWrapper}>
        {data && data.messages.length > 0 && (
          <MessagesList data={data} flashListRef={flashListRef} swipeableRefs={swipeableRefs} setReplyTo={setReplyTo} />
        )}
      </View>
      {replyTo && (
        <View style={styles.replyWrapper}>
          <View style={{ flex: 1 }}>
            <Text variant='bodySmall'>Replying to {replyTo.profile.displayName}</Text>
            <Text variant='bodyLarge'>{replyTo.content}</Text>
          </View>
          <IconButton
            icon='close'
            onPress={() => {
              setReplyTo(null)

              Object.values(swipeableRefs.current).forEach((swipeable) => {
                swipeable?.close()
              })
            }}
          />
        </View>
      )}
      <MessageInput
        conversationId={conversationId}
        userId={userId}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        swipeableRefs={swipeableRefs}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  messagesWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: '100%'
  },
  replyWrapper: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  }
})

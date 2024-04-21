import { Platform, StyleSheet, View, KeyboardAvoidingView, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native'
import { ActivityIndicator, Button, Icon, IconButton, Text, TextInput } from 'react-native-paper'
import { trpc } from '@/trpc'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useAtomValue } from 'jotai'
import { sessionAtom, userAtom } from '@/atoms'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import Swipeable from 'react-native-gesture-handler/Swipeable'
import MessagesList from '@/components/MessagesList'
import { UsersTyping } from '@/interfaces/conversation.interface'
import MessageInput from '@/components/MessageInput'
import { FlashList } from '@shopify/flash-list'
import { MessageFormatted, Profile, User } from 'express-api-starter-ts/src/database/schema'
import { getLastActiveAt } from '@/utils/utils'
import { FontAwesome } from '@expo/vector-icons'
import useLastActiveAt from '@/hooks/useLastActiveAt'

interface HeaderProps {
  participants: Profile[]
  lastActiveAt?: Record<string, Date | null>
}

interface Conversation {
  id: string
  messages: MessageFormatted[]
}

const Header = ({ participants, lastActiveAt }: HeaderProps) => {
  const [_timer, setTimer] = useState(Date.now())

  // Update the timer state every minute to force a re-render
  useEffect(() => {
    const intervalId = setInterval(() => setTimer(Date.now()), 60000) // 60000 ms = 1 minute
    return () => clearInterval(intervalId)
  }, [])

  if (participants.length === 0) {
    return (
      <Text variant='titleMedium' style={{ fontWeight: 'bold' }}>
        New conversation
      </Text>
    )
  }

  if (participants.length > 1) {
    return (
      <Text variant='titleMedium' style={{ fontWeight: 'bold' }}>
        Group Chat
      </Text>
    )
  }

  return (
    <View>
      {participants.map((participant) => {
        const userLastActiveAt = lastActiveAt ? getLastActiveAt(lastActiveAt?.[participant.userId]) : null

        return (
          <Fragment key={participant.userId}>
            <Text variant='titleMedium' style={{ fontWeight: 'bold' }}>
              {participant.displayName}
            </Text>
            {userLastActiveAt && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {userLastActiveAt === 'now' && <FontAwesome name='circle' color='green' style={{ paddingRight: 7 }} />}
                <Text variant='bodySmall'>Active {userLastActiveAt}</Text>
              </View>
            )}
          </Fragment>
        )
      })}
    </View>
  )
}

export default function TabOneScreen() {
  const utils = trpc.useUtils()
  const { id: conversationId, userId } = useLocalSearchParams<{ id: string; userId: string }>()
  const session = useAtomValue(sessionAtom)
  const user = useAtomValue(userAtom) as User
  const [replyTo, setReplyTo] = useState<MessageFormatted | null>(null)
  const flashListRef = useRef<FlashList<MessageFormatted> | null>(null)
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({})
  const { data, isLoading: isLoadingConversation } = trpc.conversations.getConversation.useQuery(
    { id: conversationId },
    { enabled: conversationId !== 'new' }
  )

  console.log({ conversationId })

  const participantIds = Array.from(
    data?.messages.reduce((acc, message) => {
      if (message.sentBy !== user.id) {
        acc.add(message.sentBy)
      }
      return acc
    }, new Set<string>()) || []
  )
  const lastActiveAt = useLastActiveAt({ participantIds, enabled: participantIds.length > 0 && conversationId !== 'new' })

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
            // const currentDate = new Date().toISOString()
            return {
              ...old,
              messages: [newData.payload.message, ...old.messages]
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
      }
    }
  )

  if (isLoadingConversation || !user || !session) {
    return <ActivityIndicator animating />
  }

  // get a list of all the users from the messages in the conversation from their profile displayname
  const participants = Array.from(
    (data?.messages
      .reduce((acc, message) => {
        if (message.sentBy !== user.id) {
          acc.set(message.profile.userId, message.profile)
        }
        return acc
      }, new Map<string, Profile>())
      .values() || []) as Profile[]
  )

  return (
    <KeyboardAvoidingView keyboardVerticalOffset={90} style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen
        options={{
          headerTitle: () => <Header participants={participants} lastActiveAt={lastActiveAt} />,
          headerBackTitle: 'Back'
        }}
      />
      <View style={styles.messagesWrapper}>
        {data && data.messages.length > 0 && (
          <MessagesList data={data} flashListRef={flashListRef} swipeableRefs={swipeableRefs} setReplyTo={setReplyTo} />
        )}
      </View>
      {/* {replyTo && (
        <View style={styles.replyWrapper}>
          <View style={{ flex: 1 }}>
            <Text variant='bodySmall'>Replying to {replyTo.profile.displayName}</Text>
            <Text variant='bodySmall'>{replyTo.content}</Text>
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
      )} */}
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
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    minWidth: '100%'
  }
  // replyWrapper: {
  //   width: '100%',
  //   paddingHorizontal: 20,
  //   // paddingVertical: 10,
  //   // paddingBottom: 0,
  //   // backgroundColor: '#f0f0f0',
  //   flexDirection: 'row',
  //   justifyContent: 'center',
  //   alignItems: 'center'
  // }
})

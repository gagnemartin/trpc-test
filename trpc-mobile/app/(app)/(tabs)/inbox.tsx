import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { trpc } from '@/trpc'
import { Link } from 'expo-router'
import { useAtom, useAtomValue } from 'jotai'
import { inboxNotificationsAtom, sessionAtom, themeAtom, userAtom } from '@/atoms'
import { useEffect, useState } from 'react'
import { FontAwesome } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { Conversation, User } from 'express-api-starter-ts/src/database/schema'
import { UsersTyping } from 'express-api-starter-ts/src/routers/conversations'

const LastMessage = ({ lastMessage, usersTyping }: { lastMessage: Record<string, any>; usersTyping?: UsersTyping }) => {
  const user = useAtomValue(userAtom) as User
  const theme = useAtomValue(themeAtom)

  // Check if someone is typing, excluding the user
  const someoneIsTyping = usersTyping && Object.keys(usersTyping).filter((key) => key !== user.id).length > 0

  return (
    <Text
      variant='bodyLarge'
      style={{
        color: lastMessage.isSeen ? theme.colors.outline : theme.colors.text,
        fontWeight: someoneIsTyping ? 'bold' : 'normal'
      }}
    >
      {someoneIsTyping ? 'Typing...' : lastMessage.content}
    </Text>
  )
}

export default function Inbox() {
  const utils = trpc.useUtils()
  const theme = useAtomValue(themeAtom)
  const session = useAtomValue(sessionAtom)
  const user = useAtomValue(userAtom) as User
  const [inboxNotifications, setInboxNotifications] = useAtom(inboxNotificationsAtom)
  const [isTyping, setIsTyping] = useState<Record<string, UsersTyping>>({})
  const { data: conversations = [] } = trpc.conversations.list.useQuery()

  trpc.conversations.onInboxUpdate.useSubscription(
    { token: session!.token },
    {
      onData: async () => {
        console.log('HERE INVALIDATE')
        utils.conversations.list.invalidate()
      }
    }
  )

  // extract all the conversations ids into an array
  const conversationIds = conversations.map((conversation) => conversation.id)

  trpc.conversations.whoIsTyping.useSubscription(
    { token: session!.token, conversationIds },
    {
      onData: async (data) => {
        if (user.email === 'martin@gmail.com') {
          console.log({ isTyping, data })
        }
        setIsTyping((prev) => ({
          ...prev,
          ...data
        }))
      }
    }
  )

  useEffect(() => {
    const numberOfunreadMessages = conversations.filter((conversation) => {
      return conversation.lastMessage.isSeen === false && conversation.lastMessage.sentBy !== user?.id
    }).length

    if (numberOfunreadMessages !== inboxNotifications) {
      setInboxNotifications(numberOfunreadMessages)
    }
  }, [conversations, inboxNotifications, user?.id])

  return (
    <View style={styles.container}>
      <Text variant='displaySmall' style={styles.title}>
        Inbox
      </Text>
      {conversations && conversations.length > 0 && (
        <View style={styles.conversationsWrapper}>
          <FlashList
            data={conversations}
            estimatedItemSize={85}
            extraData={isTyping}
            renderItem={({ item: conversation }) => (
              <Link
                asChild
                href={{
                  pathname: '/(app)/conversations/[id]',
                  params: { id: conversation.id }
                }}
              >
                <Pressable>
                  <View
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                  >
                    <View>
                      <FontAwesome name='user-circle' size={60} color={theme.colors.text} />
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text
                        variant='bodyLarge'
                        style={{
                          fontWeight: !conversation.lastMessage.isSeen && conversation.lastMessage.sentBy !== user.id ? 'bold' : 'normal'
                        }}
                      >
                        {conversation.participants
                          .map((participant) => {
                            return participant.displayName
                          })
                          .join(', ')}
                      </Text>
                      <LastMessage lastMessage={conversation.lastMessage} usersTyping={isTyping[conversation.id]} />
                    </View>
                    <View>
                      <FontAwesome name='angle-right' size={25} color={theme.colors.text} />
                    </View>
                  </View>
                </Pressable>
              </Link>
            )}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // alignItems: 'flex-start',
    // justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20
  },
  conversationsWrapper: {
    flex: 1,
    paddingVertical: 10
  },
  title: {
    // fontSize: 20,
    fontWeight: 'bold'
  }
})

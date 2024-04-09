import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { trpc } from '@/trpc'
import { Link } from 'expo-router'
import { useAtom, useAtomValue } from 'jotai'
import { inboxNotificationsAtom, sessionAtom, userAtom } from '@/atoms'
import { useEffect } from 'react'

export default function Inbox() {
  const utils = trpc.useUtils()
  const session = useAtomValue(sessionAtom)
  const user = useAtomValue(userAtom)
  const [inboxNotifications, setInboxNotifications] = useAtom(inboxNotificationsAtom)
  const { data = [] } = trpc.conversations.list.useQuery()

  trpc.conversations.onInboxUpdate.useSubscription(
    { token: session!.token },
    {
      onData: async () => {
        console.log('HERE INVALIDATE')
        utils.conversations.list.invalidate()
      }
    }
  )

  useEffect(() => {
    const numberOfunreadMessages = data.filter((conversation) => {
      return conversation.lastMessage.isSeen === false && conversation.lastMessage.sentBy !== user?.id
    }).length

    if (numberOfunreadMessages !== inboxNotifications) {
      console.log({ numberOfunreadMessages, inboxNotifications })
      setInboxNotifications(numberOfunreadMessages)
    }
  }, [data, inboxNotifications, user?.id])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversations</Text>
      <View style={styles.conversationsWrapper}>
        {data?.map((conversation) => (
          <Link
            key={conversation.id}
            href={{
              pathname: '/(app)/conversations/[id]',
              params: { id: conversation.id }
            }}
          >
            <View>
              <Text>
                {conversation.participants
                  .map((participant) => {
                    return participant.displayName
                  })
                  .join(', ')}
              </Text>
              <Text>{conversation.lastMessage.content}</Text>
            </View>
          </Link>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60
  },
  conversationsWrapper: {
    flex: 1,
    justifyContent: 'flex-start'
  },
  inputWrapper: {
    flexDirection: 'row',
    // position: 'absolute',
    bottom: 0
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%'
  }
})

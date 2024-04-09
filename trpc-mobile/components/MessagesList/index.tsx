import { sessionAtom, userAtom } from '@/atoms'
import { Message, UsersTyping } from '@/interfaces/conversation.interface'
import { trpc } from '@/trpc'
import { FlashList, ViewToken } from '@shopify/flash-list'
import { useAtomValue } from 'jotai'
import { Dispatch, Fragment, MutableRefObject, SetStateAction, useMemo, useRef, useState } from 'react'
import { Animated, View } from 'react-native'
import { Gesture, GestureDetector, Swipeable } from 'react-native-gesture-handler'
import { IconButton, Text } from 'react-native-paper'
import styles from './styles'
import { Session, User } from '@/interfaces/user.interface'
import useReadReceiptMutation from '@/hooks/useReadReceiptMutation'

interface MessagesListProps {
  data: any
  flashListRef: MutableRefObject<FlashList<any> | null>
  swipeableRefs: MutableRefObject<{ [key: string]: Swipeable | null }>
  setReplyTo: Dispatch<SetStateAction<Message | null>>
}

const renderRightActions = (progress: Animated.AnimatedInterpolation<string>) => {
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
    extrapolate: 'clamp'
  })

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <IconButton icon='reply' />
      </Animated.View>
    </View>
  )
}

const MessagesList: React.FC<MessagesListProps> = ({ data, flashListRef, swipeableRefs, setReplyTo }) => {
  const pan = Gesture.Pan().activeOffsetX([-10, 10])
  const utils = trpc.useUtils()
  const session = useAtomValue(sessionAtom) as Session
  const user = useAtomValue(userAtom) as User
  const readReceipt = useReadReceiptMutation(data.id)
  const [currentlyTyping, setCurrentlyTyping] = useState<UsersTyping>(null)

  trpc.conversations.whoIsTyping.useSubscription(
    {
      token: session.token,
      conversationId: data.id
    },
    {
      enabled: data.id !== 'new',
      onData(data) {
        console.log(data)
        setCurrentlyTyping(data as UsersTyping)
      }
    }
  )

  const numberOfUnseenMessages = useMemo(() => {
    if (!user || !data) return 0
    return data.messages.filter((message: Message) => {
      return message.readReceipts.some((readReceipt) => readReceipt.userId === user.id && !readReceipt.isSeen)
    }).length
  }, [data, user])

  const handleViewableItemsChanged = ({ changed }: Record<string, ViewToken[]>) => {
    const unseenMessages: string[] = []

    changed.forEach((item) => {
      if (item.isViewable && item.item.sentBy !== user?.id && item.item.readReceipts.some((r: any) => !r.isSeen && r.userId === user?.id)) {
        unseenMessages.push(item.item.id)
      }
    })

    console.log({ unseenMessages: unseenMessages.length })

    if (unseenMessages.length > 0) {
      readReceipt.mutate({ conversationId: data.id, messagesId: unseenMessages })
    }
  }

  const closeSwipeables = (item: Message) => {
    Object.values(swipeableRefs.current).forEach((swipeable) => {
      if (swipeable && swipeable !== swipeableRefs.current[item.id]) {
        // swipeable.close()
        swipeable.reset()
      }
    })
  }

  const handleOnSwipeableOpen = (item: Message) => {
    setReplyTo(item)
    // Close the previously opened Swipeable
    closeSwipeables(item)
  }

  const formatCurrentlyTyping = () => {
    if (!currentlyTyping) return ''
    const typingUsers = Object.values(currentlyTyping).filter((u) => {
      console.log(u.profile.userId, user.id)
      return u.isTyping && u.profile.userId !== user.id
    })

    if (typingUsers.length === 0) return ''

    if (typingUsers.length === 1) {
      return `${typingUsers[0].profile.displayName || 'Person'} is typing...`
    }

    const names = typingUsers.map((u) => u.profile.displayName)

    return `${names.slice(0, -1).join(', ')} and ${names.slice(-1)} are typing...`
  }

  return (
    <GestureDetector gesture={pan}>
      <FlashList
        ref={flashListRef}
        data={data.messages as Message[]}
        estimatedItemSize={260}
        extraData={currentlyTyping}
        // initialScrollIndex={data.messages.length - 1}
        onViewableItemsChanged={handleViewableItemsChanged}
        // keyExtractor={(item) => `${item.id}`}
        viewabilityConfig={{
          minimumViewTime: 1000
        }}
        onLoad={() => flashListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item, index }: { item: Message; index: number }) => {
          return (
            <Fragment>
              {/* {numberOfUnseenMessages >= 1 && !item.readReceipts.some((r: any) => r.isSeen) && item.sentBy !== user.id && (
                      <View style={styles.newMessageDivider}>
                        <Divider />
                        <Text style={styles.newMessageLabel}>New messages</Text>
                      </View>
                    )} */}
              {item.parent && (
                <View style={styles.repliedWrapper}>
                  <Text variant='bodySmall' style={{ paddingBottom: 5 }}>
                    Replied to
                  </Text>
                  <View style={styles.repliedBubble}>
                    <Text variant='bodyLarge'>{item.parent.content}</Text>
                  </View>
                </View>
              )}
              <Swipeable
                renderLeftActions={renderRightActions}
                friction={2}
                leftThreshold={30}
                onSwipeableOpen={() => handleOnSwipeableOpen(item)}
                onSwipeableWillClose={() => {
                  console.log('WILL CLOSE')
                  setReplyTo(null)
                }}
                ref={(ref) => (swipeableRefs.current[item.id] = ref)}
              >
                <View style={styles.bubble}>
                  <Text variant='bodyLarge'>
                    {item.sentBy === user.id ? 'You: ' : 'Them: '}
                    {item.content}
                  </Text>
                </View>
              </Swipeable>
              <View>
                {currentlyTyping && index === data.messages.length - 1 && <Text variant='bodyLarge'>{formatCurrentlyTyping()}</Text>}
              </View>
            </Fragment>
          )
        }}
      />
    </GestureDetector>
  )
}

export default MessagesList

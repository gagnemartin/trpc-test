import { sessionAtom, themeAtom, userAtom } from '@/atoms'
import { Message } from '@/interfaces/conversation.interface'
import { trpc } from '@/trpc'
import { FlashList, ViewToken } from '@shopify/flash-list'
import { useAtomValue } from 'jotai'
import { Dispatch, Fragment, MutableRefObject, SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { Gesture, GestureDetector, Swipeable } from 'react-native-gesture-handler'
import { IconButton, Text } from 'react-native-paper'
import styles from './styles'
import { Session } from '@/interfaces/user.interface'
import useReadReceiptMutation from '@/hooks/useReadReceiptMutation'
import { MessageFormatted, User } from 'express-api-starter-ts/src/database/schema'
import { FontAwesome } from '@expo/vector-icons'
import { UsersTyping } from 'express-api-starter-ts/src/routers/conversations'

interface Conversation {
  id: string
  messages: MessageFormatted[]
}

interface MessagesListProps {
  data: Conversation
  flashListRef: MutableRefObject<FlashList<MessageFormatted> | null>
  swipeableRefs: MutableRefObject<{ [key: string]: Swipeable | null }>
  setReplyTo: Dispatch<SetStateAction<MessageFormatted | null>>
}

const renderSwipeActions = (progress: Animated.AnimatedInterpolation<string>) => {
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
    extrapolate: 'clamp'
  })

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 35 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <IconButton icon='reply' size={20} />
      </Animated.View>
    </View>
  )
}

const BouncingIcon = ({ delay = 0 }: { delay?: number }) => {
  const theme = useAtomValue(themeAtom)
  const [startAnimation, setStartAnimation] = useState(false)
  const bounceValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      setStartAnimation(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (startAnimation) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceValue, {
            toValue: -4, // move up by 10
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(bounceValue, {
            toValue: 0, // move back to original position
            duration: 500,
            useNativeDriver: true
          }),
          Animated.delay(500) // Add delay here
        ])
      ).start()
    }
  }, [startAnimation])

  return (
    <Animated.View style={{ transform: [{ translateY: bounceValue }] }}>
      <FontAwesome name='circle' color={theme.colors.secondary} style={{ paddingRight: 3 }} size={10} />
    </Animated.View>
  )
}

const MessagesList: React.FC<MessagesListProps> = ({ data, flashListRef, swipeableRefs, setReplyTo }) => {
  const reversedMessages = data.messages
  const pan = Gesture.Pan().activeOffsetX([-10, 10])
  const utils = trpc.useUtils()
  const theme = useAtomValue(themeAtom)
  const session = useAtomValue(sessionAtom) as Session
  const user = useAtomValue(userAtom) as User
  const readReceipt = useReadReceiptMutation(data.id)
  const [currentlyTyping, setCurrentlyTyping] = useState<UsersTyping | null>(null)

  trpc.conversations.whoIsTyping.useSubscription(
    {
      token: session.token,
      conversationIds: [data.id]
    },
    {
      enabled: data.id !== 'new',
      onData(whoIsTypingData) {
        console.log(whoIsTypingData)
        setCurrentlyTyping(whoIsTypingData[data.id] as UsersTyping)
      }
    }
  )

  const numberOfUnseenMessages = useMemo(() => {
    if (!user || !data) return 0
    return reversedMessages.filter((message) => {
      return message.readReceipts.some((readReceipt) => readReceipt.userId === user.id && !readReceipt.isSeen)
    }).length
  }, [data, user])

  const isOnlyEmojis = (text: string) => {
    const emojiRegex =
      /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/gu

    return emojiRegex.test(text)
  }

  const getBubbleReplyStyle = (messageData: MessageFormatted, i: number) => {
    if (!messageData.parent) return []

    const replyStyle: Array<Record<string, any>> = [styles.repliedBubble]

    if (messageData.sentBy === user.id) {
      replyStyle.push({ backgroundColor: theme.colors.elevation.level2 })
    } else {
      replyStyle.push({ backgroundColor: theme.colors.elevation.level1 })
    }

    return replyStyle
  }

  const getBubbleStyle = (messageData: MessageFormatted, i: number) => {
    const isFirstMessage = i === 0
    const isLastMessage = i === reversedMessages.length - 1
    const previousMessage = reversedMessages[i + 1]
    const nextMessage = reversedMessages[i - 1]
    const previousIsEmojiOnly = previousMessage && isOnlyEmojis(previousMessage.content)
    const previousIsSameSender = previousMessage?.sentBy === messageData.sentBy && !messageData.parent
    const nextIsSameSender = nextMessage?.sentBy === messageData.sentBy
    const nextContainsReply = nextMessage?.parent
    const isEmojiOnly = isOnlyEmojis(messageData.content)
    const bubbleStyle: Array<Record<string, any>> = [styles.message]

    if (messageData.sentBy === user.id) {
      bubbleStyle.push(styles.self, { backgroundColor: theme.colors.primaryContainer })

      if (previousIsSameSender && !previousIsEmojiOnly) {
        bubbleStyle.push({ borderTopRightRadius: 5 })
      }
    } else {
      bubbleStyle.push(styles.other, { backgroundColor: theme.colors.card })

      if (previousIsSameSender && !previousIsEmojiOnly) {
        bubbleStyle.push({ borderTopLeftRadius: 5 })
      }
    }

    if (nextIsSameSender && !isEmojiOnly) {
      bubbleStyle.push({ marginBottom: 3 })
    }

    if (isEmojiOnly) {
      bubbleStyle.push(styles.emojis)
    }

    // if (isFirstMessage) {
    //   bubbleStyle.push({ marginBottom: 90 })
    // }

    if (isLastMessage) {
      bubbleStyle.push({ marginTop: 20 })
    }

    return bubbleStyle
  }

  const handleViewableItemsChanged = ({ changed }: Record<string, ViewToken[]>) => {
    const unseenMessages: string[] = []

    changed.forEach((item) => {
      if (item.isViewable && item.item.sentBy !== user?.id && item.item.readReceipts.some((r: any) => !r.isSeen && r.userId === user?.id)) {
        unseenMessages.push(item.item.id)
      }
    })

    // console.log({ unseenMessages: unseenMessages.length })

    if (unseenMessages.length > 0) {
      readReceipt.mutate({ conversationId: data.id, messagesId: unseenMessages })
    }
  }

  const closeSwipeables = (item: MessageFormatted) => {
    Object.values(swipeableRefs.current).forEach((swipeable) => {
      if (swipeable && swipeable !== swipeableRefs.current[item.id]) {
        // swipeable.close()
        swipeable.reset()
      }
    })
  }

  const handleOnSwipeableOpen = (item: MessageFormatted) => {
    setReplyTo(item)
    // Close the previously opened Swipeable
    closeSwipeables(item)
  }

  const formatCurrentlyTyping = () => {
    if (!currentlyTyping) return ''
    const typingUsers = Object.values(currentlyTyping).filter((u) => {
      // console.log(u.profile.userId, user.id)
      return u.isTyping && u.profile.userId !== user.id
    })

    if (typingUsers.length === 0) return ''

    if (typingUsers.length === 1) {
      return `${typingUsers[0].profile.displayName || 'Person'} is typing...`
    }

    const names = typingUsers.map((u) => u.profile.displayName)

    return `${names.slice(0, -1).join(', ')} and ${names.slice(-1)} are typing...`
  }

  const scrollToMessage = (messageId: string) => {
    const index = reversedMessages.findIndex((m) => m.id === messageId)
    flashListRef.current?.scrollToIndex({ index, animated: true })
  }

  const currentlyTypingFormatted = formatCurrentlyTyping()

  return (
    <GestureDetector gesture={pan}>
      <FlashList
        inverted
        ref={flashListRef}
        data={reversedMessages as MessageFormatted[]}
        estimatedItemSize={85}
        extraData={currentlyTypingFormatted}
        // initialScrollIndex={data.messages.length - 1}
        // estimatedFirstItemOffset={data.messages.length * 85}
        onViewableItemsChanged={handleViewableItemsChanged}
        // keyExtractor={(item) => item.id}
        viewabilityConfig={{
          minimumViewTime: 1000
        }}
        showsVerticalScrollIndicator={false}
        // onLoad={() => flashListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item, index }: { item: MessageFormatted; index: number }) => {
          const style = getBubbleStyle(item, index)
          const styleReply = getBubbleReplyStyle(item, index)

          return (
            <Fragment>
              {/* {numberOfUnseenMessages >= 1 && !item.readReceipts.some((r: any) => r.isSeen) && item.sentBy !== user.id && (
                      <View style={styles.newMessageDivider}>
                        <Divider />
                        <Text style={styles.newMessageLabel}>New messages</Text>
                      </View>
                    )} */}
              {item.parent !== null && (
                <Pressable onPress={() => scrollToMessage(item.parent!.id)}>
                  <View style={[styles.repliedWrapper, item.sentBy === user.id ? styles.selfReply : styles.otherReply]}>
                    <Text
                      variant='bodySmall'
                      style={[
                        { paddingBottom: 5 },
                        item.sentBy === user.id ? { textAlign: 'right', paddingRight: 10 } : { paddingLeft: 10 }
                      ]}
                    >
                      Replied to
                    </Text>
                    <View style={styleReply}>
                      {/* <View style={styles.repliedBubble}> */}
                      <Text variant='bodySmall'>{item.parent.content}</Text>
                      {/* </View> */}
                    </View>
                  </View>
                </Pressable>
              )}

              <Swipeable
                {...(item.sentBy === user.id ? { renderRightActions: renderSwipeActions } : { renderLeftActions: renderSwipeActions })}
                ref={(ref) => (swipeableRefs.current[item.id] = ref)}
                friction={2}
                leftThreshold={30}
                onSwipeableOpen={() => handleOnSwipeableOpen(item)}
                overshootFriction={8}
                containerStyle={[
                  // { alignSelf: item.sentBy === user.id ? 'flex-end' : 'flex-start' },
                  index === 0 && currentlyTypingFormatted === '' ? { marginBottom: 90 } : {}
                ]}
                onSwipeableWillClose={() => {
                  setReplyTo(null)
                }}
              >
                <Text style={style} variant='bodyLarge'>
                  {item.content}
                </Text>
              </Swipeable>

              {currentlyTypingFormatted !== '' && index === 0 && (
                <View
                  style={[
                    styles.message,
                    styles.other,
                    { backgroundColor: theme.colors.card, flexDirection: 'row', alignItems: 'center', marginBottom: 90 }
                  ]}
                >
                  {/* {formatCurrentlyTyping()} */}
                  <BouncingIcon />
                  <BouncingIcon delay={200} />
                  <BouncingIcon delay={400} />
                </View>
              )}
            </Fragment>
          )
        }}
      />
    </GestureDetector>
  )
}

export default MessagesList

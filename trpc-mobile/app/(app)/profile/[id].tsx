import { trpc } from '@/trpc'
import { Link, useGlobalSearchParams, useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import { ActivityIndicator, Button, Text } from 'react-native-paper'

export default function Profile() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: profile, isPending: isLoadingProfile } = trpc.profiles.getProfileByUserId.useQuery({ userId: id as string })
  const { data: conversationId = 'new', isPending: isLoadingConversation } = trpc.conversations.getConversationFromProfile.useQuery({
    userId: id
  })

  if (isLoadingProfile || isLoadingConversation) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator animating />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Profile</Text>
      <Link
        href={{
          pathname: '/(app)/conversations/[id]',
          params: { id: conversationId, userId: id }
        }}
      >
        <Button mode='contained'>Send message</Button>
      </Link>
    </View>
  )
}

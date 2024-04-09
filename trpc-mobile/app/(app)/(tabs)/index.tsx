import { KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'
import { trpc } from '@/trpc'
import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { sessionAtom } from '@/atoms'
import { router } from 'expo-router'

export default function Home() {
  const [newMessage, setNewMessage] = useState('')
  const [messsages, setMessages] = useState<string[]>([])
  const { data = [], isLoading } = trpc.profiles.getProfiles.useQuery()

  const handlePress = (id: string) => {
    router.navigate(`/(app)/profile/${id}`)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      {data.map((profile) => (
        <Pressable key={profile.id} onPress={() => handlePress(profile.userId)}>
          <View style={styles.profile}>
            <Text>{profile.displayName}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  profile: {
    backgroundColor: 'lightgray',
    height: 50,
    margin: 10,
    width: 50
  }
})

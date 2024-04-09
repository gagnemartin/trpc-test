import { isAppLoadingAtom, sessionAtom, userAtom } from '@/atoms'
import { Redirect, Stack } from 'expo-router'
import { useAtomValue } from 'jotai'
import { Text } from 'react-native-paper'

export default function AppLayout() {
  const session = useAtomValue(sessionAtom)
  const user = useAtomValue(userAtom)

  // Only require authentication within the (app) group's layout as users
  // need to be able to access the (auth) group and sign in again.
  if (!session || !user) {
    // On web, static rendering will stop here as the user is not authenticated
    // in the headless Node process that the pages are rendered in.
    return <Redirect href='/sign-in' />
  }

  // This layout can be deferred because it's not the root layout.
  return (
    <Stack>
      <Stack.Screen
        name='(tabs)'
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen name='profile/[id]' />
    </Stack>
  )
}

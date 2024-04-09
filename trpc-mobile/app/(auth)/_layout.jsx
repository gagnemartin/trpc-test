import { Stack } from 'expo-router'

export default function AppLayout() {
  // This layout can be deferred because it's not the root layout.
  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name='sign-in' />
      <Stack.Screen name='register' />
    </Stack>
  )
}

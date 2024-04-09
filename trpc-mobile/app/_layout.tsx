import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ThemeProvider } from '@react-navigation/native'
import { ErrorBoundary, Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { PaperProvider } from 'react-native-paper'
import TRPCProvider from '@/components/TRPCProvider/TRPCProvider'
import { useAtomValue } from 'jotai'
import { isAppLoadingAtom, sessionAtom, themeAtom } from '@/atoms'
import useUser from '@/hooks/useUser'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'

// export {
//   // Catch any errors thrown by the Layout component.
//   ErrorBoundary
// } from 'expo-router'

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)'
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const theme = useAtomValue(themeAtom)
  // const isAppLoading = useAtomValue(isAppLoadingAtom)
  // // Preload session to call the onMount effect as soon as possible.
  useAtomValue(sessionAtom)

  // if (!isAppLoading) {
  //   SplashScreen.hideAsync()
  // }

  // if (isAppLoading) {
  //   return null
  // }

  return (
    <TRPCProvider>
      {/* <StatusBar translucent={false} /> */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <PaperProvider theme={theme}>
          <ThemeProvider value={theme}>
            <RootLayoutNav />
          </ThemeProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </TRPCProvider>
  )
}

function RootLayoutNav() {
  const isAppLoading = useAtomValue(isAppLoadingAtom)
  useUser()

  if (!isAppLoading) {
    SplashScreen.hideAsync()
  }

  if (isAppLoading) {
    return null
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name='(app)' />
    </Stack>
  )
}

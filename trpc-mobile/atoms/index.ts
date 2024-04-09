import { atom, useAtom } from 'jotai'
import { atomWithStorage, createJSONStorage } from 'jotai/utils'
import { theme, themeDark, themeDefault } from '@/styles/theme'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Session, User } from '@/interfaces/user.interface'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase.config'
import { trpc } from '@/trpc'

const storage = createJSONStorage(() => AsyncStorage)

export const isAppLoadingAtom = atom(true)

export const userAtom = atom<User | null>(null)
const sessionAtomPrimitive = atom<Session | null>(null)
export const sessionAtom = atom(
  (get) => get(sessionAtomPrimitive),
  (_get, set, newSession: Session | null) => {
    set(sessionAtomPrimitive, newSession)

    if (newSession === null) {
      set(isAppLoadingAtom, false)
    }
  }
)
sessionAtom.onMount = (set) => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('user signed in')
      const token = await user.getIdToken()
      set({
        token: token,
        user: { uid: user.uid, email: user.email as string }
      })
    } else {
      console.log('user signed out')
      set(null)
    }
  })

  return unsubscribe
}

export const isDarkModeAtom = atomWithStorage('isDarkMode', theme.dark, storage)
export const themeAtom = atom(async (get) => {
  const isDark = (await get(isDarkModeAtom)) as boolean
  return isDark ? themeDark : themeDefault
})
export const toggleDarkModeAtom = atom(
  async (get) => (await get(isDarkModeAtom)) as boolean,
  async (get, set) => {
    const isCurrentlyDark = (await get(isDarkModeAtom)) as boolean
    await set(isDarkModeAtom, !isCurrentlyDark)
    return !isCurrentlyDark
  }
)

export const inboxNotificationsAtom = atom(0)

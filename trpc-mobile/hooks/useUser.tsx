import { isAppLoadingAtom, sessionAtom, userAtom } from '@/atoms'
import { trpc } from '@/trpc'
import { useAtomValue, useSetAtom } from 'jotai'

const useUser = () => {
  const session = useAtomValue(sessionAtom)
  const setUser = useSetAtom(userAtom)
  const setAppLoading = useSetAtom(isAppLoadingAtom)
  const { data: user, isLoading } = trpc.users.getByFirebaseUid.useQuery({ firebaseUid: session?.user.uid }, { enabled: !!session })

  if (session && user) {
    console.log('SHOULD FETCH USER DATA HERE')
    console.log(user)
    setUser(user)
    setAppLoading(false)
  } else {
    console.log('NO SESSION')
    setUser(null)
  }
}

export default useUser

import { sessionAtom } from '@/atoms'
import { auth } from '@/firebase.config'
import { trpc } from '@/trpc'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createWSClient, httpBatchLink, splitLink, wsLink } from '@trpc/client'
import { useAtomValue } from 'jotai'
import { FC, ReactNode, useMemo, useState } from 'react'
import SuperJSON from 'superjson'
import { WS_URL, API_URL } from 'react-native-dotenv'

const TRPCProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const session = useAtomValue(sessionAtom)
  const queryClient = useMemo(() => new QueryClient(), [])
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          splitLink({
            condition: (op) => op.type === 'subscription',
            true: wsLink({
              transformer: SuperJSON,
              client: createWSClient({
                url: WS_URL
                // headers: async () => {
                //   const token = await auth.currentUser?.getIdToken()
                //   return {
                //     Authorization: token
                //   }
                // }
              })
            }),
            false: httpBatchLink({
              url: API_URL,
              transformer: SuperJSON,
              headers: () => {
                return {
                  Authorization: `Bearer ${session?.token}`
                }
              }
            })
          })
        ]
      }),
    [session?.token]
  )
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

export default TRPCProvider

import { sessionAtom } from '@/atoms'
import { trpc } from '@/trpc'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'

interface UseLastActiveAtProps {
  participantIds: string[]
  enabled?: boolean
}

interface LastActiveAt {
  [userId: string]: Date | null
}

const useLastActiveAt = ({ participantIds, enabled = true }: UseLastActiveAtProps): LastActiveAt | undefined => {
  const utils = trpc.useUtils()
  const session = useAtomValue(sessionAtom)

  const { data: lastActiveAt } = trpc.users.getLastActiveAt.useQuery({ userIds: participantIds }, { enabled })

  trpc.users.onLastActiveAtUpdate.useSubscription(
    {
      token: session!.token,
      userIds: participantIds
    },
    {
      onData: (newData) => {
        utils.users.getLastActiveAt.setData({ userIds: participantIds }, (old) => {
          return {
            ...old,
            ...newData
          }
        })
      }
    }
  )

  return lastActiveAt
}

export default useLastActiveAt

import { createTRPCReact } from '@trpc/react-query'
import { AppRouter } from 'express-api-starter-ts'

export const trpc = createTRPCReact<AppRouter>({})

import { applyWSSHandler } from '@trpc/server/adapters/ws';
import ws from 'ws'
import app from './app';
import { appRouter } from './appRouter'
import { createTRPCContext } from './trpc'

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Listening: http://localhost:${port}`);
  /* eslint-enable no-console */
});

applyWSSHandler({
  wss: new ws.Server({ server }),
  router: appRouter,
  createContext: createTRPCContext
})

export type AppRouter = typeof appRouter

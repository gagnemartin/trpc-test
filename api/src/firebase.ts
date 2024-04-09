import { TRPCError } from '@trpc/server'
import { auth } from 'firebase-admin'
import { initializeApp, applicationDefault } from 'firebase-admin/app'

// Initialize Firebase Admin with the service account
initializeApp({
  credential: applicationDefault()
})

export async function verifyToken(idToken: string) {
  try {
    const decodedToken = await auth().verifyIdToken(idToken)
    return decodedToken
  } catch (error) {
    console.error('Error verifying token', error)
    return
    // throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
}

// Call the function with the token you want to verify
// verifyToken('your-token-here');

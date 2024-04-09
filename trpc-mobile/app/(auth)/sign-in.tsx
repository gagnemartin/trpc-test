// Signin page with firebase authentification

import React, { useEffect, useState } from 'react'
import { View, KeyboardAvoidingView, StyleSheet } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'

import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase.config'
import { theme } from '@/styles/theme'
import { Link, router } from 'expo-router'
import { useAtom, useSetAtom } from 'jotai'
import { sessionAtom } from '@/atoms'
import { trpc } from '@/trpc'
import { Session } from '@/interfaces/user.interface'

let email = ''
let password = ''

const SignIn = () => {
  const [session, setSession] = useAtom(sessionAtom)
  const [firebaseData, setFirebaseData] = useState<Session | null>(null)
  const {
    data: user,
    isLoading: isLoadingUser,
    error
  } = trpc.users.getByFirebaseUid.useQuery(
    { firebaseUid: firebaseData?.user.uid ?? '' },
    {
      enabled: Boolean(firebaseData?.token),
      retry: 0
    }
  )
  const [isLoading, setIsLoading] = useState(false)
  const [firebaseError, setFirebaseError] = useState<Error | null>(null)

  useEffect(() => {
    if (user) {
      setSession(firebaseData)
      router.replace('/')
    }
  }, [user])

  const setEmail = (value: string) => {
    email = value
  }

  const setPassword = (value: string) => {
    password = value
  }

  const handleSignIn = async () => {
    setIsLoading(true)
    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const firebaseUser = userCredential.user
        const token = await firebaseUser.getIdToken()
        setFirebaseData({
          token: token,
          user: { uid: firebaseUser.uid, email: firebaseUser.email as string }
        })
      })
      .catch((error) => {
        setFirebaseError(error)
      })
      .finally(() => setIsLoading(false))
  }

  return (
    <KeyboardAvoidingView style={styles.container}>
      <Text style={styles.header} variant='titleLarge'>
        Sign in
      </Text>

      {(error || firebaseError) && <Text>{firebaseError?.message ?? error?.message}</Text>}

      <View style={styles.formContainer}>
        <TextInput label='Email' onChangeText={setEmail} style={styles.input} />
        <TextInput label='Password' onChangeText={setPassword} style={styles.input} secureTextEntry />
        <Button onPress={handleSignIn} mode='contained' style={styles.submit} loading={isLoading || isLoadingUser}>
          Sign in
        </Button>
        <Text style={styles.center}>
          Don't have an account?{' '}
          <Link href='/register' style={styles.link}>
            Sign up
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    marginBottom: 20
  },
  formContainer: {
    width: '80%'
  },
  input: {
    marginBottom: 10
  },
  submit: {
    marginTop: 20
  },
  link: {
    color: theme.colors.primary
  },
  center: {
    textAlign: 'center',
    marginTop: 20
  }
})

export default SignIn

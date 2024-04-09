// Signin page with firebase authentification

import React, { useState } from 'react'
import { View, KeyboardAvoidingView, StyleSheet } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'

import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/firebase.config'
import { theme } from '@/styles/theme'
import { Link, router } from 'expo-router'
import { useSetAtom } from 'jotai'
import { sessionAtom } from '@/atoms'
import { trpc } from '@/trpc'

let email = ''
let password = ''

const Register = () => {
  const setSession = useSetAtom(sessionAtom)
  const { isPending, mutate, error } = trpc.users.create.useMutation()
  // const [email, setEmail] = useState('')
  // const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [firebaseError, setFirebaseError] = useState<Error | null>(null)

  const setEmail = (value: string) => {
    email = value
  }

  const setPassword = (value: string) => {
    password = value
  }

  const handleRegister = async () => {
    setIsLoading(true)
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredentials) => {
        const user = userCredentials.user
        return userCredentials.user.getIdToken().then((token) => {
          mutate(
            { firebaseUid: user.uid, email: email },
            {
              onSuccess: (data) => {
                setSession({
                  token: token,
                  user: { uid: data.firebaseUid, email: data.email }
                })

                router.replace('/')
              }
            }
          )
        })
      })
      .catch((error) => {
        setFirebaseError(error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  console.log('hello')

  return (
    <KeyboardAvoidingView style={styles.container}>
      <Text style={styles.header} variant='titleLarge'>
        Register
      </Text>

      {(error || firebaseError) && <Text>{firebaseError?.message ?? error?.message}</Text>}

      <View style={styles.formContainer}>
        <TextInput label='Email' onChangeText={setEmail} style={styles.input} />
        <TextInput label='Password' onChangeText={setPassword} style={styles.input} secureTextEntry />
        <Button onPress={handleRegister} mode='contained' style={styles.submit} loading={isLoading || isPending}>
          Register
        </Button>
        <Text style={styles.center}>
          Already have an account?{' '}
          <Link href='/sign-in' style={styles.link}>
            Sign in
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

export default Register

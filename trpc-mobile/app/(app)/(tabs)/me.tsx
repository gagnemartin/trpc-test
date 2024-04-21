import { toggleDarkModeAtom, userAtom } from '@/atoms'
import { auth } from '@/firebase.config'
import { useAtom, useAtomValue } from 'jotai'
import { StyleSheet, View } from 'react-native'
import { Button, Switch, Text } from 'react-native-paper'

export default function Me() {
  const [isDarkMode, toggleDarkMode] = useAtom(toggleDarkModeAtom)
  const user = useAtomValue(userAtom)

  const handleLogOut = async () => {
    await auth.signOut()
  }

  const handleToggleTheme = () => {
    toggleDarkMode()
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Me</Text>
      <Text>{user?.email}</Text>
      <Switch value={isDarkMode} onValueChange={handleToggleTheme} />
      <Button mode='contained' onPress={handleLogOut}>
        Logout
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%'
  }
})

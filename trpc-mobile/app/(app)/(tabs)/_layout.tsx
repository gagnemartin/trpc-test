import React from 'react'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Link, Tabs } from 'expo-router'
import { Pressable } from 'react-native'
import { useAtomValue } from 'jotai'
import { inboxNotificationsAtom } from '@/atoms'

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />
}

export default function TabLayout() {
  const inboxNotifications = useAtomValue(inboxNotificationsAtom)

  return (
    <Tabs
      screenOptions={{
        // tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Tab One',
          tabBarIcon: ({ color }) => <TabBarIcon name='code' color={color} />
        }}
      />
      <Tabs.Screen
        name='inbox'
        options={{
          title: 'Inbox',
          lazy: false,
          tabBarBadge: inboxNotifications > 0 ? inboxNotifications : undefined,
          tabBarIcon: ({ color }) => <TabBarIcon name='comments' color={color} />
        }}
      />
      <Tabs.Screen
        name='me'
        options={{
          title: 'Me',
          tabBarIcon: ({ color }) => <TabBarIcon name='user' color={color} />
        }}
      />
    </Tabs>
  )
}

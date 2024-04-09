import { Appearance } from 'react-native'
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper'
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native'

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationDark: NavigationDarkTheme,
  reactNavigationLight: NavigationDefaultTheme
})

const isDarkMode = Appearance.getColorScheme() === 'dark'

export const barStyleDefault = 'dark-content'
export const barStyleDark = 'light-content'
export const barStyle = isDarkMode ? barStyleDark : barStyleDefault
export const themeDefault = {
  ...LightTheme,
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...LightTheme.colors,
    ...MD3LightTheme.colors
  }
}
export const themeDark = {
  ...DarkTheme,
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...DarkTheme.colors,
    ...MD3DarkTheme.colors
  }
}
export const theme = isDarkMode ? themeDark : themeDefault

import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  newMessageDivider: {
    paddingVertical: 20,
    width: '100%'
  },
  newMessageLabel: {
    textAlign: 'center'
  },
  // bubble: {
  //   maxWidth: '70%',
  //   padding: 10,
  //   borderRadius: 20,
  //   margin: 10,
  //   backgroundColor: '#f0f0f0'
  // },
  repliedWrapper: {
    // position: 'relative',
    // top: 20,
    marginBottom: -20,
    maxWidth: '70%'
  },
  repliedBubble: {
    borderRadius: 20,
    marginBottom: 0,
    padding: 10,
    paddingBottom: 30
  },
  selfReply: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5
  },
  otherReply: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5
  },
  message: {
    maxWidth: '70%',
    borderRadius: 20,
    padding: 10,
    marginBottom: 10
    // elevation: 3, // Android
    // shadowColor: '#030002', // Android, iOS & Web
    // shadowOpacity: 0.25, // iOS & Web
    // shadowRadius: 5 // iOS & web
  },
  self: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 5
  },
  other: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 5
  },
  emojis: {
    backgroundColor: 'transparent',
    fontSize: 34,
    lineHeight: 34 * 1.2,
    padding: 0
  }
})

export default styles

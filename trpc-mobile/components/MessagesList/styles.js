import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  messagesWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: '100%'
  },
  newMessageDivider: {
    paddingVertical: 20,
    width: '100%'
  },
  newMessageLabel: {
    textAlign: 'center'
  },
  bubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 20,
    margin: 10,
    backgroundColor: '#f0f0f0'
  },
  repliedWrapper: {
    position: 'relative',
    // top: 20,
    padding: 10,
    marginHorizontal: 20,
    borderLeftColor: '#d6d6d6',
    borderLeftWidth: 3
  },
  repliedBubble: {
    maxWidth: '70%',
    // padding: 20,
    borderRadius: 20
    // backgroundColor: '#d6d6d6'
  }
})

export default styles

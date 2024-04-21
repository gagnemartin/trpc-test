import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  inputWrapper: {
    // flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    // backgroundColor: 'transparent'
    position: 'absolute',
    width: '100%',
    bottom: 0
  },
  input: {
    // margin: 20,
    flex: 1
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  replyWrapper: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 15,
    opacity: 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    marginBottom: 10
  }
})

export default styles

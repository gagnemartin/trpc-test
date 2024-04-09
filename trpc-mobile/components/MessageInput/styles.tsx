import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20
    // position: 'absolute',
    // bottom: 0
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
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  }
})

export default styles

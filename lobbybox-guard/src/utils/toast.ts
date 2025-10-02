import {Alert, Platform, ToastAndroid} from 'react-native';
import {ParsedApiError, getDisplayMessage} from './error';

export const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert('', message);
};

export const showErrorToast = (error: ParsedApiError) => {
  const message = getDisplayMessage(error);
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  }

  if (error.requestId) {
    Alert.alert('Error', message, [
      {text: 'Close', style: 'cancel'},
      {
        text: 'Details',
        onPress: () => {
          Alert.alert('Request details', `Request ID: ${error.requestId}`);
        },
      },
    ]);
    return;
  }

  Alert.alert('Error', message);
};

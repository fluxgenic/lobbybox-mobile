import {Platform} from 'react-native';

const LOCALHOST = Platform.select({
  ios: 'http://localhost:3000',
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const API_BASE_URL = LOCALHOST ?? 'http://localhost:3000';
export const API_BASE_PATH = `${API_BASE_URL}/v1`;

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './src/App';
import {configureEnvironment} from './src/config/env';
import {name as appName} from './app.json';

if (global.__APP_CONFIG) {
  configureEnvironment(global.__APP_CONFIG);
}

AppRegistry.registerComponent(appName, () => App);

/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { installDeviceLogging, logInfo } from './services/logger';

installDeviceLogging();
logInfo('Index', 'Registering React Native app', { appName });
AppRegistry.registerComponent(appName, () => App);

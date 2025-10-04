import {View} from 'react-native';

/**
 * Metro attempts to codegen the DebuggingOverlay native component and fails
 * because the upstream spec uses Flow's $ReadOnlyArray type, which isn't
 * supported by the version of react-native-codegen bundled with Expo. We
 * shim the module with a simple JS implementation so bundling can continue.
 */
export default View;

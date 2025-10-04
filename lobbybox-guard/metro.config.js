const path = require('path');
const {resolve} = require('metro-resolver');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');

const debugOverlaySpecModule =
  'react-native/src/private/specs/components/DebuggingOverlayNativeComponent';
const debugOverlayShimPath = path.resolve(
  __dirname,
  'src/shims/DebuggingOverlayNativeComponent.js',
);

const defaultResolveRequest =
  config.resolver.resolveRequest ?? ((context, moduleName, platform) =>
    resolve(context, moduleName, platform),
  );

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === debugOverlaySpecModule) {
    return {
      type: 'sourceFile',
      filePath: debugOverlayShimPath,
    };
  }

  return defaultResolveRequest(context, moduleName, platform);
};

module.exports = config;

/**
 * React Native 0.74 enables the bridgeless runtime in development by default.
 * Metro attempts to resolve certain core modules (for example, PlatformConstants)
 * through the TurboModule system, which isn't available when running inside Expo
 * Go or the web bundler. When this happens the runtime throws an invariant
 * because TurboModuleRegistry can't locate the module.
 *
 * Setting `global.RN$TurboInterop` to `true` restores the legacy NativeModules
 * fallback path so TurboModuleRegistry can read core modules provided by Expo.
 * The flag needs to be applied before any React Native imports execute.
 */

declare global {
  // The flag is defined by React Native's TurboModuleRegistry runtime.
  // eslint-disable-next-line no-var
  var RN$TurboInterop: boolean | undefined;
}

if (globalThis.RN$TurboInterop !== true) {
  globalThis.RN$TurboInterop = true;
}

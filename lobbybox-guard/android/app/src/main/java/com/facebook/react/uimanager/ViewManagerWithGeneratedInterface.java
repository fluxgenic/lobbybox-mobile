package com.facebook.react.uimanager;

import android.view.View;

/**
 * Compatibility stub for React Native libraries that still expect the legacy
 * {@code ViewManagerWithGeneratedInterface} marker interface. React Native 0.76
 * removed the type from the core package, but several community libraries –
 * including react-native-gesture-handler – continue to reference it in their
 * code-generated interfaces. Providing the stub keeps those interfaces on the
 * classpath without affecting runtime behaviour because none of the
 * implementations rely on its methods.
 */
public interface ViewManagerWithGeneratedInterface<T extends View> {
  // Intentionally empty: the historical interface only acted as a marker to
  // allow generated view manager delegates to share a common bound.
}

import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {enableScreens} from 'react-native-screens';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useFonts} from 'expo-font';
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {ThemeProvider} from '@/theme';
import {AuthProvider} from '@/context/AuthContext';
import {AppNavigator} from '@/navigation/AppNavigator';
import {DebugProvider} from '@/debug/DebugContext';
import {ToastHost} from '@/components/ToastHost';

enableScreens();

const App: React.FC = () => {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastHost />
          <DebugProvider>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </DebugProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

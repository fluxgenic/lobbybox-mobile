import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {enableScreens} from 'react-native-screens';
import {ThemeProvider} from '@/theme';
import {AuthProvider} from '@/context/AuthContext';
import {AppNavigator} from '@/navigation/AppNavigator';
import {DebugProvider} from '@/debug/DebugContext';

enableScreens();

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
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

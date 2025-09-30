import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StatusBar} from 'react-native';
import {LoginScreen} from '@/screens/Auth/LoginScreen';
import {CaptureScreen} from '@/screens/App/CaptureScreen';
import {TodayScreen} from '@/screens/App/TodayScreen';
import {HistoryScreen} from '@/screens/App/HistoryScreen';
import {ProfileScreen} from '@/screens/App/ProfileScreen';
import {GuardRestrictionScreen} from '@/screens/App/GuardRestrictionScreen';
import {useAuth} from '@/hooks/useAuth';
import {LoadingView} from '@/components/LoadingView';
import {useThemeContext} from '@/theme';

export type AuthStackParamList = {
  Login: undefined;
};

export type AppTabParamList = {
  Capture: undefined;
  Today: undefined;
  History: undefined;
  Profile: undefined;
};

export type RestrictedStackParamList = {
  Restricted: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();
const RestrictedStack = createNativeStackNavigator<RestrictedStackParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{headerShown: false}}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

const AppTabs = () => {
  const {theme} = useThemeContext();
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.card},
        headerTintColor: theme.colors.text,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {backgroundColor: theme.colors.card},
      }}>
      <Tab.Screen name="Capture" component={CaptureScreen} />
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const GuardRestrictionNavigator = () => (
  <RestrictedStack.Navigator screenOptions={{headerShown: false}}>
    <RestrictedStack.Screen name="Restricted" component={GuardRestrictionScreen} />
  </RestrictedStack.Navigator>
);

export const AppNavigator: React.FC = () => {
  const {status, user} = useAuth();
  const {theme, mode} = useThemeContext();

  if (status === 'idle' || status === 'loading') {
    return <LoadingView />;
  }

  const isGuard = user?.role === 'GUARD';

  return (
    <NavigationContainer theme={theme}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.card} />
      {status !== 'authenticated' ? <AuthNavigator /> : isGuard ? <AppTabs /> : <GuardRestrictionNavigator />}
    </NavigationContainer>
  );
};

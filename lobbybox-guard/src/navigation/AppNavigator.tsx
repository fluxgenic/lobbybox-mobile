import React, {useMemo} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {StatusBar} from 'expo-status-bar';
import {StyleSheet, Text, View} from 'react-native';
import {LoginScreen} from '@/screens/Auth/LoginScreen';
import {HomeScreen} from '@/screens/App/HomeScreen';
import {SettingsScreen} from '@/screens/App/SettingsScreen';
import {NotPermittedScreen} from '@/screens/Auth/NotPermittedScreen';
import {useAuth} from '@/context/AuthContext';
import {SplashScreen} from '@/components/SplashScreen';
import {useThemeContext} from '@/theme';

export type AuthStackParamList = {
  Login: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Settings: undefined;
};

export type RestrictedStackParamList = {
  NotPermitted: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const RestrictedStack = createNativeStackNavigator<RestrictedStackParamList>();

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{headerShown: false}}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
  </AuthStack.Navigator>
);

const PropertyHeaderTitle: React.FC<{title: string; subtitle?: string | null}> = ({title, subtitle}) => {
  const {theme} = useThemeContext();
  return (
    <View style={headerStyles.container}>
      <Text style={[headerStyles.title, {color: theme.roles.text.primary}]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[headerStyles.subtitle, {color: theme.roles.text.secondary}]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const AppStackNavigator: React.FC = () => {
  const {user} = useAuth();
  const propertyName = user?.property?.name?.trim();
  const propertyCode = user?.property?.code?.trim();
  const greeting = useMemo(() => {
    const displayName = user?.displayName ?? user?.fullName ?? user?.email;
    return displayName ? `Welcome, ${displayName}` : 'Home';
  }, [user]);

  const headerTitle = useMemo(
    () =>
      function Header() {
        return <PropertyHeaderTitle title={propertyName ?? greeting} subtitle={propertyCode ?? null} />;
      },
    [greeting, propertyCode, propertyName],
  );

  return (
    <AppStack.Navigator>
      <AppStack.Screen name="Home" component={HomeScreen} options={{headerTitle}} />
      <AppStack.Screen name="Settings" component={SettingsScreen} options={{title: 'Settings'}} />
    </AppStack.Navigator>
  );
};

const RestrictedNavigator = () => (
  <RestrictedStack.Navigator screenOptions={{headerShown: false}}>
    <RestrictedStack.Screen name="NotPermitted" component={NotPermittedScreen} />
  </RestrictedStack.Navigator>
);

export const AppNavigator: React.FC = () => {
  const {status, user} = useAuth();
  const {theme, mode} = useThemeContext();

  if (status === 'idle' || status === 'loading') {
    return <SplashScreen />;
  }

  const isAuthenticated = status === 'authenticated';
  const isGuard = user?.role === 'GUARD';

  return (
    <NavigationContainer theme={theme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} backgroundColor={theme.colors.card} />
      {!isAuthenticated ? <AuthNavigator /> : isGuard ? <AppStackNavigator /> : <RestrictedNavigator />}
    </NavigationContainer>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});

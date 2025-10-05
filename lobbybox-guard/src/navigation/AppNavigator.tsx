import React, {useMemo} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StatusBar} from 'expo-status-bar';
import {StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {LoginScreen} from '@/screens/Auth/LoginScreen';
import {HomeScreen} from '@/screens/App/HomeScreen';
import {SettingsScreen} from '@/screens/App/SettingsScreen';
import {CaptureScreen} from '@/screens/App/CaptureScreen';
import {HistoryScreen} from '@/screens/App/HistoryScreen';
import {NotPermittedScreen} from '@/screens/Auth/NotPermittedScreen';
import {useAuth} from '@/context/AuthContext';
import {SplashScreen} from '@/components/SplashScreen';
import {useThemeContext} from '@/theme';

export type AuthStackParamList = {
  Login: undefined;
};

export type AppTabsParamList = {
  Capture: undefined;
  Today: undefined;
  History: undefined;
  Profile: undefined;
};

export type RestrictedStackParamList = {
  NotPermitted: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabsParamList>();
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

const AppTabsNavigator: React.FC = () => {
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

  const {theme} = useThemeContext();

  return (
    <AppTabs.Navigator
      screenOptions={({route}) => ({
        headerStyle: {backgroundColor: theme.colors.card},
        headerTintColor: theme.roles.text.primary,
        tabBarActiveTintColor: theme.palette.primary.main,
        tabBarInactiveTintColor: theme.roles.text.secondary,
        tabBarStyle: {backgroundColor: theme.colors.card, borderTopColor: theme.roles.card.border},
        tabBarIcon: ({color, size, focused}) => {
          const iconName = getTabIconName(route.name, focused);
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <AppTabs.Screen name="Capture" component={CaptureScreen} />
      <AppTabs.Screen name="Today" component={HomeScreen} options={{headerTitle}} />
      <AppTabs.Screen name="History" component={HistoryScreen} />
      <AppTabs.Screen name="Profile" component={SettingsScreen} options={{title: 'Profile'}} />
    </AppTabs.Navigator>
  );
};

const RestrictedNavigator = () => (
  <RestrictedStack.Navigator screenOptions={{headerShown: false}}>
    <RestrictedStack.Screen name="NotPermitted" component={NotPermittedScreen} />
  </RestrictedStack.Navigator>
);

const getTabIconName = (routeName: keyof AppTabsParamList, focused: boolean): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case 'Capture':
      return focused ? 'camera' : 'camera-outline';
    case 'Today':
      return focused ? 'home' : 'home-outline';
    case 'History':
      return focused ? 'time' : 'time-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    default:
      return 'ellipse-outline';
  }
};

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
      {!isAuthenticated ? <AuthNavigator /> : isGuard ? <AppTabsNavigator /> : <RestrictedNavigator />}
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

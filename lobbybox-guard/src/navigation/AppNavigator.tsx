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
import {ProfileDetailsScreen} from '@/screens/App/ProfileDetailsScreen';
import {ChangePasswordScreen} from '@/screens/App/ChangePasswordScreen';
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

export type ProfileStackParamList = {
  Settings: undefined;
  ProfileDetails: undefined;
  ChangePassword: undefined;
};

export type RestrictedStackParamList = {
  NotPermitted: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabsParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const RestrictedStack = createNativeStackNavigator<RestrictedStackParamList>();

const TAB_LABELS: Record<keyof AppTabsParamList, string> = {
  Capture: 'Capture',
  Today: 'Today',
  History: 'History',
  Profile: 'Profile',
};

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

const ProfileNavigator: React.FC = () => {
  const {theme} = useThemeContext();
  const {user} = useAuth();

  const propertyName = user?.property?.name?.trim() ?? user?.propertyName?.trim() ?? null;
  const propertyCode = user?.property?.code?.trim() ?? null;
  const greeting = useMemo(() => {
    const displayName = user?.displayName ?? user?.fullName ?? user?.email;
    return displayName ? `Welcome, ${displayName}` : 'Profile';
  }, [user]);

  const profileHeaderTitle = useMemo(
    () =>
      function Header() {
        return (
          <PropertyHeaderTitle title={propertyName ?? greeting} subtitle={propertyCode ?? null} />
        );
      },
    [greeting, propertyCode, propertyName],
  );

  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: theme.colors.card},
        headerTintColor: theme.roles.text.primary,
        headerTitleStyle: {color: theme.roles.text.primary},
        contentStyle: {backgroundColor: theme.roles.background.default},
      }}
    >
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{headerTitle: profileHeaderTitle}} />
      <ProfileStack.Screen name="ProfileDetails" component={ProfileDetailsScreen} options={{title: 'My Profile'}} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{title: 'Change Password'}} />
    </ProfileStack.Navigator>
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
        tabBarActiveTintColor: theme.roles.text.primary,
        tabBarInactiveTintColor: theme.roles.text.secondary,
        tabBarStyle: {backgroundColor: theme.colors.card, borderTopColor: theme.roles.card.border},
        tabBarLabel: ({focused, color}) => (
          <Text style={[tabStyles.label, {color, fontWeight: focused ? '700' : '500'}]}>
            {TAB_LABELS[route.name]}
          </Text>
        ),
        tabBarIcon: ({size, focused}) => {
          const iconName = getTabIconName(route.name, focused);
          const iconColor = focused ? theme.palette.primary.main : theme.roles.text.secondary;
          return <Ionicons name={iconName} size={size} color={iconColor} />;
        },
      })}
    >
      <AppTabs.Screen name="Capture" component={CaptureScreen} />
      <AppTabs.Screen name="Today" component={HomeScreen} options={{headerTitle}} />
      <AppTabs.Screen name="History" component={HistoryScreen} />
      <AppTabs.Screen name="Profile" component={ProfileNavigator} options={{headerShown: false}} />
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

const tabStyles = StyleSheet.create({
  label: {
    fontSize: 12,
  },
});

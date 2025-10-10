import React, {useCallback, useMemo} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useAuth} from '@/context/AuthContext';
import {useThemeContext} from '@/theme';
import {useDebug} from '@/debug/DebugContext';
import {showToast} from '@/utils/toast';
import {Ionicons} from '@expo/vector-icons';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ProfileStackParamList} from '@/navigation/AppNavigator';

export const SettingsScreen: React.FC = () => {
  const {user, logout} = useAuth();
  const {theme, mode, toggleTheme} = useThemeContext();
  const {lastRequestId} = useDebug();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  const getExtraString = useCallback((value: unknown) => {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, []);

  const appVersion = useMemo(() => {
    const version =
      getExtraString(Constants.expoConfig?.version) ??
      getExtraString(Constants.expoConfig?.extra?.appVersion as string | undefined) ??
      getExtraString(Constants.nativeAppVersion) ??
      getExtraString(Constants.expoVersion) ??
      'unknown';
    const build =
      getExtraString(Constants.expoConfig?.extra?.buildNumber as string | undefined) ??
      getExtraString(Constants.expoConfig?.runtimeVersion) ??
      getExtraString(Constants.nativeBuildVersion) ??
      getExtraString(Constants.nativeAppVersion) ??
      'unknown';

    return `Version ${version} (${build})`;
  }, [getExtraString]);

  const userName = user?.displayName ?? user?.fullName ?? user?.email ?? 'Guest';
  const initials = useMemo(() => {
    const source = user?.displayName ?? user?.fullName ?? user?.email ?? '';
    if (!source) {
      return 'G';
    }
    const parts = source.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }, [user?.displayName, user?.email, user?.fullName]);

  const propertyDisplay = useMemo(() => {
    if (!user?.property?.name) {
      return '—';
    }
    const code = user.property.code?.trim();
    return code ? `${user.property.name} (${code})` : user.property.name;
  }, [user?.property?.code, user?.property?.name]);

  const handleSignOut = useCallback(() => {
    logout();
  }, [logout]);

  const handleCopyDiagnostics = useCallback(async () => {
    const version =
      getExtraString(Constants.expoConfig?.version) ??
      getExtraString(Constants.expoConfig?.extra?.appVersion as string | undefined) ??
      getExtraString(Constants.nativeAppVersion) ??
      getExtraString(Constants.expoVersion) ??
      'unknown';
    const build =
      getExtraString(Constants.expoConfig?.extra?.buildNumber as string | undefined) ??
      getExtraString(Constants.expoConfig?.runtimeVersion) ??
      getExtraString(Constants.nativeBuildVersion) ??
      getExtraString(Constants.nativeAppVersion) ??
      'unknown';

    const diagnostics = [`App version: ${version}`, `Build: ${build}`, `Last request ID: ${lastRequestId ?? 'N/A'}`].join('\n');

    try {
      await Clipboard.setStringAsync(diagnostics);
      showToast('Diagnostics copied', {type: 'success'});
    } catch (error) {
      showToast('Unable to copy diagnostics', {type: 'error'});
    }
  }, [getExtraString, lastRequestId]);

  const handleShowProfile = useCallback(() => {
    navigation.navigate('ProfileDetails');
  }, [navigation]);

  const handleChangePassword = useCallback(() => {
    navigation.navigate('ChangePassword');
  }, [navigation]);

  const handleAbout = useCallback(() => {
    Alert.alert('About', appVersion, [
      {text: 'Copy diagnostics', onPress: handleCopyDiagnostics},
      {text: 'Close', style: 'cancel'},
    ]);
  }, [appVersion, handleCopyDiagnostics]);

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={({pressed}) => [
              styles.profileCard,
              {
                backgroundColor: theme.roles.card.background,
                borderColor: theme.roles.card.border,
                opacity: pressed ? 0.96 : 1,
              },
            ]}
            onPress={handleShowProfile}
            accessibilityRole="button"
            accessibilityLabel="View profile details"
          >
            <View style={[styles.avatar, {backgroundColor: theme.palette.primary.main}]}>
              <Text style={[styles.avatarText, {color: theme.roles.text.onPrimary}]}>{initials}</Text>
            </View>
            <View>
              <Text style={[styles.profileName, {color: theme.roles.text.primary}]} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={[styles.profileSub, {color: theme.roles.text.secondary}]} numberOfLines={1}>
                {user?.email ?? '—'}
              </Text>
              <Text style={[styles.profileMeta, {color: theme.roles.text.secondary}]} numberOfLines={1}>
                {propertyDisplay}
              </Text>
            </View>
          </Pressable>

          <View
            style={[styles.menu, {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border}]}
          >
            <MenuItem
              icon="person-circle-outline"
              label="My Profile"
              onPress={handleShowProfile}
              accessibilityLabel="View my profile"
            />
            <MenuItem
              icon="key-outline"
              label="Change Password"
              onPress={handleChangePassword}
              accessibilityLabel="Change password"
            />
            <MenuItem
              icon={mode === 'dark' ? 'moon' : 'moon-outline'}
              label="Dark Mode"
              onPress={handleToggleTheme}
              accessibilityLabel="Toggle dark mode"
            >
              <Switch
                value={mode === 'dark'}
                onValueChange={handleToggleTheme}
                trackColor={{false: theme.roles.card.border, true: theme.palette.primary.main}}
                thumbColor={mode === 'dark' ? theme.roles.text.primary : theme.roles.card.background}
                ios_backgroundColor={theme.roles.card.border}
              />
            </MenuItem>
            <MenuItem
              icon="information-circle-outline"
              label="About"
              onPress={handleAbout}
              accessibilityLabel="About this app"
            />
            <MenuItem
              icon="log-out-outline"
              label="Logout"
              onPress={handleSignOut}
              accessibilityLabel="Log out"
              isDestructive
              isLast
              showChevron={false}
            />
          </View>

        </ScrollView>
        <Text style={[styles.version, {color: theme.roles.text.secondary}]}>{appVersion}</Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
    margin:10
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileSub: {
    fontSize: 14,
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  menu: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuSpacer: {
    flex: 1,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 12,
  },
});

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  children?: React.ReactNode;
  accessibilityLabel?: string;
  isDestructive?: boolean;
  isLast?: boolean;
  showChevron?: boolean;
};

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  onPress,
  children,
  accessibilityLabel,
  isDestructive,
  isLast,
  showChevron,
}) => {
  const {theme} = useThemeContext();
  const shouldShowChevron = showChevron ?? !children;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({pressed}) => [
        styles.menuItem,
        {
          backgroundColor: pressed ? theme.palette.background.default : theme.roles.card.background,
          borderBottomColor: theme.roles.card.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={isDestructive ? theme.palette.error.main : theme.roles.text.primary}
        style={styles.menuIcon}
      />
      <Text
        style={[
          styles.menuLabel,
          {color: isDestructive ? theme.palette.error.main : theme.roles.text.primary},
        ]}
      >
        {label}
      </Text>
      <View style={styles.menuSpacer} />
      {children}
      {onPress && shouldShowChevron ? (
        <Ionicons name="chevron-forward" size={20} color={theme.roles.text.secondary} />
      ) : null}
    </Pressable>
  );
};

import React, {useCallback} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import {ScreenContainer} from '@/components/ScreenContainer';
import {Button} from '@/components/Button';
import {useAuth} from '@/context/AuthContext';
import {useThemeContext} from '@/theme';
import {FEATURE_FLAGS} from '@/config/env';
import {DebugPanel} from '@/components/DebugPanel';
import {useDebug} from '@/debug/DebugContext';
import {showToast} from '@/utils/toast';

export const SettingsScreen: React.FC = () => {
  const {user, logout} = useAuth();
  const {theme} = useThemeContext();
  const {lastRequestId} = useDebug();

  const handleSignOut = useCallback(() => {
    logout();
  }, [logout]);

  const handleCopyDiagnostics = useCallback(async () => {
    const version =
      Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? Constants.expoVersion ?? 'unknown';
    const build =
      Constants.expoConfig?.runtimeVersion ?? Constants.nativeBuildVersion ?? Constants.nativeAppVersion ?? 'unknown';

    const diagnostics = [`App version: ${version}`, `Build: ${build}`, `Last request ID: ${lastRequestId ?? 'N/A'}`].join(
      '\n',
    );

    try {
      await Clipboard.setStringAsync(diagnostics);
      showToast('Diagnostics copied', {type: 'success'});
    } catch (error) {
      showToast('Unable to copy diagnostics', {type: 'error'});
    }
  }, [lastRequestId]);

  return (
    <ScreenContainer>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.roles.text.primary}]}>Profile</Text>
        <View style={styles.row}>
          <Text style={[styles.label, {color: theme.roles.text.secondary}]}>Name</Text>
          <Text style={[styles.value, {color: theme.roles.text.primary}]}>{user?.displayName ?? '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, {color: theme.roles.text.secondary}]}>Email</Text>
          <Text style={[styles.value, {color: theme.roles.text.primary}]}>{user?.email ?? '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, {color: theme.roles.text.secondary}]}>Role</Text>
          <Text style={[styles.value, {color: theme.roles.text.primary}]}>{user?.role ?? '—'}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          title="Copy diagnostics"
          onPress={handleCopyDiagnostics}
          variant="secondary"
          accessibilityLabel="Copy diagnostics to clipboard"
        />
        <Button title="Sign out" onPress={handleSignOut} accessibilityLabel="Sign out" style={styles.signOut} />
      </View>
      {FEATURE_FLAGS.SHOW_DEBUG_PANEL ? <DebugPanel /> : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  actions: {
    marginTop: 8,
  },
  signOut: {
    marginTop: 12,
  },
});

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {Button} from '@/components/Button';
import {useAuth} from '@/context/AuthContext';
import {useThemeContext} from '@/theme';
import {FEATURE_FLAGS} from '@/config/env';
import {DebugPanel} from '@/components/DebugPanel';

export const SettingsScreen: React.FC = () => {
  const {user, logout} = useAuth();
  const {theme} = useThemeContext();

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
      <Button title="Sign out" onPress={logout} accessibilityLabel="Sign out" style={styles.signOut} />
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
  signOut: {
    marginTop: 8,
  },
});

import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useThemeContext} from '@/theme';
import {useDebug} from '@/debug/DebugContext';
import {tokenStorage} from '@/storage/tokenStorage';

export const DebugPanel: React.FC = () => {
  const {theme} = useThemeContext();
  const {lastRequestId} = useDebug();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    const [storedAccess, storedRefresh] = await Promise.all([
      tokenStorage.getAccessToken(),
      tokenStorage.getRefreshToken(),
    ]);
    setAccessToken(storedAccess);
    setRefreshToken(storedRefresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.roles.card.border,
          backgroundColor: theme.roles.card.background,
        },
      ]}
      accessible
      accessibilityLabel="Debug information">
      <View style={styles.headerRow}>
        <Text style={[styles.title, {color: theme.roles.text.primary}]}>Debug panel</Text>
        <TouchableOpacity onPress={loadTokens} accessibilityRole="button" accessibilityLabel="Reload tokens">
          <Text style={[styles.action, {color: theme.palette.primary.main}]}>{loading ? 'Refreshing…' : 'Reload'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.item}>
        <Text style={[styles.label, {color: theme.roles.text.secondary}]}>Last request ID</Text>
        <Text style={[styles.value, {color: theme.roles.text.primary}]} selectable>
          {lastRequestId ?? '—'}
        </Text>
      </View>
      <View style={styles.item}>
        <Text style={[styles.label, {color: theme.roles.text.secondary}]}>Access token</Text>
        <Text style={[styles.value, {color: theme.roles.text.primary}]} selectable numberOfLines={4}>
          {accessToken ?? '—'}
        </Text>
      </View>
      <View style={styles.item}>
        <Text style={[styles.label, {color: theme.roles.text.secondary}]}>Refresh token</Text>
        <Text style={[styles.value, {color: theme.roles.text.primary}]} selectable numberOfLines={4}>
          {refreshToken ?? '—'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
  },
  item: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    lineHeight: 18,
  },
});

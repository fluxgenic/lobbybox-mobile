import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ScreenContainer} from '@/components/ScreenContainer';
import {Button} from '@/components/Button';
import {useAuth} from '@/context/AuthContext';
import {AppStackParamList} from '@/navigation/AppNavigator';
import {useThemeContext} from '@/theme';
import {useNetworkStatus} from '@/hooks/useNetworkStatus';
import {fetchDailyParcelMetric} from '@/api/metrics';
import {metricsStorage} from '@/storage/metricsStorage';
import {OfflineBanner} from '@/components/OfflineBanner';
import {ParsedApiError, parseApiError} from '@/utils/error';
import {showErrorToast, showToast} from '@/utils/toast';

const getTodayIsoDate = () => new Date().toISOString().split('T')[0];

const formatUpdatedAt = (date: Date | null) => {
  if (!date) {
    return '—';
  }
  return date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {user, refreshProfile} = useAuth();
  const {theme} = useThemeContext();
  const {isOffline} = useNetworkStatus();

  const todayIso = getTodayIsoDate();
  const [dailyCount, setDailyCount] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ParsedApiError | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const propertyId = user?.property?.id ?? null;

  const loadCachedMetric = useCallback(async () => {
    const cached = await metricsStorage.getDailyParcelMetric(todayIso, propertyId);
    if (cached) {
      setDailyCount(cached.count);
      setLastUpdatedAt(cached.updatedAt ? new Date(cached.updatedAt) : null);
    } else {
      setDailyCount(null);
      setLastUpdatedAt(null);
    }
  }, [propertyId, todayIso]);

  useEffect(() => {
    setDailyCount(null);
    setLastUpdatedAt(null);
    setError(null);
    setHasLoadedOnce(false);
  }, [propertyId, todayIso]);

  const fetchMetric = useCallback(
    async ({suppressLoader, showErrors}: {suppressLoader?: boolean; showErrors?: boolean} = {}) => {
      if (isOffline) {
        await loadCachedMetric();
        if (showErrors) {
          showToast('Offline. Showing the most recent data.', {type: 'info'});
        }
        return;
      }

      if (!suppressLoader) {
        setLoading(true);
      }

      try {
        const response = await fetchDailyParcelMetric(todayIso, propertyId);
        const updatedAtIso = new Date().toISOString();
        setDailyCount(response.count);
        setLastUpdatedAt(new Date(updatedAtIso));
        setError(null);
        await metricsStorage.setDailyParcelMetric({
          ...response,
          propertyId,
          updatedAt: updatedAtIso,
        });
      } catch (err) {
        const parsed = parseApiError(err, 'Unable to load parcel metrics.');
        setError(parsed);
        if (showErrors) {
          showErrorToast(parsed);
        }
        await loadCachedMetric();
      } finally {
        if (!suppressLoader) {
          setLoading(false);
        }
      }
    },
    [isOffline, loadCachedMetric, propertyId, todayIso],
  );

  useEffect(() => {
    let isActive = true;
    const bootstrap = async () => {
      setLoading(true);
      await loadCachedMetric();
      await fetchMetric({suppressLoader: true});
      if (isActive) {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    };
    bootstrap();
    return () => {
      isActive = false;
    };
  }, [fetchMetric, loadCachedMetric, propertyId, todayIso]);

  useEffect(() => {
    if (!isOffline && hasLoadedOnce) {
      fetchMetric();
    }
  }, [fetchMetric, hasLoadedOnce, isOffline]);

  useEffect(() => {
    if (isOffline) {
      setError(null);
    }
  }, [isOffline]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce) {
        return;
      }
      fetchMetric({suppressLoader: true});
    }, [fetchMetric, hasLoadedOnce]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refreshProfile(), fetchMetric({suppressLoader: true, showErrors: true})]);
    setRefreshing(false);
  }, [fetchMetric, refreshProfile]);

  const handleRetry = useCallback(() => {
    fetchMetric({showErrors: true});
  }, [fetchMetric]);

  const handleOpenSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const todayLabel = useMemo(
    () => new Date(todayIso).toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'}),
    [todayIso],
  );

  const statusText = isOffline ? 'Offline — showing cached data' : 'Live data';
  const statusColor = isOffline ? theme.roles.status.error : theme.roles.status.success;

  return (
    <ScreenContainer>
      <View style={styles.wrapper}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.palette.primary.main}
              colors={[theme.palette.primary.main]}
            />
          }>
          <View style={styles.content}>
            {isOffline ? <OfflineBanner /> : null}
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: theme.roles.card.background,
                  borderColor: theme.roles.card.border,
                },
              ]}>
              <View style={styles.metricHeader}>
                <View>
                  <Text style={[styles.metricTitle, {color: theme.roles.text.secondary}]}>Today's parcels</Text>
                  <Text style={[styles.metricSubtitle, {color: theme.roles.text.secondary}]}>{todayLabel}</Text>
                </View>
                <View style={styles.metricValueWrapper}>
                  {loading ? (
                    <ActivityIndicator color={theme.palette.primary.main} accessibilityLabel="Loading metrics" />
                  ) : (
                    <Text style={[styles.metricValue, {color: theme.roles.text.primary}]}>{dailyCount ?? '—'}</Text>
                  )}
                </View>
              </View>
              <View style={styles.metricFooter}>
                <Text style={[styles.metricStatus, {color: statusColor}]}>{statusText}</Text>
                <Text style={[styles.metricUpdated, {color: theme.roles.text.secondary}]}>
                  Last updated {formatUpdatedAt(lastUpdatedAt)}
                </Text>
              </View>
              {error ? (
                <Text style={[styles.errorText, {color: theme.roles.status.error}]}>{error.message}</Text>
              ) : null}
            </View>
            {error ? (
              <Button
                title="Retry"
                onPress={handleRetry}
                variant="secondary"
                accessibilityLabel="Retry loading parcel metrics"
                style={styles.retryButton}
              />
            ) : null}
          </View>
        </ScrollView>
        <Button
          title="Go to Settings"
          onPress={handleOpenSettings}
          accessibilityLabel="Open settings"
          style={styles.settingsButton}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  metricCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 13,
  },
  metricValueWrapper: {
    minWidth: 64,
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  metricFooter: {
    marginTop: 16,
  },
  metricStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricUpdated: {
    fontSize: 13,
  },
  errorText: {
    marginTop: 16,
    fontSize: 13,
  },
  settingsButton: {
    marginTop: 24,
  },
  retryButton: {
    marginTop: 16,
  },
});

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
import {fetchDailyParcels} from '@/api/parcels';
import {ParcelSummary} from '@/api/types';
import {metricsStorage} from '@/storage/metricsStorage';
import {parcelsStorage} from '@/storage/parcelsStorage';
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

const formatReceivedAt = (receivedAt?: string | null) => {
  if (!receivedAt) {
    return '—';
  }
  const date = new Date(receivedAt);
  if (Number.isNaN(date.getTime())) {
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
  const [parcels, setParcels] = useState<ParcelSummary[]>([]);

  const propertyId = user?.property?.id ?? null;

  const loadCachedData = useCallback(async () => {
    const [cachedMetric, cachedParcels] = await Promise.all([
      metricsStorage.getDailyParcelMetric(todayIso, propertyId),
      parcelsStorage.getDailyParcels(todayIso, propertyId),
    ]);

    if (cachedMetric) {
      setDailyCount(cachedMetric.count);
      setLastUpdatedAt(cachedMetric.updatedAt ? new Date(cachedMetric.updatedAt) : null);
    } else {
      setDailyCount(null);
    }

    if (cachedParcels) {
      setParcels(cachedParcels.parcels);
      if (!cachedMetric) {
        setLastUpdatedAt(cachedParcels.updatedAt ? new Date(cachedParcels.updatedAt) : null);
      }
    } else {
      setParcels([]);
      if (!cachedMetric) {
        setLastUpdatedAt(null);
      }
    }
  }, [propertyId, todayIso]);

  useEffect(() => {
    setDailyCount(null);
    setLastUpdatedAt(null);
    setError(null);
    setHasLoadedOnce(false);
    setParcels([]);
  }, [propertyId, todayIso]);

  const fetchDashboardData = useCallback(
    async ({suppressLoader, showErrors}: {suppressLoader?: boolean; showErrors?: boolean} = {}) => {
      if (isOffline) {
        await loadCachedData();
        if (showErrors) {
          showToast('Offline. Showing the most recent data.', {type: 'info'});
        }
        return;
      }

      if (!suppressLoader) {
        setLoading(true);
      }

      try {
        const [metricResponse, parcelResponse] = await Promise.all([
          fetchDailyParcelMetric(todayIso, propertyId),
          fetchDailyParcels(todayIso, propertyId),
        ]);
        const updatedAtIso = new Date().toISOString();
        setDailyCount(metricResponse.count);
        setLastUpdatedAt(new Date(updatedAtIso));
        setParcels(parcelResponse);
        setError(null);
        await Promise.all([
          metricsStorage.setDailyParcelMetric({
            ...metricResponse,
            propertyId,
            updatedAt: updatedAtIso,
          }),
          parcelsStorage.setDailyParcels({
            date: todayIso,
            propertyId,
            updatedAt: updatedAtIso,
            parcels: parcelResponse,
          }),
        ]);
      } catch (err) {
        const parsed = parseApiError(err, 'Unable to load parcel data.');
        setError(parsed);
        if (showErrors) {
          showErrorToast(parsed);
        }
        await loadCachedData();
      } finally {
        if (!suppressLoader) {
          setLoading(false);
        }
      }
    },
    [isOffline, loadCachedData, propertyId, todayIso],
  );

  useEffect(() => {
    let isActive = true;
    const bootstrap = async () => {
      setLoading(true);
      await loadCachedData();
      await fetchDashboardData({suppressLoader: true});
      if (isActive) {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    };
    bootstrap();
    return () => {
      isActive = false;
    };
  }, [fetchDashboardData, loadCachedData, propertyId, todayIso]);

  useEffect(() => {
    if (!isOffline && hasLoadedOnce) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, hasLoadedOnce, isOffline]);

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
      fetchDashboardData({suppressLoader: true});
    }, [fetchDashboardData, hasLoadedOnce]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refreshProfile(), fetchDashboardData({suppressLoader: true, showErrors: true})]);
    setRefreshing(false);
  }, [fetchDashboardData, refreshProfile]);

  const handleRetry = useCallback(() => {
    fetchDashboardData({showErrors: true});
  }, [fetchDashboardData]);

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
            <View
              style={[
                styles.parcelCard,
                {
                  backgroundColor: theme.roles.card.background,
                  borderColor: theme.roles.card.border,
                },
              ]}>
              <Text style={[styles.parcelCardTitle, {color: theme.roles.text.primary}]}>Today's parcels</Text>
              {loading ? (
                <View style={styles.parcelLoadingWrapper}>
                  <ActivityIndicator color={theme.palette.primary.main} accessibilityLabel="Loading parcel details" />
                </View>
              ) : parcels.length === 0 ? (
                <Text style={[styles.parcelEmptyText, {color: theme.roles.text.secondary}]}>No parcels logged yet today.</Text>
              ) : (
                <View style={styles.parcelList}>
                  {parcels.map((parcel, index) => {
                    const metaItems = [
                      parcel.unit ? `Unit ${parcel.unit}` : null,
                      parcel.carrier ?? null,
                      `Received ${formatReceivedAt(parcel.receivedAt)}`,
                    ].filter((item): item is string => Boolean(item));

                    return (
                      <View
                        key={parcel.id}
                        style={[
                          styles.parcelItem,
                          index > 0 ? styles.parcelItemSpacing : null,
                          {
                            backgroundColor:
                              theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                            borderColor: theme.roles.card.border,
                          },
                        ]}>
                        <View style={styles.parcelItemHeader}>
                          <Text style={[styles.parcelRecipient, {color: theme.roles.text.primary}]} numberOfLines={1}>
                            {parcel.recipient}
                          </Text>
                          {parcel.status ? (
                            <Text style={[styles.parcelStatus, {color: theme.roles.text.secondary}]} numberOfLines={1}>
                              {parcel.status}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.parcelItemMeta}>
                          {metaItems.map((item, metaIndex) => (
                            <Text
                              key={`${parcel.id}_meta_${metaIndex}`}
                              style={[styles.parcelMetaText, {color: theme.roles.text.secondary}]}
                            >
                              {metaIndex > 0 ? '• ' : ''}
                              {item}
                            </Text>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
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
  parcelCard: {
    marginTop: 20,
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
  parcelCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  parcelLoadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  parcelEmptyText: {
    fontSize: 14,
  },
  parcelList: {
    marginTop: 4,
  },
  parcelItem: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  parcelItemSpacing: {
    marginTop: 12,
  },
  parcelItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parcelRecipient: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  parcelStatus: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  parcelItemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  parcelMetaText: {
    fontSize: 13,
    marginRight: 12,
    marginBottom: 4,
  },
});

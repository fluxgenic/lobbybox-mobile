import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';
import {useAuth} from '@/context/AuthContext';
import {useNetworkStatus} from '@/hooks/useNetworkStatus';
import {fetchParcelsForDate} from '@/api/parcels';
import {ParcelListItem} from '@/api/types';
import {parcelsStorage} from '@/storage/parcelsStorage';
import {OfflineBanner} from '@/components/OfflineBanner';
import {Button} from '@/components/Button';
import {parseApiError, ParsedApiError} from '@/utils/error';
import {showErrorToast, showToast} from '@/utils/toast';
import {parcelEvents} from '@/events/parcelEvents';

const getTodayIsoDate = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split('T')[0];
};

const formatTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
};

type PhotoPreviewState = {
  visible: boolean;
  uri: string | null;
  recipient?: string | null;
  tracking?: string | null;
};

export const HomeScreen: React.FC = () => {
  const {theme} = useThemeContext();
  const {user, refreshProfile} = useAuth();
  const {isOffline} = useNetworkStatus();
  const todayIso = getTodayIsoDate();
  const propertyId = user?.property?.id ?? user?.tenantId ?? null;
  const userId = user?.id ?? null;
  const propertyName = user?.property?.name?.trim() ?? user?.propertyName?.trim() ?? null;
  const propertyCode = user?.property?.code?.trim() ?? null;
  const propertyDisplay = propertyName ? (propertyCode ? `${propertyName} (${propertyCode})` : propertyName) : null;

  const [parcels, setParcels] = useState<ParcelListItem[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ParsedApiError | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<PhotoPreviewState>({visible: false, uri: null});

  const loadCachedData = useCallback(async () => {
    console.log('[HomeScreen] Loading cached parcels', {date: todayIso, propertyId});
    const cached = await parcelsStorage.getDailyParcels(todayIso, propertyId);
    if (cached) {
      setParcels(cached.parcels);
      setLastUpdatedAt(cached.updatedAt ? new Date(cached.updatedAt) : null);
    } else {
      setParcels([]);
      setLastUpdatedAt(null);
    }
  }, [propertyId, todayIso]);

  const fetchParcels = useCallback(
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
        const result = await fetchParcelsForDate(todayIso, propertyId, userId);
        const updatedAtIso = new Date().toISOString();
        setParcels(result);
        setLastUpdatedAt(new Date(updatedAtIso));
        setError(null);
        await parcelsStorage.setDailyParcels({
          date: todayIso,
          propertyId,
          updatedAt: updatedAtIso,
          parcels: result,
        });
      } catch (err) {
        const parsed = parseApiError(err, 'Unable to load parcels.');
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
    [isOffline, loadCachedData, propertyId, todayIso, userId],
  );

  useEffect(() => {
    setParcels([]);
    setLastUpdatedAt(null);
    setError(null);
    setHasLoadedOnce(false);
  }, [propertyId, todayIso]);

  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      setLoading(true);
      await loadCachedData();
      await fetchParcels({suppressLoader: true});
      if (isMounted) {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    };
    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [fetchParcels, loadCachedData]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce) {
        return;
      }
      fetchParcels({suppressLoader: true});
    }, [fetchParcels, hasLoadedOnce]),
  );

  useEffect(() => {
    if (!isOffline && hasLoadedOnce) {
      fetchParcels();
    }
  }, [fetchParcels, hasLoadedOnce, isOffline]);

  useEffect(() => {
    const unsubscribe = parcelEvents.subscribe(() => {
      fetchParcels({suppressLoader: true});
    });
    return unsubscribe;
  }, [fetchParcels]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refreshProfile(), fetchParcels({suppressLoader: true, showErrors: true})]);
    setRefreshing(false);
  }, [fetchParcels, refreshProfile]);

  const handleRetry = useCallback(() => {
    fetchParcels({showErrors: true});
  }, [fetchParcels]);

  const todayLabel = useMemo(
    () => new Date(todayIso).toLocaleDateString(undefined, {weekday: 'long', month: 'long', day: 'numeric'}),
    [todayIso],
  );

  const statusText = isOffline ? 'Offline — showing cached data' : 'Live data';
  const refreshDisabled = refreshing || loading;
  const summaryAccent = theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.2)';
  const summaryPill = theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.18)';
  const lastUpdatedLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})
    : '—';

  const openPhotoPreview = useCallback(
    (parcel: ParcelListItem) => {
      if (!parcel.photoUrl) {
        showToast('No photo available for this parcel.', {type: 'info'});
        return;
      }

      setPhotoPreview({
        visible: true,
        uri: parcel.photoUrl,
        recipient: parcel.recipientName,
        tracking: parcel.trackingNumber,
      });
    },
    [showToast],
  );

  const closePhotoPreview = useCallback(() => {
    setPhotoPreview(prev => ({...prev, visible: false}));
  }, []);

  const renderParcel = (parcel: ParcelListItem, index: number) => {
    const remarks = parcel.remarks?.trim();
    const tracking = parcel.trackingNumber?.trim();
    const recipient = parcel.recipientName?.trim();
    const parcelProperty = parcel.propertyName?.trim() || propertyDisplay || undefined;
    const mobileNumber = parcel.mobileNumber?.trim();
    const hasPhoto = Boolean(parcel.photoUrl);
    const loggedAt = formatTime(parcel.collectedAt ?? parcel.createdAt);
    const infoBackground = theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(16, 24, 40, 0.04)';
    const detailBackground = theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(16, 24, 40, 0.05)';

    const primaryInfo: {
      label: string;
      value: string;
      highlight?: boolean;
      span?: 'full';
    }[] = [
      {
        label: 'Name',
        value: recipient ?? 'Recipient not provided',
        span: 'full',
      },
      {
        label: 'Unit / Remarks',
        value: remarks ?? '—',
      },
      {
        label: 'Logged',
        value: loggedAt,
      },
      {
        label: 'Tracking #',
        value: tracking ?? '—',
        highlight: Boolean(tracking),
      },
    ];

    const secondaryDetails: {label: string; value: string}[] = [];
    if (parcelProperty) {
      secondaryDetails.push({label: 'Property', value: parcelProperty});
    }
    if (mobileNumber) {
      secondaryDetails.push({label: 'Contact', value: mobileNumber});
    }

    return (
      <View
        key={parcel.id}
        style={[
          styles.parcelCard,
          {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border},
          index > 0 ? styles.parcelSpacing : null,
        ]}>
        <View style={styles.primaryInfoGrid}>
          {primaryInfo.map(info => (
            <View
              key={`${info.label}-${info.value}`}
              style={[
                styles.primaryInfoItem,
                info.span === 'full' ? styles.primaryInfoFull : null,
                {
                  backgroundColor: infoBackground,
                  borderColor: theme.roles.card.border,
                },
              ]}>
              <Text style={[styles.infoLabel, {color: theme.roles.text.secondary}]}>{info.label}</Text>
              <Text
                style={[
                  styles.infoValue,
                  {color: theme.roles.text.primary},
                  info.highlight ? styles.infoValueHighlight : null,
                ]}>
                {info.value}
              </Text>
            </View>
          ))}
        </View>

        {secondaryDetails.length > 0 ? (
          <View style={styles.detailGrid}>
            {secondaryDetails.map(detail => (
              <View
                key={`${detail.label}-${detail.value}`}
                style={[
                  styles.detailPill,
                  {backgroundColor: detailBackground, borderColor: theme.roles.card.border},
                ]}>
                <Text style={[styles.detailLabel, {color: theme.roles.text.secondary}]}>{detail.label}</Text>
                <Text style={[styles.detailValue, {color: theme.roles.text.primary}]}>{detail.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.cardFooter, {borderTopColor: theme.roles.card.border}]}>
          {hasPhoto ? (
            <TouchableOpacity
              onPress={() => openPhotoPreview(parcel)}
              style={[styles.viewPhotoButton, {backgroundColor: detailBackground}]}
              accessibilityRole="button"
              accessibilityLabel={`View parcel photo${recipient ? ` for ${recipient}` : ''}`}>
              <Text style={[styles.viewPhotoText, {color: theme.palette.primary.main}]}>View photo</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.manualEntryText, {color: theme.roles.text.secondary}]}>Manual entry</Text>
          )}
          {parcel.collectedByUserId ? (
            <Text style={[styles.cardFooterMeta, {color: theme.roles.text.secondary}]}>Handled by guard</Text>
          ) : null}
        </View>
      </View>
    );
  };


  return (
    <ScreenContainer style={styles.screenContainer}>
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
              style={[styles.summaryCard, {backgroundColor: theme.palette.secondary.main}]}
            >
              <Text style={[styles.summaryTitle, {color: theme.palette.secondary.contrastText}]}>Today's parcels</Text>
              <Text style={[styles.summarySubtitle, {color: theme.palette.secondary.contrastText}]}>Monitor parcel activity for {todayLabel}.</Text>
              {propertyDisplay ? (
                <View style={[styles.summaryPropertyPill, {backgroundColor: summaryPill}]}> 
                  <Text style={[styles.summaryPropertyLabel, {color: theme.palette.secondary.contrastText}]}>Property</Text>
                  <Text style={[styles.summaryPropertyValue, {color: theme.palette.secondary.contrastText}]}>{propertyDisplay}</Text>
                </View>
              ) : null}
              <View style={styles.summaryMetricsList}>
                {[{label: 'Logged today', value: parcels.length, highlight: true},
                  {label: 'Status', value: statusText},
                  {label: 'Last updated', value: lastUpdatedLabel}].map(metric => (
                  <View
                    key={metric.label}
                    style={[styles.summaryMetricRow, metric.highlight ? {backgroundColor: summaryAccent} : null]}
                  >
                    <Text style={[styles.summaryMetricLabel, {color: theme.palette.secondary.contrastText}]}>
                      {metric.label}
                    </Text>
                    <Text
                      style={[
                        styles.summaryMetricValue,
                        metric.highlight ? styles.summaryMetricValueHighlight : null,
                        {color: theme.palette.secondary.contrastText},
                      ]}>
                      {metric.value}
                    </Text>
                  </View>
                ))}
              </View>
              {error ? (
                <View style={[styles.summaryErrorCard, {borderColor: summaryAccent}]}> 
                  <Text style={[styles.summaryErrorText, {color: theme.palette.secondary.contrastText}]}>{error.message}</Text>
                  <Button title="Retry" onPress={handleRetry} variant="secondary" style={styles.summaryRetryButton} />
                </View>
              ) : null}
              <View style={styles.summaryActions}>
                <TouchableOpacity
                  onPress={handleRefresh}
                  style={[
                    styles.summaryActionButton,
                    {borderColor: summaryAccent, opacity: refreshDisabled ? 0.7 : 1},
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh today's parcels"
                  disabled={refreshDisabled}
                >
                  {refreshing ? (
                    <ActivityIndicator
                      color={theme.palette.secondary.contrastText}
                      style={styles.summaryActionSpinner}
                    />
                  ) : null}
                  <Text style={[styles.summaryActionText, {color: theme.palette.secondary.contrastText}]}>
                    {refreshing ? 'Refreshing…' : 'Refresh now'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, {color: theme.roles.text.primary}]}>Activity</Text>
              {loading ? <ActivityIndicator color={theme.palette.primary.main} /> : null}
            </View>
            {loading && parcels.length === 0 ? (
              <View style={styles.loaderWrapper}>
                <ActivityIndicator color={theme.palette.primary.main} />
              </View>
            ) : parcels.length === 0 ? (
              <Text style={[styles.emptyText, {color: theme.roles.text.secondary}]}>No parcels logged yet today.</Text>
            ) : (
              <View style={styles.parcelList}>{parcels.map(renderParcel)}</View>
            )}
          </View>
        </ScrollView>
      </View>
      <Modal
        visible={photoPreview.visible}
        transparent
        animationType="fade"
        onRequestClose={closePhotoPreview}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, {backgroundColor: theme.roles.card.background}]}> 
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={[styles.modalTitle, {color: theme.roles.text.primary}]}>Parcel photo</Text>
              {photoPreview.recipient ? (
                <Text style={[styles.modalMeta, {color: theme.roles.text.secondary}]}>Recipient: {photoPreview.recipient}</Text>
              ) : null}
              {photoPreview.tracking ? (
                <Text style={[styles.modalMeta, {color: theme.roles.text.secondary}]}>Tracking #: {photoPreview.tracking}</Text>
              ) : null}
              {photoPreview.uri ? (
                <Image source={{uri: photoPreview.uri}} style={styles.modalImage} resizeMode="contain" />
              ) : (
                <Text style={[styles.modalMeta, {color: theme.roles.status.error}]}>Photo unavailable</Text>
              )}
            </ScrollView>
            <Button title="Close" onPress={closePhotoPreview} style={styles.modalButton} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    paddingTop: 8,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 10,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  summarySubtitle: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  summaryPropertyPill: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  summaryPropertyLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.85,
  },
  summaryPropertyValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  summaryMetricsList: {
    marginTop: 16,
  },
  summaryMetricRow: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryMetricLabel: {
    fontSize: 13,
    opacity: 0.85,
  },
  summaryMetricValue: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  summaryMetricValueHighlight: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryErrorCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  summaryErrorText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryRetryButton: {
    alignSelf: 'flex-start',
  },
  summaryActions: {
    marginTop: 16,
    flexDirection: 'row',
  },
  summaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
  },
  summaryActionSpinner: {
    marginRight: 8,
  },
  summaryActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  loaderWrapper: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  parcelList: {
    marginTop: 4,
  },
  parcelCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  parcelSpacing: {
    marginTop: 16,
  },
  primaryInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  primaryInfoItem: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 4,
    flexBasis: '48%',
    flexGrow: 1,
  },
  primaryInfoFull: {
    flexBasis: '100%',
  },
  infoLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  infoValueHighlight: {
    fontWeight: '700',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  detailPill: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 12,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: '48%',
    flexGrow: 1,
    flexBasis: '48%',
  },
  detailLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginRight: 12,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
    flexShrink: 1,
    textAlign: 'right',
  },
  detailValueHighlight: {
    fontWeight: '700',
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewPhotoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  manualEntryText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  cardFooterMeta: {
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalScrollContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalMeta: {
    fontSize: 14,
    marginBottom: 8,
  },
  modalImage: {
    width: 260,
    height: 260,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: 'black',
  },
  modalButton: {
    marginTop: 16,
  },
});

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
  const statusColor = isOffline ? theme.roles.status.error : theme.roles.status.success;

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
    const propertyName = parcel.propertyName?.trim();
    const mobileNumber = parcel.mobileNumber?.trim();
    const hasPhoto = Boolean(parcel.photoUrl);

    return (
      <View
        key={parcel.id}
        style={[
          styles.parcelItem,
          {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border},
          index > 0 ? styles.parcelSpacing : null,
        ]}>
        <View style={styles.parcelHeader}>
          <Text style={[styles.parcelTime, {color: theme.roles.text.secondary}]}>Collected {formatTime(parcel.collectedAt)}</Text>
          {hasPhoto ? (
            <TouchableOpacity onPress={() => openPhotoPreview(parcel)} accessibilityRole="button">
              <Text style={[styles.viewPhoto, {color: theme.palette.primary.main}]}>View photo</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.parcelManualTag, {color: theme.roles.text.secondary}]}>Manual entry</Text>
          )}
        </View>
        {propertyName ? (
          <Text style={[styles.parcelMeta, {color: theme.roles.text.primary}]}>Property: {propertyName}</Text>
        ) : null}
        {tracking ? (
          <Text style={[styles.parcelPrimary, {color: theme.roles.text.primary}]}>Tracking #: {tracking}</Text>
        ) : null}
        {recipient ? (
          <Text style={[styles.parcelPrimary, {color: theme.roles.text.primary}]}>Recipient: {recipient}</Text>
        ) : null}
        {mobileNumber ? (
          <Text style={[styles.parcelPrimary, {color: theme.roles.text.primary}]}>Contact: {mobileNumber}</Text>
        ) : null}
        {remarks ? (
          <Text style={[styles.parcelRemarks, {color: theme.roles.text.secondary}]}>Remarks: {remarks}</Text>
        ) : null}
      </View>
    );
  };

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
              style={[styles.summaryCard, {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border}]}
            >
              <Text style={[styles.summaryTitle, {color: theme.roles.text.primary}]}>Today's parcels</Text>
              <Text style={[styles.summarySubtitle, {color: theme.roles.text.secondary}]}>{todayLabel}</Text>
              <View style={styles.summaryMetaRow}>
                <Text style={[styles.summaryMeta, {color: statusColor}]}>{statusText}</Text>
                <Text style={[styles.summaryMeta, {color: theme.roles.text.secondary}]}>Last updated {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}) : '—'}</Text>
              </View>
              {error ? (
                <Text style={[styles.summaryError, {color: theme.roles.status.error}]}>{error.message}</Text>
              ) : null}
              <View style={styles.summaryFooter}>
                <Text style={[styles.summaryCount, {color: theme.roles.text.primary}]}>{parcels.length}</Text>
                <Text style={[styles.summaryCountLabel, {color: theme.roles.text.secondary}]}>parcels logged today</Text>
              </View>
              {error ? (
                <Button title="Retry" onPress={handleRetry} variant="secondary" style={styles.retryButton} />
              ) : null}
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
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  summarySubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  summaryMeta: {
    fontSize: 13,
  },
  summaryError: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryFooter: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryCount: {
    fontSize: 36,
    fontWeight: '700',
    marginRight: 8,
  },
  summaryCountLabel: {
    fontSize: 14,
  },
  retryButton: {
    marginTop: 16,
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
  },
  parcelList: {
    marginTop: 4,
  },
  parcelItem: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  parcelSpacing: {
    marginTop: 12,
  },
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parcelTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewPhoto: {
    fontSize: 13,
    fontWeight: '600',
  },
  parcelManualTag: {
    fontSize: 13,
    fontWeight: '600',
  },
  parcelPrimary: {
    fontSize: 15,
    marginTop: 4,
  },
  parcelMeta: {
    fontSize: 14,
    marginTop: 4,
  },
  parcelRemarks: {
    fontSize: 14,
    marginTop: 8,
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

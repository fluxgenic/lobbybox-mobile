import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';
import {useAuth} from '@/context/AuthContext';
import {fetchParcelHistory, refreshParcelPhotoReadUrl} from '@/api/parcels';
import {ParcelListItem} from '@/api/types';
import {Button} from '@/components/Button';
import {parseApiError, ParsedApiError} from '@/utils/error';

const HISTORY_PAGE_SIZE = 20;

type PhotoPreviewState = {
  visible: boolean;
  loading: boolean;
  sourceUrl: string | null;
  uri: string | null;
  recipient?: string;
  tracking?: string;
  error: ParsedApiError | null;
};

const initialPreviewState: PhotoPreviewState = {
  visible: false,
  loading: false,
  sourceUrl: null,
  uri: null,
  recipient: undefined,
  tracking: undefined,
  error: null,
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const datePart = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
  return `${datePart} · ${timePart}`;
};

export const HistoryScreen: React.FC = () => {
  const {theme} = useThemeContext();
  const {user} = useAuth();
  const propertyId = user?.property?.id ?? user?.tenantId ?? null;
  const propertyName = user?.property?.name ?? user?.propertyName ?? undefined;

  const [entries, setEntries] = useState<ParcelListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<ParsedApiError | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [photoPreview, setPhotoPreview] = useState<PhotoPreviewState>(initialPreviewState);

  const loadingRef = useRef({initial: false, refresh: false, append: false});

  const beginLoading = useCallback((mode: 'initial' | 'refresh' | 'append'): boolean => {
    const next = {...loadingRef.current};
    if (next[mode]) {
      return false;
    }
    next[mode] = true;
    loadingRef.current = next;
    if (mode === 'initial') {
      setLoading(true);
    } else if (mode === 'refresh') {
      setRefreshing(true);
    } else {
      setLoadingMore(true);
    }
    return true;
  }, []);

  const endLoading = useCallback((mode: 'initial' | 'refresh' | 'append') => {
    loadingRef.current = {...loadingRef.current, [mode]: false};
    if (mode === 'initial') {
      setLoading(false);
    } else if (mode === 'refresh') {
      setRefreshing(false);
    } else {
      setLoadingMore(false);
    }
  }, []);

  const loadPage = useCallback(
    async (targetPage: number, mode: 'initial' | 'refresh' | 'append' = 'initial') => {
      if (!propertyId) {
        return;
      }
      if (!beginLoading(mode)) {
        return;
      }

      try {
        const response = await fetchParcelHistory({
          propertyId,
          page: targetPage,
          pageSize: HISTORY_PAGE_SIZE,
        });

        let nextCount = 0;
        setEntries(prev => {
          if (mode === 'append') {
            const existing = new Map(prev.map(item => [item.id, item]));
            response.data.forEach(item => {
              existing.set(item.id, item);
            });
            const merged = Array.from(existing.values());
            nextCount = merged.length;
            return merged;
          }
          nextCount = response.data.length;
          return response.data;
        });

        const resolvedPage = response.page ?? targetPage;
        const resolvedPageSize = response.pageSize ?? HISTORY_PAGE_SIZE;
        const totalCount =
          typeof response.total === 'number' && Number.isFinite(response.total)
            ? response.total
            : null;
        const hasAdditionalPages =
          totalCount !== null ? nextCount < totalCount : response.data.length >= resolvedPageSize;

        setHasMore(hasAdditionalPages);
        setPage(resolvedPage);
        setTotal(totalCount);
        setError(null);
        setHasLoadedOnce(true);
        setLastUpdatedAt(new Date());
      } catch (err) {
        const parsed = parseApiError(err, 'Unable to load history.');
        setError(parsed);
      } finally {
        endLoading(mode);
      }
    },
    [beginLoading, endLoading, propertyId],
  );

  useEffect(() => {
    loadingRef.current = {initial: false, refresh: false, append: false};
    setEntries([]);
    setPage(1);
    setTotal(null);
    setHasMore(false);
    setError(null);
    setHasLoadedOnce(false);
    setLastUpdatedAt(null);
    setPhotoPreview(initialPreviewState);

    if (propertyId) {
      loadPage(1, 'initial');
    } else {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [loadPage, propertyId]);

  const handleRefresh = useCallback(() => {
    if (!propertyId) {
      return;
    }
    loadPage(1, 'refresh');
  }, [loadPage, propertyId]);

  const handleLoadMore = useCallback(() => {
    if (!propertyId || !hasMore || loadingMore) {
      return;
    }
    loadPage(page + 1, 'append');
  }, [hasMore, loadPage, loadingMore, page, propertyId]);

  const handleRetry = useCallback(() => {
    if (!propertyId) {
      return;
    }
    loadPage(1, entries.length > 0 ? 'refresh' : 'initial');
  }, [entries.length, loadPage, propertyId]);

  const loadPhotoPreview = useCallback(
    async (photoUrl: string) => {
      try {
        const refreshedUrl = await refreshParcelPhotoReadUrl(photoUrl);
        setPhotoPreview(prev => ({...prev, loading: false, uri: refreshedUrl, error: null}));
      } catch (err) {
        const parsed = parseApiError(err, 'Unable to load photo.');
        setPhotoPreview(prev => ({...prev, loading: false, uri: null, error: parsed}));
      }
    },
    [],
  );

  const handleViewPhoto = useCallback(
    (parcel: ParcelListItem) => {
      const trimmedPhotoUrl = parcel.photoUrl?.trim();
      if (!trimmedPhotoUrl) {
        return;
      }

      setPhotoPreview({
        visible: true,
        loading: true,
        sourceUrl: trimmedPhotoUrl,
        uri: null,
        recipient: parcel.recipientName?.trim() || undefined,
        tracking: parcel.trackingNumber?.trim() || undefined,
        error: null,
      });
      loadPhotoPreview(trimmedPhotoUrl);
    },
    [loadPhotoPreview],
  );

  const handleRetryPreview = useCallback(() => {
    if (!photoPreview.sourceUrl) {
      return;
    }
    setPhotoPreview(prev => ({...prev, loading: true, uri: null, error: null}));
    loadPhotoPreview(photoPreview.sourceUrl);
  }, [loadPhotoPreview, photoPreview.sourceUrl]);

  const closePhotoPreview = useCallback(() => {
    setPhotoPreview(initialPreviewState);
  }, []);

  const listHeader = useMemo(() => {
    const accent = theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.22)';
    const pillAccent = theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.18)';
    const refreshDisabled = refreshing || loading;
    const lastUpdatedLabel = lastUpdatedAt
      ? `${lastUpdatedAt.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })} · ${lastUpdatedAt.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}`
      : '—';

    return (
      <View style={styles.header}>
        <View style={[styles.overviewCard, {backgroundColor: theme.palette.primary.main}]}> 
          <Text style={[styles.overviewTitle, {color: theme.roles.text.onPrimary}]}>Parcel history</Text>
          <Text style={[styles.overviewSubtitle, {color: theme.roles.text.onPrimary}]}>Review previously logged parcels and keep track of handovers.</Text>
          {propertyName ? (
            <View style={[styles.overviewPropertyPill, {backgroundColor: pillAccent}]}> 
              <Text style={[styles.overviewPropertyLabel, {color: theme.roles.text.onPrimary}]}>Property</Text>
              <Text style={[styles.overviewPropertyValue, {color: theme.roles.text.onPrimary}]}>{propertyName}</Text>
            </View>
          ) : null}
          <View style={styles.overviewMetricsList}>
            {[{label: 'Total records', value: total !== null ? total.toLocaleString() : '—', highlight: true},
              {label: 'Showing now', value: entries.length.toLocaleString()},
              {label: 'Last updated', value: lastUpdatedLabel}].map(metric => (
              <View
                key={metric.label}
                style={[styles.overviewMetricRow, metric.highlight ? {backgroundColor: accent} : null]}
              >
                <Text style={[styles.overviewMetricLabel, {color: theme.roles.text.onPrimary}]}>{metric.label}</Text>
                <Text
                  style={[
                    styles.overviewMetricValue,
                    metric.highlight ? styles.overviewMetricValueHighlight : null,
                    {color: theme.roles.text.onPrimary},
                  ]}>
                  {metric.value}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.overviewActions}>
            <TouchableOpacity
              onPress={handleRefresh}
              style={[
                styles.headerActionButton,
                {borderColor: accent, opacity: refreshDisabled ? 0.6 : 1},
              ]}
              accessibilityRole="button"
              accessibilityLabel="Refresh parcel history"
              disabled={refreshDisabled}>
              {refreshing ? (
                <ActivityIndicator color={theme.roles.text.onPrimary} style={styles.headerActionSpinner} />
              ) : null}
              <Text style={[styles.headerActionText, {color: theme.roles.text.onPrimary}]}>
                {refreshing ? 'Refreshing…' : 'Refresh now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {error && entries.length > 0 ? (
          <View
            style={[
              styles.errorCard,
              {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border},
            ]}>
            <Text style={[styles.errorText, {color: theme.roles.status.error}]}>{error.message}</Text>
            <Button title="Retry" onPress={handleRetry} style={styles.retryButton} variant="secondary" />
          </View>
        ) : null}
      </View>
    );
  }, [entries.length, error, handleRefresh, handleRetry, lastUpdatedAt, loading, propertyName, refreshing, theme, total]);

  const listEmpty = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color={theme.palette.primary.main} />
        </View>
      );
    }

    if (!propertyId) {
      return (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, {color: theme.roles.text.secondary}]}>Assign a property to view parcel history.</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, {color: theme.roles.status.error}]}>{error.message}</Text>
          <Button title="Retry" onPress={handleRetry} style={styles.retryButton} variant="secondary" />
        </View>
      );
    }

    if (hasLoadedOnce) {
      return (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, {color: theme.roles.text.secondary}]}>No parcel history found yet.</Text>
        </View>
      );
    }

    return null;
  }, [error, handleRetry, hasLoadedOnce, loading, propertyId, theme]);

  const renderItem = useCallback<ListRenderItem<ParcelListItem>>(
    ({item}) => {
      const tracking = item.trackingNumber?.trim();
      const recipient = item.recipientName?.trim();
      const remarks = item.remarks?.trim();
      const contact = item.mobileNumber?.trim();
      const collectedAt = formatDateTime(item.collectedAt ?? item.createdAt);
      const property = item.propertyName?.trim() || propertyName;
      const tenantName = item.tenantName?.trim();
      const trimmedPhotoUrl = item.photoUrl?.trim() ?? '';
      const hasPhoto = trimmedPhotoUrl.length > 0;
      const isPreviewLoading =
        photoPreview.visible && photoPreview.sourceUrl === trimmedPhotoUrl && photoPreview.loading;

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
          value: collectedAt,
        },
        {
          label: 'Tracking #',
          value: tracking ?? '—',
          highlight: Boolean(tracking),
        },
      ];

      const secondaryDetails: {label: string; value: string; highlight?: boolean}[] = [];
      if (property) {
        secondaryDetails.push({label: 'Property', value: property});
      }
      if (contact) {
        secondaryDetails.push({label: 'Contact', value: contact});
      }
      if (tenantName) {
        secondaryDetails.push({label: 'Tenant', value: tenantName});
      }

      return (
        <View
          style={[
            styles.card,
            {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border},
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
                  <Text
                    style={[
                      styles.detailValue,
                      {color: theme.roles.text.primary},
                      detail.highlight ? styles.detailValueHighlight : null,
                    ]}>
                    {detail.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={[styles.cardFooter, {borderTopColor: theme.roles.card.border}]}>
            {hasPhoto ? (
              <TouchableOpacity
                onPress={() => handleViewPhoto(item)}
                style={[styles.viewPhotoButton, {backgroundColor: detailBackground}]}
                accessibilityRole="button"
                accessibilityLabel={`View parcel photo${recipient ? ` for ${recipient}` : ''}`}>
                {isPreviewLoading ? (
                  <ActivityIndicator color={theme.palette.primary.main} style={styles.viewPhotoSpinner} />
                ) : null}
                <Text style={[styles.viewPhotoText, {color: theme.palette.primary.main}]}>View photo</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.manualEntryText, {color: theme.roles.text.secondary}]}>Manual entry</Text>
            )}
            {item.collectedByUserId ? (
              <Text style={[styles.cardFooterMeta, {color: theme.roles.text.secondary}]}>Handled by guard</Text>
            ) : null}
          </View>
        </View>
      );
    },
    [handleViewPhoto, photoPreview.loading, photoPreview.sourceUrl, photoPreview.visible, propertyName, theme],
  );

  const listFooter = useMemo(() => {
    if (!loadingMore) {
      return null;
    }
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator color={theme.palette.primary.main} />
      </View>
    );
  }, [loadingMore, theme.palette.primary.main]);

  return (
    <ScreenContainer>
      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.palette.primary.main}
            colors={[theme.palette.primary.main]}
          />
        }
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        onEndReachedThreshold={0.2}
        onEndReached={handleLoadMore}
      />
      <Modal visible={photoPreview.visible} transparent animationType="fade" onRequestClose={closePhotoPreview}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalContent,
              {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border},
            ]}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={[styles.modalTitle, {color: theme.roles.text.primary}]}>Parcel photo</Text>
              {photoPreview.recipient ? (
                <Text style={[styles.modalMeta, {color: theme.roles.text.secondary}]}>Recipient: {photoPreview.recipient}</Text>
              ) : null}
              {photoPreview.tracking ? (
                <Text style={[styles.modalMeta, {color: theme.roles.text.secondary}]}>Tracking #: {photoPreview.tracking}</Text>
              ) : null}
              {photoPreview.loading ? (
                <View style={styles.modalLoader}>
                  <ActivityIndicator color={theme.palette.primary.main} />
                </View>
              ) : photoPreview.uri ? (
                <Image source={{uri: photoPreview.uri}} style={styles.modalImage} resizeMode="contain" />
              ) : photoPreview.error ? (
                <Text style={[styles.modalError, {color: theme.roles.status.error}]}>{photoPreview.error.message}</Text>
              ) : (
                <Text style={[styles.modalError, {color: theme.roles.status.error}]}>Photo unavailable</Text>
              )}
            </ScrollView>
            <View
              style={[
                styles.modalButtonRow,
                {borderTopColor: theme.roles.card.border, backgroundColor: theme.roles.card.background},
              ]}>
              {photoPreview.error ? (
                <Button title="Retry" onPress={handleRetryPreview} variant="secondary" style={styles.modalRetryButton} />
              ) : null}
              <Button title="Close" onPress={closePhotoPreview} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 48,
    paddingLeft:10,
    paddingRight:10
  },
  header: {
    marginBottom: 24,
  },
  overviewCard: {
    borderRadius: 20,
    padding: 20,
  },
  overviewTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  overviewSubtitle: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  overviewPropertyPill: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  overviewPropertyLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.8,
  },
  overviewPropertyValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  overviewMetricsList: {
    marginTop: 16,
  },
  overviewMetricRow: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewMetricLabel: {
    fontSize: 13,
    opacity: 0.85,
  },
  overviewMetricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  overviewMetricValueHighlight: {
    fontSize: 22,
    fontWeight: '700',
  },
  overviewActions: {
    marginTop: 12,
    flexDirection: 'row',
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
  },
  headerActionSpinner: {
    marginRight: 8,
  },
  headerActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
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
  viewPhotoSpinner: {
    marginRight: 8,
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
  separator: {
    height: 16,
  },
  footerLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalScrollContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalMeta: {
    fontSize: 14,
    marginTop: 8,
  },
  modalLoader: {
    marginTop: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: 320,
    marginTop: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  modalError: {
    marginTop: 32,
    fontSize: 14,
    textAlign: 'center',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
  },
  modalRetryButton: {
    marginRight: 12,
  },
});

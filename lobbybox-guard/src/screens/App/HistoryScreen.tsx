import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';
import {useAuth} from '@/context/AuthContext';
import {fetchParcelHistory} from '@/api/parcels';
import {ParcelListItem} from '@/api/types';
import {Button} from '@/components/Button';
import {parseApiError, ParsedApiError} from '@/utils/error';

const HISTORY_PAGE_SIZE = 20;

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

  const listHeader = useMemo(() => {
    return (
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.roles.text.primary}]}>History</Text>
        <Text style={[styles.subtitle, {color: theme.roles.text.secondary}]}>Review previous parcel logs.</Text>
        {propertyName ? (
          <Text style={[styles.propertyLabel, {color: theme.roles.text.secondary}]}>Property: {propertyName}</Text>
        ) : null}
        {total !== null ? (
          <Text style={[styles.totalLabel, {color: theme.roles.text.secondary}]}>Total records: {total}</Text>
        ) : null}
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
  }, [entries.length, error, handleRetry, propertyName, theme, total]);

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
      const details: {label: string; value: string}[] = [];

      if (property) {
        details.push({label: 'Property', value: property});
      }
      if (remarks) {
        details.push({label: 'Unit / Remarks', value: remarks});
      }
      if (contact) {
        details.push({label: 'Contact', value: contact});
      }
      if (!tracking && item.trackingNumber?.trim()) {
        details.push({label: 'Tracking', value: item.trackingNumber.trim()});
      }

      return (
        <View
          style={[
            styles.card,
            {backgroundColor: theme.roles.card.background, borderColor: theme.roles.card.border},
          ]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <Text style={[styles.cardTitle, {color: theme.roles.text.primary}]}>
                {recipient ?? 'Recipient not provided'}
              </Text>
              {tracking ? (
                <View
                  style={[styles.badge, {backgroundColor: theme.palette.primary.main}]}
                  accessible
                  accessibilityLabel={`Tracking number ${tracking}`}>
                  <Text style={[styles.badgeText, {color: theme.roles.text.onPrimary}]}>Tracking #{tracking}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.timestamp, {color: theme.roles.text.secondary}]}>{collectedAt}</Text>
          </View>
          {details.length > 0 ? (
            <View style={styles.cardBody}>
              {details.map((detail, index) => (
                <View
                  key={`${detail.label}-${index}`}
                  style={[styles.infoRow, index === details.length - 1 ? styles.infoRowLast : null]}>
                  <Text style={[styles.infoLabel, {color: theme.roles.text.secondary}]}>{detail.label}</Text>
                  <Text style={[styles.infoValue, {color: theme.roles.text.primary}]}>{detail.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      );
    },
    [propertyName, theme],
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
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    lineHeight: 22,
  },
  propertyLabel: {
    marginTop: 12,
    fontSize: 13,
  },
  totalLabel: {
    marginTop: 4,
    fontSize: 13,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleGroup: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  timestamp: {
    fontSize: 12,
    textAlign: 'right',
  },
  cardBody: {
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  infoRowLast: {
    marginBottom: 0,
  },
  infoLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
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
    borderRadius: 12,
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
});

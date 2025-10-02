import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import {useInfiniteQuery} from '@tanstack/react-query';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';
import {fetchParcelsPage} from '@/api/parcels';
import {Parcel, ParcelQueryParams} from '@/api/types';
import {useAuth} from '@/hooks/useAuth';
import {Button} from '@/components/Button';
import {useParcelQueue} from '@/hooks/useParcelQueue';

const PAGE_SIZE = 20;

const formatTimestamp = (value: string) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('MMM D, YYYY • HH:mm') : value;
};

type FilterForm = {
  from: string;
  to: string;
  q: string;
};

type ParcelListItem = Parcel;

type QueueListItemProps = {
  label: string;
  status: string;
  subtitle?: string | null;
  createdAt: string;
  onRetry?: () => void;
};

const QueueListItem: React.FC<QueueListItemProps> = ({label, status, subtitle, createdAt, onRetry}) => {
  const {theme} = useThemeContext();
  return (
    <View style={[styles.queueItem, {borderColor: theme.colors.border}]}> 
      <View style={styles.queueItemHeader}>
        <Text style={[styles.queueItemLabel, {color: theme.colors.text}]}>{label}</Text>
        <Text style={[styles.queueItemStatus, {color: theme.colors.secondary}]}>{status}</Text>
      </View>
      <Text style={{color: theme.colors.muted, marginBottom: subtitle ? 8 : 0}}>{formatTimestamp(createdAt)}</Text>
      {subtitle ? <Text style={{color: theme.colors.muted, marginBottom: 12}}>{subtitle}</Text> : null}
      {onRetry ? (
        <Button title="Retry" variant="secondary" onPress={onRetry} style={styles.queueRetryButton} />
      ) : null}
    </View>
  );
};

const ParcelHistoryCard: React.FC<{parcel: ParcelListItem}> = ({parcel}) => {
  const {theme} = useThemeContext();
  return (
    <View style={[styles.card, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}> 
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, {color: theme.colors.text}]}>{parcel.recipientName ?? 'Parcel'}</Text>
        {parcel.trackingNumber ? (
          <Text style={{color: theme.colors.muted}}>#{parcel.trackingNumber}</Text>
        ) : null}
      </View>
      {parcel.remarks ? <Text style={{color: theme.colors.muted, marginBottom: 8}}>{parcel.remarks}</Text> : null}
      <Text style={{color: theme.colors.text}}>{formatTimestamp(parcel.createdAt)}</Text>
    </View>
  );
};

export const HistoryScreen: React.FC = () => {
  const {theme} = useThemeContext();
  const {property, refreshProfile} = useAuth();
  const {items: queueItems, retry: retryQueueItem, isOnline} = useParcelQueue();
  const propertyId = property?.propertyId;

  const [form, setForm] = useState<FilterForm>({from: '', to: '', q: ''});
  const [filters, setFilters] = useState<FilterForm>(form);

  const onChangeField = useCallback(
    (key: keyof FilterForm, value: string) => {
      setForm(prev => ({...prev, [key]: value}));
    },
    [],
  );

  const handleApplyFilters = useCallback(() => {
    setFilters(form);
  }, [form]);

  const handleClearFilters = useCallback(() => {
    const cleared = {from: '', to: '', q: ''};
    setForm(cleared);
    setFilters(cleared);
  }, []);

  const queryKey = useMemo(
    () => ['parcels-history', propertyId, filters.from, filters.to, filters.q],
    [filters.from, filters.to, filters.q, propertyId],
  );

  const parcelsQuery = useInfiniteQuery({
    queryKey,
    enabled: Boolean(propertyId),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    queryFn: async ({pageParam}) => {
      const params: ParcelQueryParams = {
        page: pageParam,
        pageSize: PAGE_SIZE,
        propertyId: propertyId ?? undefined,
      };
      if (filters.from) {
        params.from = filters.from;
      }
      if (filters.to) {
        params.to = filters.to;
      }
      if (filters.q) {
        params.q = filters.q;
      }
      return fetchParcelsPage(params);
    },
  });

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
  } = parcelsQuery;

  const parcels = useMemo(() => data?.pages.flatMap(page => page.items) ?? [], [data]);

  const isRefreshing = isFetching && !isLoading && !isFetchingNextPage;

  const errorMessage = useMemo(() => {
    if (!error) {
      return null;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unable to load history. Please try again later.';
  }, [error]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderParcel = useCallback(({item}: {item: ParcelListItem}) => <ParcelHistoryCard parcel={item} />, []);

  const queuedItems = useMemo(
    () => queueItems.filter(item => item.status === 'queued' || item.status === 'uploading'),
    [queueItems],
  );
  const failedItems = useMemo(() => queueItems.filter(item => item.status === 'failed'), [queueItems]);

  if (!propertyId) {
    return (
      <ScreenContainer>
        <View style={styles.messageContainer}>
          <Text style={[styles.heading, {color: theme.colors.text}]}>History</Text>
          <Text style={[styles.messageTitle, {color: theme.colors.text}]}>Property assignment required</Text>
          <Text style={[styles.messageBody, {color: theme.colors.muted}]}>We couldn't find an assigned property for your account. Please contact your administrator or try refreshing your assignment.</Text>
          <Button title="Retry assignment" onPress={() => refreshProfile()} />
        </View>
      </ScreenContainer>
    );
  }

  const ListHeaderComponent = (
    <View>
      <Text style={[styles.heading, {color: theme.colors.text}]}>
        History{property?.propertyName ? ` · ${property.propertyName}` : ''}
      </Text>
      <View style={[styles.filterCard, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}> 
        <Text style={[styles.filterTitle, {color: theme.colors.text}]}>Filters</Text>
        <View style={styles.filterRow}>
          <View style={[styles.filterField, styles.filterFieldSpacing]}>
            <Text style={[styles.filterLabel, {color: theme.colors.muted}]}>From</Text>
            <TextInput
              value={form.from}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.muted}
              onChangeText={value => onChangeField('from', value)}
              style={[styles.input, {color: theme.colors.text, borderColor: theme.colors.border}]}
            />
          </View>
          <View style={styles.filterField}>
            <Text style={[styles.filterLabel, {color: theme.colors.muted}]}>To</Text>
            <TextInput
              value={form.to}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.muted}
              onChangeText={value => onChangeField('to', value)}
              style={[styles.input, {color: theme.colors.text, borderColor: theme.colors.border}]}
            />
          </View>
        </View>
        <View style={styles.filterField}>
          <Text style={[styles.filterLabel, {color: theme.colors.muted}]}>Search</Text>
          <TextInput
            value={form.q}
            placeholder="Recipient or tracking"
            placeholderTextColor={theme.colors.muted}
            onChangeText={value => onChangeField('q', value)}
            style={[styles.input, {color: theme.colors.text, borderColor: theme.colors.border}]}
          />
        </View>
        <View style={styles.filterActions}>
          <Button
            title="Apply"
            onPress={handleApplyFilters}
            style={[styles.filterActionButton, styles.filterActionSpacing]}
          />
          <Button title="Clear" variant="secondary" onPress={handleClearFilters} style={styles.filterActionButton} />
        </View>
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : null}
      {queuedItems.length > 0 ? (
        <View style={[styles.queueCard, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}> 
          <Text style={[styles.queueHeading, {color: theme.colors.text}]}>Queued uploads</Text>
          <Text style={{color: theme.colors.muted, marginBottom: 12}}>
            {isOnline ? 'These parcels will sync shortly.' : 'Waiting for connection to sync.'}
          </Text>
          {queuedItems.map(item => (
            <QueueListItem
              key={item.id}
              label={item.remarks ?? 'Parcel photo'}
              status={item.status === 'uploading' ? 'Syncing…' : 'Queued'}
              createdAt={item.createdAt}
            />
          ))}
        </View>
      ) : null}
      {failedItems.length > 0 ? (
        <View style={[styles.queueCard, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}> 
          <Text style={[styles.queueHeading, {color: theme.colors.text}]}>Failed uploads</Text>
          <Text style={{color: theme.colors.muted, marginBottom: 12}}>Retry to attempt syncing again.</Text>
          {failedItems.map(item => (
            <QueueListItem
              key={item.id}
              label={item.remarks ?? 'Parcel photo'}
              status="Failed"
              createdAt={item.createdAt}
              subtitle={item.error ?? undefined}
              onRetry={() => retryQueueItem(item.id)}
            />
          ))}
        </View>
      ) : null}
      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, {color: theme.colors.notification}]}>{errorMessage}</Text>
          <Button title="Retry" variant="secondary" onPress={() => refetch()} style={styles.errorButton} />
        </View>
      ) : null}
    </View>
  );

  return (
    <ScreenContainer>
      <FlatList
        data={parcels}
        keyExtractor={item => item.id}
        renderItem={renderParcel}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={ListHeaderComponent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          !isLoading && parcels.length === 0 && !errorMessage ? (
            <Text style={{color: theme.colors.muted, textAlign: 'center', marginTop: 24}}>
              No parcels match your filters yet.
            </Text>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 48,
    paddingHorizontal: 4,
  },
  separator: {
    height: 12,
  },
  filterCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
  },
  filterField: {
    flex: 1,
    marginBottom: 12,
  },
  filterFieldSpacing: {
    marginRight: 12,
  },
  filterLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  filterActionButton: {
    flex: 1,
  },
  filterActionSpacing: {
    marginRight: 12,
  },
  queueCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  queueHeading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  queueItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  queueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  queueItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  queueItemStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  queueRetryButton: {
    alignSelf: 'flex-start',
  },
  errorContainer: {
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
  },
  errorButton: {
    marginTop: 8,
  },
  loadingContainer: {
    paddingVertical: 8,
  },
  footerLoading: {
    paddingVertical: 16,
  },
  messageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  messageBody: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
});

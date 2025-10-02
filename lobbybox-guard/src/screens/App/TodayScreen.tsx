import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import {useQuery} from '@tanstack/react-query';
import {ScreenContainer} from '@/components/ScreenContainer';
import {Button} from '@/components/Button';
import {useThemeContext} from '@/theme';
import {fetchParcelsForDate} from '@/api/parcels';
import {Parcel} from '@/api/types';
import {showToast} from '@/utils/toast';
import {useAuth} from '@/hooks/useAuth';
import {ErrorNotice} from '@/components/ErrorNotice';
import {ParsedApiError, parseApiError} from '@/utils/error';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {AppTabParamList} from '@/navigation/AppNavigator';

const DATE_FORMAT = 'YYYY-MM-DD';

const formatTime = (value: string) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('HH:mm') : value;
};

const ParcelItem: React.FC<{parcel: Parcel}> = ({parcel}) => {
  const {theme} = useThemeContext();

  const handleViewPhoto = useCallback(async () => {
    if (!parcel.photoUrl) {
      return;
    }

    try {
      await Linking.openURL(parcel.photoUrl);
    } catch (err) {
      showToast('Unable to open photo link.');
    }
  }, [parcel.photoUrl]);

  return (
    <View style={[styles.card, {backgroundColor: theme.colors.card, borderColor: theme.colors.border}]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.time, {color: theme.colors.text}]}>{formatTime(parcel.createdAt)}</Text>
        {parcel.trackingNumber ? (
          <Text style={[styles.meta, {color: theme.colors.muted}]}>#{parcel.trackingNumber}</Text>
        ) : null}
      </View>
      {parcel.recipientName ? (
        <Text style={[styles.primaryText, {color: theme.colors.text}]}>{parcel.recipientName}</Text>
      ) : null}
      {parcel.remarks ? <Text style={{color: theme.colors.muted}}>{parcel.remarks}</Text> : null}
      <TouchableOpacity onPress={handleViewPhoto} style={styles.photoLink}>
        <Text style={[styles.photoLinkText, {color: theme.colors.primary}]}>View photo</Text>
      </TouchableOpacity>
    </View>
  );
};

export const TodayScreen: React.FC = () => {
  const {theme} = useThemeContext();
  const {property, refreshProfile} = useAuth();
  const navigation = useNavigation<NavigationProp<AppTabParamList>>();
  const today = useMemo(() => dayjs().format(DATE_FORMAT), []);
  const propertyId = property?.propertyId;

  const {
    data: parcels,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['parcels', today, propertyId],
    queryFn: () => fetchParcelsForDate(today, propertyId ?? undefined),
    enabled: Boolean(propertyId),
  });

  const isRefreshing = isFetching && !isLoading;

  const parsedError: ParsedApiError | null = useMemo(
    () => (error ? parseApiError(error, 'Unable to load parcels. Please try again later.') : null),
    [error],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleBackHome = useCallback(() => {
    navigation.navigate('Capture');
  }, [navigation]);

  const renderItem = useCallback(({item}: {item: Parcel}) => <ParcelItem parcel={item} />, []);

  if (!propertyId) {
    return (
      <ScreenContainer>
        <View style={styles.messageContainer}>
          <Text style={[styles.heading, {color: theme.colors.text}]}>Today · {dayjs(today).format('MMM D, YYYY')}</Text>
          <Text style={[styles.messageTitle, {color: theme.colors.text}]}>Property assignment required</Text>
          <Text style={[styles.messageBody, {color: theme.colors.muted}]}>We couldn't find an assigned property for your account. Please contact your administrator or try refreshing your assignment.</Text>
          <Button
            title="Retry assignment"
            onPress={() => refreshProfile()}
            accessibilityHint="Fetch your property assignment again"
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={[styles.heading, {color: theme.colors.text}]}>
        Today · {dayjs(today).format('MMM D, YYYY')}
        {property?.propertyName ? ` · ${property.propertyName}` : ''}
      </Text>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : null}
      {parsedError ? (
        <ErrorNotice
          error={parsedError}
          onRetry={handleRetry}
          onBackToHome={parsedError.status === 403 ? handleBackHome : undefined}
          style={styles.errorNotice}
        />
      ) : null}
      <FlatList
        data={parcels ?? []}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          !isLoading && !parsedError ? (
            <Text style={{color: theme.colors.muted, textAlign: 'center', marginTop: 32}}>No parcels logged today yet.</Text>
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
  loadingContainer: {
    paddingVertical: 24,
  },
  listContent: {
    paddingBottom: 48,
  },
  separator: {
    height: 12,
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
  time: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 14,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  photoLink: {
    marginTop: 12,
  },
  photoLinkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorNotice: {
    marginBottom: 16,
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
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  messageBody: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {DailyParcelMetric} from '@/api/types';

type CachedDailyMetric = DailyParcelMetric & {
  updatedAt: string;
};

const STORAGE_PREFIX = 'lobbybox_guard_metric_daily_parcels_';

const buildKey = (date: string, propertyId?: string | null) => {
  const suffix = propertyId ? `${propertyId}` : 'default';
  return `${STORAGE_PREFIX}${date}_${suffix}`;
};

export const metricsStorage = {
  async getDailyParcelMetric(
    date: string,
    propertyId?: string | null,
  ): Promise<CachedDailyMetric | null> {
    try {
      const raw = await AsyncStorage.getItem(buildKey(date, propertyId));
      if (!raw) {
        return null;
      }
      const parsed: CachedDailyMetric = JSON.parse(raw);
      if (parsed.date !== date) {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  },
  async setDailyParcelMetric(metric: CachedDailyMetric): Promise<void> {
    try {
      const key = buildKey(metric.date, metric.propertyId);
      await AsyncStorage.setItem(key, JSON.stringify(metric));
    } catch (error) {
      // Ignore write errors for caching.
    }
  },
};

export type {CachedDailyMetric};

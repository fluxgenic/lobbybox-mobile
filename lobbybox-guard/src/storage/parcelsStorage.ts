import AsyncStorage from '@react-native-async-storage/async-storage';
import {ParcelSummary} from '@/api/types';

type CachedDailyParcels = {
  date: string;
  propertyId?: string | null;
  updatedAt: string;
  parcels: ParcelSummary[];
};

const STORAGE_PREFIX = 'lobbybox_guard_parcels_daily_';

const buildKey = (date: string, propertyId?: string | null) => {
  const suffix = propertyId ? `${propertyId}` : 'default';
  return `${STORAGE_PREFIX}${date}_${suffix}`;
};

export const parcelsStorage = {
  async getDailyParcels(date: string, propertyId?: string | null): Promise<CachedDailyParcels | null> {
    try {
      const raw = await AsyncStorage.getItem(buildKey(date, propertyId));
      if (!raw) {
        return null;
      }
      const parsed: CachedDailyParcels = JSON.parse(raw);
      if (parsed.date !== date) {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  },
  async setDailyParcels(value: CachedDailyParcels): Promise<void> {
    try {
      const key = buildKey(value.date, value.propertyId);
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // ignore cache write errors
    }
  },
};

export type {CachedDailyParcels};

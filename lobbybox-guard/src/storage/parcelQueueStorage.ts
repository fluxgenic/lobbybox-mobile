import AsyncStorage from '@react-native-async-storage/async-storage';

export type ParcelQueueStatus = 'queued' | 'uploading' | 'failed';

export type StoredParcelQueueItem = {
  id: string;
  localUri: string;
  propertyId: string;
  remarks?: string;
  createdAt: string;
  status: ParcelQueueStatus;
  tries: number;
  error?: string | null;
  lastAttemptAt?: string | null;
};

const STORAGE_KEY = '@lobbybox/parcel-queue/v1';

export const loadParcelQueue = async (): Promise<StoredParcelQueueItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as StoredParcelQueueItem[];
  } catch (err) {
    return [];
  }
};

export const persistParcelQueue = async (items: StoredParcelQueueItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    // noop - we will retry persistence on next mutation
  }
};

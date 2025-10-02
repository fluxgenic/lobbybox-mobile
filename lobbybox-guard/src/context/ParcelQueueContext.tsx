import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {useQueryClient} from '@tanstack/react-query';
import {requestParcelUpload, uploadParcelImage, createParcel} from '@/api/parcels';
import {loadParcelQueue, persistParcelQueue, StoredParcelQueueItem, ParcelQueueStatus} from '@/storage/parcelQueueStorage';
import {showToast} from '@/utils/toast';
import {isForbiddenError, parseApiError} from '@/utils/error';

export type ParcelQueueItem = StoredParcelQueueItem;

type EnqueuePayload = {
  localUri: string;
  propertyId: string;
  remarks?: string;
  recipientName?: string;
  trackingNumber?: string;
  mobileNumber?: string;
  collectedAt: string;
};

type ParcelQueueContextValue = {
  items: ParcelQueueItem[];
  isOnline: boolean;
  enqueue: (payload: EnqueuePayload) => Promise<ParcelQueueItem>;
  retry: (id: string) => Promise<void>;
};

const ParcelQueueContext = createContext<ParcelQueueContextValue | undefined>(undefined);

const getBackoffDelay = (tries: number) => Math.min(2 ** tries * 1000, 60_000);

const shouldAttempt = (item: ParcelQueueItem) => {
  if (item.status === 'queued' || item.status === 'uploading') {
    return true;
  }
  if (item.status === 'failed') {
    if (!item.lastAttemptAt) {
      return true;
    }
    const lastAttempt = new Date(item.lastAttemptAt).getTime();
    const delay = getBackoffDelay(item.tries);
    return Date.now() - lastAttempt >= delay;
  }
  return false;
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const ParcelQueueProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [items, setItems] = useState<ParcelQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const isProcessing = useRef(false);
  const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<ParcelQueueItem[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    queueRef.current = items;
    void persistParcelQueue(items);
  }, [items]);

  useEffect(() => {
    const load = async () => {
      const stored = await loadParcelQueue();
      setItems(stored);
    };
    void load();
  }, []);

  useEffect(() => {
    const syncState = (state: NetInfoState) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
    };

    const unsubscribe = NetInfo.addEventListener(syncState);
    void NetInfo.fetch().then(syncState);
    return unsubscribe;
  }, []);

  const updateItem = useCallback((id: string, updater: Partial<ParcelQueueItem>) => {
    setItems(prev => prev.map(item => (item.id === id ? {...item, ...updater} : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing.current || !isOnline) {
      return;
    }
    isProcessing.current = true;
    try {
      for (const item of queueRef.current) {
        if (!shouldAttempt(item)) {
          continue;
        }
        const attemptId = item.id;
        const nextTries = item.tries + 1;
        updateItem(attemptId, {
          status: 'uploading',
          tries: nextTries,
          lastAttemptAt: new Date().toISOString(),
          error: null,
        });
        try {
          let sas = await requestParcelUpload({ext: 'jpg'});

          const uploadWithSas = async () => {
            await uploadParcelImage(sas.uploadUrl, item.localUri);
          };

          try {
            await uploadWithSas();
          } catch (err) {
            if (isForbiddenError(err)) {
              sas = await requestParcelUpload({ext: 'jpg'});
              await uploadWithSas();
            } else {
              throw err;
            }
          }
          await createParcel({
            propertyId: item.propertyId,
            photoUrl: sas.blobUrl,
            remarks: item.remarks,
            recipientName: item.recipientName,
            trackingNumber: item.trackingNumber,
            mobileNumber: item.mobileNumber,
            collectedAt: item.collectedAt,
          });
          removeItem(attemptId);
          await queryClient.invalidateQueries({queryKey: ['parcels'], exact: false});
          await queryClient.invalidateQueries({queryKey: ['parcels-history'], exact: false});
          showToast('Queued parcel synced');
        } catch (err) {
          const message = parseApiError(err, 'Failed to sync parcel.').message;
          updateItem(attemptId, {
            status: 'failed',
            error: message,
          });
          const delay = getBackoffDelay(nextTries);
          if (retryTimeout.current) {
            clearTimeout(retryTimeout.current);
          }
          if (isOnline) {
            retryTimeout.current = setTimeout(() => {
              retryTimeout.current = null;
              void processQueue();
            }, delay);
          }
        }
      }
    } finally {
      isProcessing.current = false;
    }
  }, [isOnline, queryClient, removeItem, updateItem]);

  useEffect(() => {
    if (isOnline) {
      void processQueue();
    }
  }, [isOnline, processQueue]);

  const enqueue = useCallback(
    async ({localUri, propertyId, remarks, recipientName, trackingNumber, mobileNumber, collectedAt}: EnqueuePayload) => {
      const item: ParcelQueueItem = {
        id: generateId(),
        localUri,
        propertyId,
        remarks,
        recipientName,
        trackingNumber,
        mobileNumber,
        collectedAt,
        createdAt: new Date().toISOString(),
        status: 'queued',
        tries: 0,
        error: null,
        lastAttemptAt: null,
      };
      setItems(prev => [...prev, item]);
      if (isOnline) {
        void processQueue();
      }
      return item;
    },
    [isOnline, processQueue],
  );

  const retry = useCallback(
    async (id: string) => {
      const item = queueRef.current.find(entry => entry.id === id);
      if (!item) {
        return;
      }
      updateItem(id, {status: 'queued', tries: 0, error: null, lastAttemptAt: null});
      if (isOnline) {
        void processQueue();
      }
    },
    [isOnline, processQueue, updateItem],
  );

  const value = useMemo(
    () => ({
      items,
      isOnline,
      enqueue,
      retry,
    }),
    [enqueue, isOnline, items, retry],
  );

  return <ParcelQueueContext.Provider value={value}>{children}</ParcelQueueContext.Provider>;
};

export const useParcelQueueContext = () => {
  const context = useContext(ParcelQueueContext);
  if (!context) {
    throw new Error('useParcelQueue must be used within ParcelQueueProvider');
  }
  return context;
};

export type ParcelQueueState = ParcelQueueStatus;

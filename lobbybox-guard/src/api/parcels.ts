import axios from 'axios';
import RNFS from 'react-native-fs';
import api from './client';
import {
  CreateParcelPayload,
  PaginatedParcelsResponse,
  Parcel,
  ParcelQueryParams,
  ParcelSasRequest,
  ParcelSasResponse,
} from './types';
import {Buffer} from 'buffer';

export const requestParcelUpload = async (payload: ParcelSasRequest): Promise<ParcelSasResponse> => {
  const {data} = await api.post<ParcelSasResponse>('/parcels/sas', payload);
  return data;
};

export const uploadParcelImage = async (
  uploadUrl: string,
  filePath: string,
  onProgress?: (progress: number) => void,
): Promise<void> => {
  const normalizedPath = filePath.startsWith('file://') ? filePath.replace('file://', '') : filePath;
  const base64Data = await RNFS.readFile(normalizedPath, 'base64');
  const buffer = Buffer.from(base64Data, 'base64');
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  await axios.put(uploadUrl, arrayBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': buffer.byteLength,
      'x-ms-blob-type': 'BlockBlob',
    },
    onUploadProgress: progressEvent => {
      const total = progressEvent.total ?? buffer.byteLength;
      if (total > 0) {
        onProgress?.(progressEvent.loaded / total);
      }
    },
  });
};

export const createParcel = async (payload: CreateParcelPayload): Promise<Parcel> => {
  const {data} = await api.post<Parcel>('/parcels', payload);
  return data;
};

type RawParcelPageResponse =
  | Parcel[]
  | ({
      data?: Parcel[];
      items?: Parcel[];
      page?: number;
      pageSize?: number;
      total?: number;
      hasMore?: boolean;
      nextPage?: number | null;
      meta?: {
        page?: number;
        pageSize?: number;
        perPage?: number;
        total?: number;
        hasMore?: boolean;
        nextPage?: number | null;
      };
    } & Record<string, unknown>);

const normalizeParcelPage = (
  response: RawParcelPageResponse,
  fallbackParams: ParcelQueryParams,
): PaginatedParcelsResponse => {
  if (Array.isArray(response)) {
    const items = response;
    const page = fallbackParams.page ?? 1;
    const pageSize = fallbackParams.pageSize ?? items.length;
    return {items, page, pageSize, total: items.length, hasMore: false};
  }

  const meta = (response.meta ?? {}) as {
    page?: number;
    pageSize?: number;
    perPage?: number;
    total?: number;
    hasMore?: boolean;
    nextPage?: number | null;
  };

  const items = (response.data ?? response.items ?? []) as Parcel[];
  const page = response.page ?? meta.page ?? fallbackParams.page ?? 1;
  const pageSize =
    response.pageSize ?? meta.pageSize ?? meta.perPage ?? fallbackParams.pageSize ?? items.length;
  const total = response.total ?? meta.total ?? items.length;
  const hasMore =
    response.hasMore ?? meta.hasMore ?? (meta.nextPage ?? response.nextPage ?? null) !== null;

  return {
    items,
    page,
    pageSize,
    total,
    hasMore,
  };
};

export const fetchParcelsPage = async (
  params: ParcelQueryParams,
): Promise<PaginatedParcelsResponse> => {
  const {data} = await api.get<RawParcelPageResponse>('/parcels', {
    params,
  });
  return normalizeParcelPage(data, params);
};

export const fetchParcelsForDate = async (
  date: string,
  propertyId?: string,
  pageSize = 50,
): Promise<Parcel[]> => {
  const response = await fetchParcelsPage({from: date, to: date, page: 1, pageSize, propertyId});
  return response.items;
};

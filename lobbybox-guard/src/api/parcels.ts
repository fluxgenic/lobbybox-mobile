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

export const requestParcelUpload = async (payload: ParcelSasRequest = {}): Promise<ParcelSasResponse> => {
  const body: ParcelSasRequest = {ext: payload.ext ?? 'jpg'};
  const {data} = await api.post<ParcelSasResponse>('/parcels/sas', body);
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

export const fetchParcelsPage = async (
  params: ParcelQueryParams,
): Promise<PaginatedParcelsResponse> => {
  const {data} = await api.get<{data: Parcel[]; page: number; pageSize: number; total: number}>('/parcels', {
    params,
  });
  const items = data.data ?? [];
  const page = data.page ?? params.page ?? 1;
  const pageSize = data.pageSize ?? params.pageSize ?? items.length;
  const total = data.total ?? items.length;
  const hasMore = page * pageSize < total;

  return {
    items,
    page,
    pageSize,
    total,
    hasMore,
  };
};

export const fetchParcelsForDate = async (
  date: string,
  propertyId?: string,
  pageSize = 50,
): Promise<Parcel[]> => {
  const response = await fetchParcelsPage({
    date,
    page: 1,
    pageSize,
    propertyId,
  });
  return response.items;
};

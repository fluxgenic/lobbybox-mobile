import axios from 'axios';
import RNFS from 'react-native-fs';
import api from './client';
import {CreateParcelPayload, Parcel, ParcelSasRequest, ParcelSasResponse} from './types';
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

export const fetchParcels = async (date: string): Promise<Parcel[]> => {
  const {data} = await api.get<Parcel[]>('/parcels', {
    params: {date},
  });
  return data;
};

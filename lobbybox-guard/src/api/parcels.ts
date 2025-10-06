import api from './client';
import {
  CreateParcelRequest,
  CreateParcelResponse,
  ParcelListItem,
  ParcelOcrSuggestion,
  ParcelUploadRequest,
  ParcelUploadResponse,
} from './types';

export const fetchParcelsForDate = async (
  date: string,
  propertyId?: string | null,
): Promise<ParcelListItem[]> => {
  const {data} = await api.get<ParcelListItem[]>('/parcels', {
    params: {
      date,
      propertyId,
    },
  });
  return data;
};

export const requestParcelUpload = async (): Promise<ParcelUploadResponse> => {
  const payload: ParcelUploadRequest = {ext: 'jpg'};
  const {data} = await api.post<ParcelUploadResponse>('/parcels/sas', payload);
  return data;
};

export const createParcel = async (payload: CreateParcelRequest): Promise<CreateParcelResponse> => {
  const {data} = await api.post<CreateParcelResponse>('/parcels', payload);
  return data;
};

export const fetchParcelOcrSuggestions = async (photoUrl: string): Promise<ParcelOcrSuggestion> => {
  const {data} = await api.post<ParcelOcrSuggestion>('/parcels/ocr', {photoUrl});
  return data;
};

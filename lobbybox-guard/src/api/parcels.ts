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
  userId?: string | null,
): Promise<ParcelListItem[]> => {
  const requestContext = {
    date,
    propertyId: propertyId ?? null,
    userId: userId ?? null,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    requestedAt: new Date().toISOString(),
  };

  console.log('[api/parcels] fetchParcelsForDate request', requestContext);

  try {
    const {data} = await api.get<ParcelListItem[]>('/parcels', {
      params: {
        date,
        propertyId,
      },
    });

    console.log('[api/parcels] fetchParcelsForDate response', {
      ...requestContext,
      responseCount: data.length,
      sampleParcelIds: data.slice(0, 3).map(parcel => parcel.id),
    });

    return data;
  } catch (error) {
    console.error('[api/parcels] fetchParcelsForDate error', {
      ...requestContext,
      error,
    });
    throw error;
  }
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

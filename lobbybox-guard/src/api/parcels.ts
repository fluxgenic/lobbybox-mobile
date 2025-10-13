import api from './client';
import {
  CreateParcelRequest,
  CreateParcelResponse,
  PaginatedResponse,
  ParcelListItem,
  ParcelOcrSuggestion,
  ParcelReadRequest,
  ParcelReadResponse,
  ParcelUploadCategory,
  ParcelUploadRequest,
  ParcelUploadResponse,
} from './types';

const MAX_PAGE_REQUESTS = 25;

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
    const aggregated: ParcelListItem[] = [];
    let total = Number.POSITIVE_INFINITY;
    let page = 1;

    while (aggregated.length < total && page <= MAX_PAGE_REQUESTS) {
      const {data} = await api.get<PaginatedResponse<ParcelListItem>>('/parcels/guard/today', {
        params: {
          date,
          propertyId,
          page,
        },
      });

      aggregated.push(...data.data);

      if (typeof data.total === 'number' && Number.isFinite(data.total)) {
        total = data.total;
      } else {
        total = aggregated.length;
      }

      const expectedPageSize = data.pageSize ?? data.data.length;
      const receivedPageSize = data.data.length;
      const hasMorePages = aggregated.length < total && receivedPageSize >= expectedPageSize;

      if (!hasMorePages) {
        break;
      }

      page += 1;
    }

    if (page > MAX_PAGE_REQUESTS) {
      console.warn('[api/parcels] fetchParcelsForDate reached max page limit', {
        ...requestContext,
        maxPages: MAX_PAGE_REQUESTS,
        aggregatedCount: aggregated.length,
        expectedTotal: total,
      });
    }

    console.log('[api/parcels] fetchParcelsForDate response', {
      ...requestContext,
      responseCount: aggregated.length,
      total,
      totalPagesFetched: page,
      sampleParcelIds: aggregated.slice(0, 3).map(parcel => parcel.id),
    });

    return aggregated;
  } catch (error) {
    console.error('[api/parcels] fetchParcelsForDate error', {
      ...requestContext,
      error,
    });
    throw error;
  }
};

type FetchParcelHistoryParams = {
  propertyId: string;
  page?: number;
  pageSize?: number;
};

export const fetchParcelHistory = async ({
  propertyId,
  page = 1,
  pageSize = 20,
}: FetchParcelHistoryParams): Promise<PaginatedResponse<ParcelListItem>> => {
  const params = {
    propertyId,
    page,
    pageSize,
  };

  console.log('[api/parcels] fetchParcelHistory request', params);

  try {
    const {data} = await api.get<PaginatedResponse<ParcelListItem>>('/parcels/guard/history', {
      params,
    });

    console.log('[api/parcels] fetchParcelHistory response', {
      ...params,
      total: data.total,
      received: data.data.length,
    });

    return data;
  } catch (error) {
    console.error('[api/parcels] fetchParcelHistory error', {
      ...params,
      error,
    });
    throw error;
  }
};

type ParcelUploadOptions = {
  propertyId: string;
  category?: ParcelUploadCategory;
  ext?: 'jpg' | 'png';
};

export const requestParcelUpload = async ({
  propertyId,
  category = 'parcel',
  ext = 'jpg',
}: ParcelUploadOptions): Promise<ParcelUploadResponse> => {
  const payload: ParcelUploadRequest = {
    propertyId,
    category,
    ext,
  };

  const {data} = await api.post<ParcelUploadResponse>('/parcels/sas', payload);
  return data;
};

export const refreshParcelPhotoReadUrl = async (blobUrl: string): Promise<string> => {
  const payload: ParcelReadRequest = {blobUrl};
  const {data} = await api.post<ParcelReadResponse>('/parcels/sas/read', payload);
  return data.readUrl;
};

export const createParcel = async (payload: CreateParcelRequest): Promise<CreateParcelResponse> => {
  const {data} = await api.post<CreateParcelResponse>('/parcels', payload);
  return data;
};

export const fetchParcelOcrSuggestions = async (photoUrl: string): Promise<ParcelOcrSuggestion> => {
  const {data} = await api.post<ParcelOcrSuggestion>('/parcels/ocr', {photoUrl});
  return data;
};

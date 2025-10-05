import {ParcelSummary} from './types';
import api from './client';

export const fetchDailyParcels = async (
  date: string,
  propertyId?: string | null,
): Promise<ParcelSummary[]> => {
  const {data} = await api.get<ParcelSummary[]>('/parcels/daily', {
    params: {
      date,
      propertyId,
    },
  });
  return data;
};

import api from './client';
import {DailyParcelMetric} from './types';

export const fetchDailyParcelMetric = async (
  date: string,
  propertyId?: string | null,
): Promise<DailyParcelMetric> => {
  const params: Record<string, string> = {date};
  if (propertyId) {
    params.propertyId = propertyId;
  }

  const {data} = await api.get<DailyParcelMetric>('/metrics/parcels/daily', {
    params,
  });

  return data;
};

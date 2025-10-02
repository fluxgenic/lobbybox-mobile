import api from './client';
import {Property} from './types';

export type ListPropertiesParams = {
  q?: string;
  isActive?: boolean;
};

export const listProperties = async (params?: ListPropertiesParams): Promise<Property[]> => {
  const {data} = await api.get<Property[]>('/properties', {
    params,
  });
  return Array.isArray(data) ? data : [];
};

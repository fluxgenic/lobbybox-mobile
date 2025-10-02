import api from './client';
import {GuardProfile} from './types';

export type UpdateProfilePayload = {
  fullName: string;
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<GuardProfile> => {
  const {data} = await api.patch<GuardProfile>('/me', payload);
  return data;
};

export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  status: string;
};

export const changePassword = async (
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResponse> => {
  const {data} = await api.post<ChangePasswordResponse>('/me/change-password', payload);
  return data;
};

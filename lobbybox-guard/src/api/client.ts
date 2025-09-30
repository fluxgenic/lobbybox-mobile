import axios, {AxiosError, AxiosInstance, AxiosRequestConfig} from 'axios';
import {API_BASE_PATH} from '@/config/env';
import {authEvents} from './authEvents';
import {tokenStorage} from '@/storage/tokenStorage';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_PATH,
  timeout: 15000,
});

type RetryConfig = AxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) {
        return null;
      }
      const response = await axios.post(`${API_BASE_PATH}/auth/refresh`, {
        refreshToken,
      });
      const {accessToken, refreshToken: newRefreshToken} = response.data ?? {};
      if (!accessToken || !newRefreshToken) {
        return null;
      }
      await tokenStorage.setTokens({accessToken, refreshToken: newRefreshToken});
      return accessToken;
    } catch (error) {
      return null;
    } finally {
      isRefreshing = false;
    }
  })();

  const token = await refreshPromise;
  refreshPromise = null;
  return token;
};

api.interceptors.request.use(async config => {
  const token = await tokenStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config as RetryConfig;
    const status = error?.response?.status;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${newToken}`,
        };
        return api(originalRequest);
      }
      await tokenStorage.clear();
      authEvents.emitUnauthorized();
      return Promise.reject(error);
    }

    if (status === 401) {
      await tokenStorage.clear();
      authEvents.emitUnauthorized();
    }

    return Promise.reject(error);
  },
);

export type ApiError = AxiosError<{message?: string}>;

export default api;

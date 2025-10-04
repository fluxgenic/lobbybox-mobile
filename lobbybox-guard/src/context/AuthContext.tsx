import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import api from '@/api/client';
import {authEvents} from '@/api/authEvents';
import {AuthResponse, User} from '@/api/types';
import {tokenStorage} from '@/storage/tokenStorage';
import {ParsedApiError, parseApiError} from '@/utils/error';
import {recordRequestId} from '@/debug/debugEvents';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  error: ParsedApiError | null;
  clearError: () => void;
};

const normalizeUser = (profile: User): User => {
  const displayName = profile.fullName?.trim()?.length ? profile.fullName : profile.email;
  return {
    ...profile,
    fullName: profile.fullName ?? displayName,
    displayName,
  };
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<ParsedApiError | null>(null);

  const clearSession = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    setStatus('unauthenticated');
    setError(null);
  }, []);

  const loadProfile = useCallback(async () => {
    const {data} = await api.get<User>('/me');
    setUser(normalizeUser(data));
  }, []);

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        setStatus('unauthenticated');
        return;
      }
      await loadProfile();
      setStatus('authenticated');
    } catch (err) {
      await clearSession();
    }
  }, [clearSession, loadProfile]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const unsubscribe = authEvents.onUnauthorized(() => {
      clearSession();
    });
    return unsubscribe;
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setStatus('loading');
      try {
        const {data} = await api.post<AuthResponse>('/auth/login', {email, password});
        await tokenStorage.setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        await loadProfile();
        setStatus('authenticated');
      } catch (err) {
        const parsed = parseApiError(err, 'Unable to login. Please try again.');
        setError(parsed);
        if (parsed.requestId) {
          recordRequestId(parsed.requestId);
        }
        await tokenStorage.clear();
        setStatus('unauthenticated');
      }
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    if (status !== 'authenticated') {
      return;
    }
    await loadProfile();
  }, [loadProfile, status]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout,
      refreshProfile,
      error,
      clearError,
    }),
    [status, user, login, logout, refreshProfile, error, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

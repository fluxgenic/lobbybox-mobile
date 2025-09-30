import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import api, {ApiError} from '@/api/client';
import {authEvents} from '@/api/authEvents';
import {AuthResponse, Role, User} from '@/api/types';
import {tokenStorage} from '@/storage/tokenStorage';
import {useQueryClient} from '@tanstack/react-query';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  error: string | null;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    setStatus('unauthenticated');
    setError(null);
    queryClient.clear();
  }, [queryClient]);

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        setStatus('unauthenticated');
        return;
      }
      const {data} = await api.get<User>('/me');
      setUser(data);
      setStatus('authenticated');
    } catch (err) {
      await logout();
    }
  }, [logout]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const unsubscribe = authEvents.onUnauthorized(() => {
      logout();
    });
    return unsubscribe;
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setStatus('loading');
    try {
      const {data} = await api.post<AuthResponse>('/auth/login', {
        email,
        password,
      });
      await tokenStorage.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      setUser(data.user);
      setStatus('authenticated');
    } catch (err) {
      const apiError = err as ApiError;
      const message = apiError.response?.data?.message ?? 'Unable to login. Please try again.';
      setError(message);
      setStatus('unauthenticated');
    }
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!user) {
        return false;
      }
      return roles.includes(user.role);
    },
    [user],
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout,
      hasRole,
      error,
      clearError,
    }),
    [status, user, login, logout, hasRole, error, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useAuthContext();

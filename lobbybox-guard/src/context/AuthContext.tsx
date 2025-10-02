import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import api from '@/api/client';
import {authEvents} from '@/api/authEvents';
import {AuthResponse, GuardProfile, PropertyAssignment, Role, User} from '@/api/types';
import {tokenStorage} from '@/storage/tokenStorage';
import {useQueryClient} from '@tanstack/react-query';
import {ParsedApiError, parseApiError} from '@/utils/error';

const normalizeUser = (profile: User): User => ({
  ...profile,
  fullName: profile.fullName ?? profile.name ?? profile.email,
});

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  property: PropertyAssignment | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  error: ParsedApiError | null;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
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
  const [property, setProperty] = useState<PropertyAssignment | null>(null);
  const [error, setError] = useState<ParsedApiError | null>(null);
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    await tokenStorage.clear();
    setUser(null);
    setProperty(null);
    setStatus('unauthenticated');
    setError(null);
    queryClient.clear();
  }, [queryClient]);

  const loadProfile = useCallback(async () => {
    const {data} = await api.get<GuardProfile>('/me');
    const normalized = normalizeUser(data);
    setUser(normalized);
    setProperty(normalized.propertyAssignment ?? null);
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
      await logout();
    }
  }, [loadProfile, logout]);

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
      const normalizedUser = normalizeUser(data.user);
      setUser(normalizedUser);
      setProperty(normalizedUser.propertyAssignment ?? null);
      if (!normalizedUser.propertyAssignment) {
        await loadProfile();
      }
      setStatus('authenticated');
    } catch (err) {
      setError(parseApiError(err, 'Unable to login. Please try again.'));
      setStatus('unauthenticated');
    }
  }, [loadProfile]);

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
      property,
      login,
      logout,
      hasRole,
      error,
      clearError,
      refreshProfile: loadProfile,
    }),
    [status, user, property, login, logout, hasRole, error, clearError, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useAuthContext();

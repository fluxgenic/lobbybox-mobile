import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {AppTheme, ThemeMode, darkTheme, lightTheme} from './themes';

const STORAGE_KEY = 'lobbybox_guard_theme';

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  toggleTheme: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const storedMode = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedMode === 'dark' || storedMode === 'light') {
        setModeState(storedMode);
      }
      setReady(true);
    })();
  }, []);

  const persistMode = useCallback(async (value: ThemeMode) => {
    setModeState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
  }, []);

  const toggleTheme = useCallback(async () => {
    await persistMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, persistMode]);

  const setMode = useCallback(async (value: ThemeMode) => {
    await persistMode(value);
  }, [persistMode]);

  const theme = useMemo<AppTheme>(() => (mode === 'light' ? lightTheme : darkTheme), [mode]);

  const value = useMemo(
    () => ({
      theme,
      mode,
      toggleTheme,
      setMode,
    }),
    [theme, mode, toggleTheme, setMode],
  );

  if (!ready) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used inside ThemeProvider');
  }
  return context;
};

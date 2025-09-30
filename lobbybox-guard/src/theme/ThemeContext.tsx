import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {DefaultTheme, DarkTheme, Theme as NavigationTheme} from '@react-navigation/native';
import {corporateDarkPalette, corporateLightPalette} from './colors';

const STORAGE_KEY = 'lobbybox_guard_theme';

type AppTheme = 'light' | 'dark';

type CorporateTheme = NavigationTheme & {
  mode: AppTheme;
  colors: NavigationTheme['colors'] & {
    primaryVariant: string;
    secondary: string;
    text: string;
    muted: string;
    surface: string;
  };
};

type ThemeContextValue = {
  theme: CorporateTheme;
  mode: AppTheme;
  toggleTheme: () => Promise<void>;
  setMode: (mode: AppTheme) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const createLightTheme = (): CorporateTheme => ({
  ...DefaultTheme,
  mode: 'light',
  colors: {
    ...DefaultTheme.colors,
    primary: corporateLightPalette.primary,
    background: corporateLightPalette.background,
    card: corporateLightPalette.surface,
    text: corporateLightPalette.text,
    border: corporateLightPalette.border,
    notification: corporateLightPalette.secondary,
    primaryVariant: corporateLightPalette.primaryVariant,
    secondary: corporateLightPalette.secondary,
    muted: corporateLightPalette.muted,
    surface: corporateLightPalette.surface,
  },
});

const createDarkTheme = (): CorporateTheme => ({
  ...DarkTheme,
  mode: 'dark',
  colors: {
    ...DarkTheme.colors,
    primary: corporateDarkPalette.primary,
    background: corporateDarkPalette.background,
    card: corporateDarkPalette.surface,
    text: corporateDarkPalette.text,
    border: corporateDarkPalette.border,
    notification: corporateDarkPalette.secondary,
    primaryVariant: corporateDarkPalette.primaryVariant,
    secondary: corporateDarkPalette.secondary,
    muted: corporateDarkPalette.muted,
    surface: corporateDarkPalette.surface,
  },
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [mode, setModeState] = useState<AppTheme>('light');
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

  const persistMode = useCallback(async (value: AppTheme) => {
    setModeState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
  }, []);

  const toggleTheme = useCallback(async () => {
    await persistMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, persistMode]);

  const setMode = useCallback(async (value: AppTheme) => {
    await persistMode(value);
  }, [persistMode]);

  const theme = useMemo<CorporateTheme>(() => (mode === 'light' ? createLightTheme() : createDarkTheme()), [mode]);

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

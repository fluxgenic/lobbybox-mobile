import {DarkTheme, DefaultTheme, Theme as NavigationTheme} from '@react-navigation/native';
import {colorTokens} from './colors';

export type ThemeMode = 'light' | 'dark';

export type ThemePalette = {
  primary: typeof colorTokens.color.primary;
  secondary: typeof colorTokens.color.secondary;
  background: {default: string};
  surface: {card: string};
  info: typeof colorTokens.color.info;
  success: typeof colorTokens.color.success;
  error: typeof colorTokens.color.error;
  border: typeof colorTokens.color.border;
  text: {primary: string; secondary: string};
};

export type ThemeRoles = {
  button: {
    primary: {background: string; pressed: string; text: string};
    secondary: {background: string; border: string; text: string};
    ghost: {text: string};
  };
  card: {background: string; border: string};
  text: {primary: string; secondary: string; onPrimary: string};
  input: {background: string; text: string; placeholder: string; border: string};
  divider: {color: string};
  background: {default: string};
  status: {info: string; success: string; error: string};
};

export type AppTheme = NavigationTheme & {
  mode: ThemeMode;
  palette: ThemePalette;
  roles: ThemeRoles;
};

const createTheme = (mode: ThemeMode): AppTheme => {
  const isDark = mode === 'dark';

  const palette: ThemePalette = {
    primary: colorTokens.color.primary,
    secondary: colorTokens.color.secondary,
    background: {
      default: isDark ? colorTokens.color.dark.background.default : colorTokens.color.background.default,
    },
    surface: {
      card: isDark ? colorTokens.color.dark.surface.card : colorTokens.color.surface.card,
    },
    info: colorTokens.color.info,
    success: colorTokens.color.success,
    error: colorTokens.color.error,
    border: {
      divider: isDark ? colorTokens.color.dark.border.divider : colorTokens.color.border.divider,
    },
    text: isDark ? colorTokens.color.dark.text : colorTokens.color.text,
  };

  const baseNavigation = isDark ? DarkTheme : DefaultTheme;

  const navigationColors: NavigationTheme['colors'] = {
    ...baseNavigation.colors,
    primary: palette.primary.main,
    background: palette.background.default,
    card: palette.surface.card,
    text: palette.text.primary,
    border: palette.border.divider,
    notification: palette.error.main,
  };

  const roles: ThemeRoles = {
    button: {
      primary: {
        background: palette.primary.main,
        pressed: palette.primary.dark,
        text: palette.primary.contrastText,
      },
      secondary: {
        background: palette.surface.card,
        border: palette.border.divider,
        text: palette.text.primary,
      },
      ghost: {
        text: palette.primary.main,
      },
    },
    card: {
      background: palette.surface.card,
      border: palette.border.divider,
    },
    text: {
      primary: palette.text.primary,
      secondary: palette.text.secondary,
      onPrimary: palette.primary.contrastText,
    },
    input: {
      background: palette.surface.card,
      text: palette.text.primary,
      placeholder: palette.text.secondary,
      border: palette.border.divider,
    },
    divider: {
      color: palette.border.divider,
    },
    background: {
      default: palette.background.default,
    },
    status: {
      info: palette.info.main,
      success: palette.success.main,
      error: palette.error.main,
    },
  };

  return {
    ...baseNavigation,
    mode,
    colors: navigationColors,
    palette,
    roles,
  };
};

export const lightTheme: AppTheme = createTheme('light');
export const darkTheme: AppTheme = createTheme('dark');

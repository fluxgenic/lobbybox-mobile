export const colorTokens = {
  color: {
    primary: {
      main: '#FFD956',
      dark: '#E0B500',
      contrastText: '#2C2C2C',
    },
    secondary: {
      main: '#2C2C2C',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAFAFA',
    },
    surface: {
      card: '#FFFFFF',
    },
    info: {
      main: '#4DA6FF',
    },
    success: {
      main: '#3BC97E',
    },
    error: {
      main: '#E85D5D',
    },
    border: {
      divider: '#E0E0E0',
    },
    text: {
      primary: '#2C2C2C',
      secondary: '#666666',
    },
    dark: {
      background: {
        default: '#1A1A1A',
      },
      surface: {
        card: '#2C2C2C',
      },
      text: {
        primary: '#FFFFFF',
        secondary: '#CCCCCC',
      },
    },
  },
} as const;

export type ColorTokens = typeof colorTokens;

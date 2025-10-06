declare module '@expo/vector-icons' {
  import type React from 'react';
  import type {TextProps} from 'react-native';

  export type IconProps = {
    name: string | number;
    size?: number;
    color?: string;
  } & TextProps;

  export const Ionicons: React.ComponentType<IconProps> & {
    glyphMap: Record<string, number>;
  };
}

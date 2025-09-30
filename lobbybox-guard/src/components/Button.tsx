import React from 'react';
import {StyleProp, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, ViewStyle} from 'react-native';
import {useThemeContext} from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type Props = TouchableOpacityProps & {
  title: string;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export const Button: React.FC<Props> = ({title, variant = 'primary', style, disabled, ...rest}) => {
  const {theme} = useThemeContext();
  const styles = getStyles(theme.colors, disabled ?? false);

  const containerStyle = [styles.base, styles[variant], style];
  const textStyle = [styles.text, styles[`${variant}Text` as const]];

  return (
    <TouchableOpacity {...rest} style={containerStyle} disabled={disabled} activeOpacity={0.7}>
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

type ThemeColors = ReturnType<typeof useThemeContext>['theme']['colors'];

const getStyles = (colors: ThemeColors, disabled: boolean) =>
  StyleSheet.create({
    base: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.5 : 1,
    },
    text: {
      fontSize: 16,
      fontWeight: '600',
    },
    primary: {
      backgroundColor: colors.primary,
    },
    primaryText: {
      color: colors.background,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryText: {
      color: colors.text,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    ghostText: {
      color: colors.primary,
    },
  });

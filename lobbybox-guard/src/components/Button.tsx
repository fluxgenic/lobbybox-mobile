import React from 'react';
import {StyleProp, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, ViewStyle} from 'react-native';
import {useThemeContext} from '@/theme';
import type {ThemeRoles} from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type Props = TouchableOpacityProps & {
  title: string;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export const Button: React.FC<Props> = ({
  title,
  variant = 'primary',
  style,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  ...rest
}) => {
  const {theme} = useThemeContext();
  const styles = getStyles(theme.roles, disabled ?? false);

  const containerStyle = [styles.base, styles[variant], style];
  const textStyle = [styles.text, styles[`${variant}Text` as const]];

  return (
    <TouchableOpacity
      {...rest}
      style={containerStyle}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}>
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

const getStyles = (roles: ThemeRoles, disabled: boolean) =>
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
      backgroundColor: roles.button.primary.background,
    },
    primaryText: {
      color: roles.button.primary.text,
    },
    secondary: {
      backgroundColor: roles.button.secondary.background,
      borderWidth: 1,
      borderColor: roles.button.secondary.border,
    },
    secondaryText: {
      color: roles.button.secondary.text,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    ghostText: {
      color: roles.button.ghost.text,
    },
  });

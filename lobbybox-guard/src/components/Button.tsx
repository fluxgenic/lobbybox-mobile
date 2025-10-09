import React from 'react';
import {ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, View, ViewStyle} from 'react-native';
import {useThemeContext} from '@/theme';
import type {ThemeRoles} from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type Props = TouchableOpacityProps & {
  title: string;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  loadingText?: string;
  loadingLabel?: string;
};

export const Button: React.FC<Props> = ({
  title,
  variant = 'primary',
  style,
  disabled,
  loading = false,
  loadingText,
  loadingLabel,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  ...rest
}) => {
  const {theme} = useThemeContext();
  const computedDisabled = (disabled ?? false) || loading;
  const styles = getStyles(theme.roles, computedDisabled);
  const textColor = getVariantTextColor(theme.roles, variant);
  const displayText = loading ? loadingText ?? title : title;
  const buttonLabel = loading ? loadingLabel ?? displayText : accessibilityLabel ?? title;

  const containerStyle = [styles.base, styles[variant], style];
  const textStyle = [styles.text, styles[`${variant}Text` as const]];

  return (
    <TouchableOpacity
      {...rest}
      style={containerStyle}
      disabled={computedDisabled}
      activeOpacity={0.7}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityLabel={buttonLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{disabled: computedDisabled, busy: loading}}>
      {loading ? (
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={textColor} accessibilityLabel={loadingLabel ?? 'Loading'} style={styles.loader} />
          {displayText ? <Text style={textStyle}>{displayText}</Text> : null}
        </View>
      ) : (
        <Text style={textStyle}>{displayText}</Text>
      )}
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
    loadingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loader: {
      marginRight: 8,
    },
  });

const getVariantTextColor = (roles: ThemeRoles, variant: ButtonVariant): string => {
  switch (variant) {
    case 'secondary':
      return roles.button.secondary.text;
    case 'ghost':
      return roles.button.ghost.text;
    case 'primary':
    default:
      return roles.button.primary.text;
  }
};

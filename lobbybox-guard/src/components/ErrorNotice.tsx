import React, {useMemo, useState} from 'react';
import {StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle} from 'react-native';
import {useThemeContext} from '@/theme';
import {Button} from './Button';
import {ParsedApiError, getDisplayMessage} from '@/utils/error';

type Props = {
  error: ParsedApiError;
  onRetry?: () => void;
  onBackToHome?: () => void;
  variant?: 'banner' | 'inline';
  style?: StyleProp<ViewStyle>;
};

export const ErrorNotice: React.FC<Props> = ({
  error,
  onRetry,
  onBackToHome,
  variant = 'banner',
  style,
}) => {
  const {theme} = useThemeContext();
  const [showDetails, setShowDetails] = useState(false);

  const isForbidden = error.status === 403;

  const styles = useMemo(() => getStyles(theme.colors, variant), [theme.colors, variant]);

  const message = getDisplayMessage(error);

  const canShowButtons = Boolean((onRetry && !isForbidden) || (isForbidden && onBackToHome));

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <View style={styles.headerRow}>
        <Text style={styles.message}>{message}</Text>
        {error.requestId ? (
          <TouchableOpacity
            onPress={() => setShowDetails(prev => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showDetails ? 'Hide error details' : 'Show error details'}
            accessibilityHint="Shows the request identifier for support">
            <Text style={styles.detailsToggle}>{showDetails ? 'Hide details' : 'Details'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {showDetails && error.requestId ? (
        <Text style={styles.detailsText}>Request ID: {error.requestId}</Text>
      ) : null}
      {canShowButtons ? (
        <View style={styles.actionsRow}>
          {isForbidden && onBackToHome ? (
            <Button title="Back to Home" onPress={onBackToHome} variant="secondary" style={styles.actionButton} />
          ) : null}
          {!isForbidden && onRetry ? (
            <Button
              title="Retry"
              onPress={onRetry}
              variant="secondary"
              style={[styles.actionButton, isForbidden && onBackToHome ? styles.actionSpacing : null]}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

type ThemeColors = ReturnType<typeof useThemeContext>['theme']['colors'];

const getStyles = (colors: ThemeColors, variant: 'banner' | 'inline') =>
  StyleSheet.create({
    container: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: variant === 'banner' ? colors.card : colors.surface,
      padding: variant === 'banner' ? 16 : 12,
      marginTop: variant === 'banner' ? 0 : 8,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    message: {
      flex: 1,
      marginRight: 12,
      color: colors.notification,
      fontSize: variant === 'banner' ? 15 : 14,
      fontWeight: '600',
    },
    detailsToggle: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    detailsText: {
      marginTop: 8,
      color: colors.muted,
      fontSize: 13,
    },
    actionsRow: {
      flexDirection: 'row',
      marginTop: 12,
    },
    actionButton: {
      flex: 1,
    },
    actionSpacing: {
      marginLeft: 12,
    },
  });

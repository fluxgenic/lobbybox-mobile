import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useThemeContext} from '@/theme';

export const OfflineBanner: React.FC<{message?: string}> = ({
  message = 'You are offline. Showing the most recent data.',
}) => {
  const {theme} = useThemeContext();

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: theme.palette.error.main + '20', borderColor: theme.palette.error.main},
      ]}
      accessibilityRole="alert"
      accessibilityLabel="Offline mode active">
      <Text style={[styles.title, {color: theme.palette.error.main}]}>Offline</Text>
      <Text style={[styles.message, {color: theme.roles.text.primary}]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
});

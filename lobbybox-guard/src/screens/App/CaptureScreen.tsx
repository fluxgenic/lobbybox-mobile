import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';

export const CaptureScreen: React.FC = () => {
  const {theme} = useThemeContext();

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={[styles.title, {color: theme.roles.text.primary}]}>Capture</Text>
        <Text style={[styles.subtitle, {color: theme.roles.text.secondary}]}>Scan parcels to log them here.</Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ScreenContainer} from '@/components/ScreenContainer';
import {useThemeContext} from '@/theme';

export const CaptureScreen: React.FC = () => {
  const {theme} = useThemeContext();

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <Text style={[styles.title, {color: theme.colors.text}]}>Capture</Text>
        <Text style={[styles.subtitle, {color: theme.colors.muted}]}>Start a new report.</Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
  },
});
